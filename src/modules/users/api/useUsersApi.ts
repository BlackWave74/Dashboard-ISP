import { useCallback, useEffect, useState } from "react";
import { supabaseRest } from "./supabaseRest";
import type { UserRow, ProjectRow, AuditRow, ClienteRow } from "../types";
import { PERFIL_TO_ROLE, ROLE_TO_PERFIL, type Perfil } from "../types";

export function useUsersApi(token: string | undefined) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [clientes, setClientes] = useState<ClienteRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await supabaseRest(
        "users?select=id,auth_user_id,email,name,user_profile,active,cliente_id&order=name.asc&limit=200",
        token,
      );
      const data = await res.json();
      if (Array.isArray(data)) {
        // Also fetch roles for each user
        const rolesRes = await supabaseRest("user_roles?select=user_id,role", token);
        const roles = await rolesRes.json();
        const roleMap = new Map<string, string>();
        if (Array.isArray(roles)) {
          roles.forEach((r: { user_id: string; role: string }) => roleMap.set(r.user_id, r.role));
        }

        setUsers(data.map((u: Record<string, unknown>) => {
          const authUid = String(u.auth_user_id ?? "");
          const dbRole = roleMap.get(authUid);
          return {
            id: String(u.id ?? ""),
            auth_user_id: authUid,
            email: String(u.email ?? ""),
            name: String(u.name ?? ""),
            user_profile: dbRole ? (ROLE_TO_PERFIL[dbRole] ?? String(u.user_profile ?? "Consultor")) : String(u.user_profile ?? "Consultor"),
            active: u.active !== false,
            role: dbRole,
            cliente_id: u.cliente_id != null ? Number(u.cliente_id) : null,
          };
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar usuários.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadProjects = useCallback(async () => {
    if (!token) return;
    try {
      const res = await supabaseRest("projects?select=id,name,active&order=name.asc&limit=500", token);
      const data = await res.json();
      if (Array.isArray(data)) {
        setProjects(data.map((p: Record<string, unknown>) => ({
          id: Number(p.id),
          name: String(p.name ?? ""),
          active: p.active !== false,
        })));
      }
    } catch {
      // non-critical
    }
  }, [token]);

  const loadClientes = useCallback(async () => {
    if (!token) return;
    try {
      const res = await supabaseRest('clientes?select=cliente_id,nome,"Ativo"&order=nome.asc&limit=500', token);
      const data = await res.json();
      if (Array.isArray(data)) {
        setClientes(data.map((c: Record<string, unknown>) => ({
          cliente_id: Number(c.cliente_id),
          nome: String(c.nome ?? ""),
          Ativo: c.Ativo !== false,
        })));
      }
    } catch {
      // non-critical
    }
  }, [token]);

  const saveUser = useCallback(async (
    userId: string,
    authUserId: string,
    payload: Partial<UserRow>,
    selectedAreas: string[],
    selectedProjects: number[],
    performedBy: string,
  ) => {
    if (!token) throw new Error("Sem token");

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const res = await fetch(`${supabaseUrl}/functions/v1/manage-user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: supabaseKey,
      },
      body: JSON.stringify({
        action: "update",
        userId,
        authUserId: authUserId,
        payload: {
          name: payload.name,
          email: payload.email,
          user_profile: payload.user_profile,
          active: payload.active,
          cliente_id: payload.cliente_id,
        },
        areas: selectedAreas,
        projects: selectedProjects,
      }),
    });

    const data = await res.json();
    if (!res.ok || data.ok === false) {
      throw new Error(data.error || `Erro ${res.status}`);
    }
  }, [token]);

  const deleteUser = useCallback(async (userId: string, authUserId: string, performedBy: string) => {
    if (!token) throw new Error("Sem token");
    await supabaseRest(`users?id=eq.${userId}`, token, { method: "DELETE" });
    // Cleanup
    if (authUserId) {
      try {
        await supabaseRest(`user_roles?user_id=eq.${authUserId}`, token, { method: "DELETE" });
        await supabaseRest(`user_allowed_areas?user_id=eq.${authUserId}`, token, { method: "DELETE" });
        await supabaseRest(`user_project_access?user_id=eq.${authUserId}`, token, { method: "DELETE" });
      } catch { /* cleanup */ }
    }
    // Audit
    try {
      await supabaseRest("audit_log", token, {
        method: "POST",
        body: JSON.stringify({
          performed_by: performedBy,
          target_user_id: authUserId || null,
          action: "delete_user",
          details: { user_id: userId },
        }),
      });
    } catch { /* non-critical */ }
  }, [token]);

  const getUserAreas = useCallback(async (authUserId: string): Promise<string[]> => {
    if (!token || !authUserId) return [];
    try {
      const res = await supabaseRest(`user_allowed_areas?user_id=eq.${authUserId}&select=area_name`, token);
      const data = await res.json();
      return Array.isArray(data) ? data.map((r: { area_name: string }) => r.area_name) : [];
    } catch { return []; }
  }, [token]);

  const getUserProjects = useCallback(async (authUserId: string): Promise<number[]> => {
    if (!token || !authUserId) return [];
    try {
      const res = await supabaseRest(`user_project_access?user_id=eq.${authUserId}&select=project_id`, token);
      const data = await res.json();
      return Array.isArray(data) ? data.map((r: { project_id: number }) => r.project_id) : [];
    } catch { return []; }
  }, [token]);

  const getAuditLog = useCallback(async (): Promise<AuditRow[]> => {
    if (!token) return [];
    try {
      const res = await supabaseRest("audit_log?select=*&order=created_at.desc&limit=100", token);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  }, [token]);

  useEffect(() => {
    if (token) {
      // Parallel load for better performance
      Promise.all([loadUsers(), loadProjects(), loadClientes()]);
    }
  }, [token, loadUsers, loadProjects, loadClientes]);

  return {
    users, projects, clientes, loading, error,
    loadUsers, loadProjects, loadClientes,
    saveUser, deleteUser,
    getUserAreas, getUserProjects, getAuditLog,
  };
}
