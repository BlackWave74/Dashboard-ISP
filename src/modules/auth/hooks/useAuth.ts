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

/** Fetch role from user_roles table (uses the external Supabase) */
const fetchUserRole = async (
  accessToken: string,
  authUserId: string
): Promise<UserRole> => {
  const base = SUPABASE_URL.replace(/\/$/, "");
  try {
    const res = await fetch(
      `${base}/rest/v1/user_roles?user_id=eq.${authUserId}&select=role&limit=1`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    if (!res.ok) return "consultor";
    const rows = await res.json();
    if (Array.isArray(rows) && rows.length > 0) {
      return normalizeRole(rows[0].role);
    }
  } catch {
    // fallback
  }
  return "consultor";
};

export function useAuth() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const loginAttemptRef = useRef(0);
  const loginSpamCountRef = useRef(0);
  const loginBlockedUntilRef = useRef(0);

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
        const allowedAreas = Array.isArray(metaObj?.["allowed_areas"])
          ? (metaObj?.["allowed_areas"] as AccessArea[])
          : null;
        const expiresIn = Number(data?.expires_in ?? 0);
        const expiresAt = Date.now() + expiresIn * 1000 - 60_000;

        // Fetch role from user_roles table
        const role = await fetchUserRole(data?.access_token, user?.id);

        const refreshed: AuthSession = {
          name: metadata.name || user?.email || stored.name,
          email: user?.email ?? stored.email,
          role,
          company: clientName ?? stored.company ?? null,
          allowedAreas: allowedAreas ?? stored.allowedAreas ?? null,
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
      if (now < loginBlockedUntilRef.current) {
        const seconds = Math.ceil((loginBlockedUntilRef.current - now) / 1000);
        return { success: false, message: `Opa, calma ai. Aguarde ${seconds}s.` };
      }
      if (now - loginAttemptRef.current < 1500) {
        loginSpamCountRef.current += 1;
        if (loginSpamCountRef.current >= 3) {
          loginBlockedUntilRef.current = now + 15000;
          loginSpamCountRef.current = 0;
          return { success: false, message: "Opa, calma ai. Você está clicando demais." };
        }
        return { success: false, message: "Opa, calma ai. Aguarde um instante." };
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
          const msg = data?.msg || data?.error_description || data?.error || "Credenciais inválidas.";
          return { success: false, message: msg };
        }

        const user = data?.user;
        const metadata = user?.user_metadata ?? {};
        const metaObj = metadata as Record<string, unknown>;
        const clientName = metaObj?.["client_name"] as string | undefined;
        const allowedAreas = Array.isArray(metaObj?.["allowed_areas"])
          ? (metaObj?.["allowed_areas"] as AccessArea[])
          : null;
        const expiresIn = Number(data?.expires_in ?? 0);
        const expiresAt = Date.now() + expiresIn * 1000 - 60_000;

        // Fetch role from user_roles table
        const role = await fetchUserRole(data?.access_token, user?.id);

        const authSession: AuthSession = {
          name: metadata.name || user?.email || "Usuário",
          email: user?.email ?? email,
          role,
          company: clientName ?? null,
          allowedAreas: allowedAreas ?? null,
          accessToken: data?.access_token,
          refreshToken: data?.refresh_token,
          expiresAt,
        };
        setSession(authSession);
        persistSession(authSession);
        loginSpamCountRef.current = 0;
        loginBlockedUntilRef.current = 0;
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
      if (allowed && !allowed.includes(area)) return false;
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
