import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase";
import type { UserRole, AccessArea } from "../hooks/useAuth";

const normalizeRole = (value?: string): UserRole => {
  const role = (value ?? "").toLowerCase();
  if (role === "admin" || role === "administrador") return "admin";
  if (role === "gerente") return "gerente";
  if (role === "coordenador") return "coordenador";
  if (role === "cliente") return "cliente";
  return "consultor";
};

const base = () => SUPABASE_URL.replace(/\/$/, "");

const headers = (token: string) => ({
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${token}`,
});

/** Fetch role: user_roles → users.user_profile → JWT metadata fallback */
export const fetchUserRole = async (
  accessToken: string,
  authUserId: string,
  jwtMetadata?: Record<string, unknown>
): Promise<UserRole> => {
  // 1. Try user_roles table
  try {
    const res = await fetch(
      `${base()}/rest/v1/user_roles?user_id=eq.${authUserId}&select=role&limit=1`,
      { headers: headers(accessToken) }
    );
    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0) {
        return normalizeRole(rows[0].role);
      }
    }
  } catch { /* fallback */ }

  // 2. Fallback: users.user_profile
  try {
    const res2 = await fetch(
      `${base()}/rest/v1/users?auth_user_id=eq.${authUserId}&select=user_profile&limit=1`,
      { headers: headers(accessToken) }
    );
    if (res2.ok) {
      const rows2 = await res2.json();
      if (Array.isArray(rows2) && rows2.length > 0) {
        return normalizeRole(rows2[0].user_profile);
      }
    }
  } catch { /* fallback */ }

  // 3. Fallback: JWT user_metadata
  if (jwtMetadata?.user_profile) {
    return normalizeRole(jwtMetadata.user_profile as string);
  }

  return "consultor";
};

/** Fetch allowed areas from user_allowed_areas table */
export const fetchAllowedAreas = async (
  accessToken: string,
  authUserId: string
): Promise<AccessArea[] | null> => {
  try {
    const res = await fetch(
      `${base()}/rest/v1/user_allowed_areas?user_id=eq.${authUserId}&select=area_name`,
      { headers: headers(accessToken) }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    if (Array.isArray(rows) && rows.length > 0) {
      return rows.map((r: { area_name: string }) => r.area_name as AccessArea);
    }
  } catch { /* fallback */ }
  return null;
};

/** Fetch accessible project IDs from user_project_access table */
export const fetchAccessibleProjects = async (
  accessToken: string,
  authUserId: string
): Promise<number[] | null> => {
  try {
    const res = await fetch(
      `${base()}/rest/v1/user_project_access?user_id=eq.${authUserId}&select=project_id`,
      { headers: headers(accessToken) }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    if (Array.isArray(rows) && rows.length > 0) {
      return rows.map((r: { project_id: number }) => r.project_id);
    }
  } catch { /* fallback */ }
  return null;
};

/** Fetch cliente_id and client name from users + clientes tables */
export const fetchClienteInfo = async (
  accessToken: string,
  authUserId: string
): Promise<{ clienteId: number | null; clienteName: string | null }> => {
  try {
    const res = await fetch(
      `${base()}/rest/v1/users?auth_user_id=eq.${authUserId}&select=cliente_id&limit=1`,
      { headers: headers(accessToken) }
    );
    if (!res.ok) return { clienteId: null, clienteName: null };
    const rows = await res.json();
    const clienteId = rows?.[0]?.cliente_id ?? null;
    if (!clienteId) return { clienteId: null, clienteName: null };

    const res2 = await fetch(
      `${base()}/rest/v1/clientes?cliente_id=eq.${clienteId}&select=nome&limit=1`,
      { headers: headers(accessToken) }
    );
    if (!res2.ok) return { clienteId, clienteName: null };
    const rows2 = await res2.json();
    return { clienteId, clienteName: rows2?.[0]?.nome ?? null };
  } catch {
    return { clienteId: null, clienteName: null };
  }
};
