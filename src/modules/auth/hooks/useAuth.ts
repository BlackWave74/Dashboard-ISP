import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { storage } from "@/modules/shared/storage";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase";

export type UserRole = "admin" | "consultor" | "gerente" | "coordenador" | "cliente";
export type AccessArea = "home" | "comodato" | "integracoes" | "tarefas" | "usuarios" | "analiticas";

export type AuthSession = {
  name: string;
  email: string;
  role: UserRole;
  company?: string | null;
  allowedAreas?: AccessArea[] | null;
  accessibleProjectIds?: number[] | null;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
};

type AuthPayload = {
  name?: string;
  email: string;
  password: string;
  role?: UserRole;
  adminCode?: string;
  company?: string;
};

type AuthResult = {
  success: boolean;
  message?: string;
};

export const ACCESS_RULES: Record<UserRole, Record<AccessArea, boolean>> = {
  admin: { home: true, comodato: true, integracoes: true, tarefas: true, usuarios: true, analiticas: true },
  gerente: { home: true, comodato: true, integracoes: true, tarefas: true, usuarios: true, analiticas: true },
  coordenador: { home: true, comodato: true, integracoes: true, tarefas: true, usuarios: true, analiticas: true },
  consultor: { home: true, comodato: false, integracoes: false, tarefas: true, usuarios: false, analiticas: false },
  cliente: { home: true, comodato: false, integracoes: false, tarefas: true, usuarios: false, analiticas: false },
};

const SESSION_KEY = "auth_session";

const normalizeRole = (value?: string): UserRole => {
  const role = (value ?? "").toLowerCase();
  if (role === "admin" || role === "administrador") return "admin";
  if (role === "gerente") return "gerente";
  if (role === "coordenador") return "coordenador";
  if (role === "cliente") return "cliente";
  return "consultor";
};

/** Fetch role: user_roles → users.user_profile → JWT metadata fallback */
const fetchUserRole = async (
  accessToken: string,
  authUserId: string,
  jwtMetadata?: Record<string, unknown>
): Promise<UserRole> => {
  const base = SUPABASE_URL.replace(/\/$/, "");

  // 1. Try user_roles table
  try {
    const res = await fetch(
      `${base}/rest/v1/user_roles?user_id=eq.${authUserId}&select=role&limit=1`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken}` } }
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
      `${base}/rest/v1/users?auth_user_id=eq.${authUserId}&select=user_profile&limit=1`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken}` } }
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
const fetchAllowedAreas = async (
  accessToken: string,
  authUserId: string
): Promise<AccessArea[] | null> => {
  const base = SUPABASE_URL.replace(/\/$/, "");
  try {
    const res = await fetch(
      `${base}/rest/v1/user_allowed_areas?user_id=eq.${authUserId}&select=area_name`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    if (Array.isArray(rows) && rows.length > 0) {
      return rows.map((r: { area_name: string }) => r.area_name as AccessArea);
    }
  } catch {
    // fallback
  }
  return null;
};

/** Fetch accessible project IDs from user_project_access table */
const fetchAccessibleProjects = async (
  accessToken: string,
  authUserId: string
): Promise<number[] | null> => {
  const base = SUPABASE_URL.replace(/\/$/, "");
  try {
    const res = await fetch(
      `${base}/rest/v1/user_project_access?user_id=eq.${authUserId}&select=project_id`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    if (Array.isArray(rows) && rows.length > 0) {
      return rows.map((r: { project_id: number }) => r.project_id);
    }
  } catch {
    // fallback
  }
  return null;
};

export function useAuth() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const loginAttemptRef = useRef(0);
  const loginSpamCountRef = useRef(0);
  const loginBlockedUntilRef = useRef(0);
  const failedAttemptsRef = useRef(0);
  const failedBlockedUntilRef = useRef(0);

  const persistSession = useCallback((data: AuthSession | null) => {
    if (data) storage.set(SESSION_KEY, data);
    else storage.remove(SESSION_KEY);
  }, []);

  const refreshSession = useCallback(
    async (stored: AuthSession): Promise<AuthSession | null> => {
      const supabaseUrl = SUPABASE_URL;
      const anon = SUPABASE_ANON_KEY;
      if (!supabaseUrl || !anon || !stored.refreshToken) return null;
      try {
        const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
          method: "POST",
          headers: {
            apikey: anon,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refresh_token: stored.refreshToken }),
        });
        const data = await response.json();
        if (!response.ok) return null;
        const user = data?.user;
        const metadata = user?.user_metadata ?? {};
        const metaObj = metadata as Record<string, unknown>;
        const clientName = metaObj?.["client_name"] as string | undefined;
        const expiresIn = Number(data?.expires_in ?? 0);
        const expiresAt = Date.now() + expiresIn * 1000 - 60_000;

        // Fetch role and allowed areas from DB tables
        const refreshMeta = metadata as Record<string, unknown>;
        const [role, allowedAreas, accessibleProjectIds] = await Promise.all([
          fetchUserRole(data?.access_token, user?.id, refreshMeta),
          fetchAllowedAreas(data?.access_token, user?.id),
          fetchAccessibleProjects(data?.access_token, user?.id),
        ]);

        const refreshed: AuthSession = {
          name: metadata.name || user?.email || stored.name,
          email: user?.email ?? stored.email,
          role,
          company: clientName ?? stored.company ?? null,
          allowedAreas,
          accessibleProjectIds,
          accessToken: data?.access_token,
          refreshToken: data?.refresh_token ?? stored.refreshToken,
          expiresAt,
        };
        setSession(refreshed);
        persistSession(refreshed);
        return refreshed;
      } catch {
        return null;
      }
    },
    [persistSession]
  );

  useEffect(() => {
    const saved = storage.get<AuthSession | null>(SESSION_KEY, null);
    const load = async () => {
      if (saved?.accessToken) {
        const expired = saved.expiresAt ? saved.expiresAt < Date.now() : false;
        if (expired && saved.refreshToken) {
          const refreshed = await refreshSession(saved);
          if (refreshed) {
            setLoadingSession(false);
            return;
          }
        }
        setSession(saved);
      } else {
        storage.remove(SESSION_KEY);
        setSession(null);
      }
      setLoadingSession(false);
    };
    void load();
  }, [refreshSession]);

  const login = useCallback(
    async ({ email, password }: AuthPayload): Promise<AuthResult> => {
      const now = Date.now();

      // Check if blocked due to failed password attempts (3 failures = 60s block)
      if (now < failedBlockedUntilRef.current) {
        const seconds = Math.ceil((failedBlockedUntilRef.current - now) / 1000);
        return {
          success: false,
          message: `Conta bloqueada temporariamente após 3 tentativas incorretas. Aguarde ${seconds}s ou entre em contato com seu consultor para recuperar a senha.`,
        };
      }

      // Anti-spam: rapid clicking
      if (now < loginBlockedUntilRef.current) {
        const seconds = Math.ceil((loginBlockedUntilRef.current - now) / 1000);
        return { success: false, message: `Aguarde ${seconds}s antes de tentar novamente.` };
      }
      if (now - loginAttemptRef.current < 1500) {
        loginSpamCountRef.current += 1;
        if (loginSpamCountRef.current >= 3) {
          loginBlockedUntilRef.current = now + 15000;
          loginSpamCountRef.current = 0;
          return { success: false, message: "Você está clicando rápido demais. Aguarde um instante." };
        }
        return { success: false, message: "Aguarde um instante entre tentativas." };
      }
      loginAttemptRef.current = now;

      const supabaseUrl = SUPABASE_URL;
      const anon = SUPABASE_ANON_KEY;
      if (!supabaseUrl || !anon) {
        return {
          success: false,
          message: "Conexão com o servidor não configurada.",
        };
      }

      try {
        const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
          method: "POST",
          headers: {
            apikey: anon,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        });
        const data = await response.json();
        if (!response.ok) {
          // Track failed password attempts
          failedAttemptsRef.current += 1;
          if (failedAttemptsRef.current >= 3) {
            failedBlockedUntilRef.current = Date.now() + 60_000; // block 60s
            failedAttemptsRef.current = 0;
            return {
              success: false,
              message: "Conta bloqueada por 60 segundos após 3 tentativas incorretas. Entre em contato com seu consultor para recuperar a senha.",
            };
          }
          const remaining = 3 - failedAttemptsRef.current;
          const msg = data?.msg || data?.error_description || data?.error || "Credenciais inválidas.";
          return { success: false, message: `${msg} (${remaining} tentativa${remaining > 1 ? "s" : ""} restante${remaining > 1 ? "s" : ""})` };
        }

        const user = data?.user;
        const metadata = user?.user_metadata ?? {};
        const metaObj = metadata as Record<string, unknown>;
        const clientName = metaObj?.["client_name"] as string | undefined;
        const expiresIn = Number(data?.expires_in ?? 0);
        const expiresAt = Date.now() + expiresIn * 1000 - 60_000;

        // Fetch role, allowed areas, and accessible projects from DB tables
        const [role, allowedAreas, accessibleProjectIds] = await Promise.all([
          fetchUserRole(data?.access_token, user?.id, metaObj),
          fetchAllowedAreas(data?.access_token, user?.id),
          fetchAccessibleProjects(data?.access_token, user?.id),
        ]);

        const authSession: AuthSession = {
          name: metadata.name || user?.email || "Usuário",
          email: user?.email ?? email,
          role,
          company: clientName ?? null,
          allowedAreas,
          accessibleProjectIds,
          accessToken: data?.access_token,
          refreshToken: data?.refresh_token,
          expiresAt,
        };
        setSession(authSession);
        persistSession(authSession);
        loginSpamCountRef.current = 0;
        loginBlockedUntilRef.current = 0;
        failedAttemptsRef.current = 0;
        failedBlockedUntilRef.current = 0;
        return { success: true };
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Falha ao autenticar.";
        return { success: false, message: msg };
      }
    },
    [persistSession]
  );

  const register = useCallback(async (): Promise<AuthResult> => {
    return { success: false, message: "Cadastro desabilitado. Peça a um admin." };
  }, []);

  const logout = useCallback(() => {
    setSession(null);
    persistSession(null);
  }, [persistSession]);

  const canAccess = useCallback(
    (area: AccessArea, roleOverride?: UserRole) => {
      const role = roleOverride ?? session?.role ?? "consultor";
      const allowed = session?.allowedAreas;
      // If allowedAreas is defined, it overrides role-based rules entirely
      if (allowed && allowed.length > 0) {
        return allowed.includes(area);
      }
      // Fallback to role-based rules when no custom areas are set
      const rules = ACCESS_RULES[role] ?? ACCESS_RULES.consultor;
      return Boolean(rules[area]);
    },
    [session?.role, session?.allowedAreas]
  );

  return useMemo(
    () => ({
      session,
      loadingSession,
      isAuthenticated: Boolean(session),
      canAccess,
      login,
      register,
      logout,
    }),
    [session, loadingSession, canAccess, login, register, logout]
  );
}
