import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { storage } from "@/modules/shared/storage";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase";
import {
  fetchUserRole,
  fetchAllowedAreas,
  fetchAccessibleProjects,
  fetchClienteInfo,
} from "@/modules/auth/api/fetchAuthData";

export type UserRole = "admin" | "consultor" | "gerente" | "coordenador" | "cliente";
export type AccessArea = "home" | "comodato" | "integracoes" | "tarefas" | "usuarios" | "analiticas";

export type AuthSession = {
  name: string;
  email: string;
  role: UserRole;
  company?: string | null;
  clienteId?: number | null;
  allowedAreas?: AccessArea[] | null;
  accessibleProjectIds?: number[] | null;
  accessibleProjectNames?: string[] | null;
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

/** Build a full session from Supabase auth response data */
const buildSession = async (
  data: Record<string, any>,
  fallbackEmail: string,
  storedSession?: AuthSession | null
): Promise<AuthSession> => {
  const user = data?.user;
  const metadata = user?.user_metadata ?? {};
  const metaObj = metadata as Record<string, unknown>;
  const clientName = metaObj?.["client_name"] as string | undefined;
  const expiresIn = Number(data?.expires_in ?? 0);
  const expiresAt = Date.now() + expiresIn * 1000 - 60_000;

  const [role, allowedAreas, accessibleProjects, clienteInfo] = await Promise.all([
    fetchUserRole(data?.access_token, user?.id, metaObj),
    fetchAllowedAreas(data?.access_token, user?.id),
    fetchAccessibleProjects(data?.access_token, user?.id),
    fetchClienteInfo(data?.access_token, user?.id),
  ]);

  return {
    name: metadata.name || user?.email || storedSession?.name || "Usuário",
    email: user?.email ?? fallbackEmail,
    role,
    company: clienteInfo.clienteName ?? clientName ?? storedSession?.company ?? null,
    clienteId: clienteInfo.clienteId ?? storedSession?.clienteId ?? null,
    allowedAreas,
    accessibleProjectIds: accessibleProjects?.ids ?? null,
    accessibleProjectNames: accessibleProjects?.names ?? null,
    accessToken: data?.access_token,
    refreshToken: data?.refresh_token ?? storedSession?.refreshToken,
    expiresAt,
  };
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
    async (stored: AuthSession, attempt = 0): Promise<AuthSession | null> => {
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !stored.refreshToken) return null;
      try {
        const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
          method: "POST",
          headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: stored.refreshToken }),
        });
        const data = await response.json();
        if (!response.ok) return null;

        // IMPORTANT: Always rebuild full session from DB (including project names)
        // so that admin changes to project access take effect on next token refresh.
        const refreshed = await buildSession(data, stored.email, stored);
        setSession(refreshed);
        persistSession(refreshed);
        return refreshed;
      } catch (err) {
        if (attempt < 1) {
          await new Promise((r) => setTimeout(r, 2000));
          return refreshSession(stored, attempt + 1);
        }
        console.warn("[auth] Token refresh failed after retry", err);
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
          // Token expired: full refresh rebuilds everything including project names
          const refreshed = await refreshSession(saved);
          if (refreshed) { setLoadingSession(false); return; }
        }

        // Token still valid: re-fetch project access from DB in background
        // so that admin changes (e.g. adding/removing projects) take effect
        // without requiring a full logout/login cycle.
        setSession(saved);
        setLoadingSession(false);

        if (saved.accessToken && saved.email) {
          try {
            // Get user ID from the current token
            const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
              headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${saved.accessToken}` },
            });
            if (userRes.ok) {
              const userData = await userRes.json();
              const userId = userData?.id;
              if (userId) {
                const [accessibleProjects, clienteInfo] = await Promise.all([
                  fetchAccessibleProjects(saved.accessToken, userId),
                  fetchClienteInfo(saved.accessToken, userId),
                ]);
                const updated: AuthSession = {
                  ...saved,
                  accessibleProjectIds: accessibleProjects?.ids ?? null,
                  accessibleProjectNames: accessibleProjects?.names ?? null,
                  company: clienteInfo.clienteName ?? saved.company ?? null,
                  clienteId: clienteInfo.clienteId ?? saved.clienteId ?? null,
                };
                setSession(updated);
                persistSession(updated);
              }
            }
          } catch {
            // Background refresh failed silently — cached session is still used
          }
        }
        return;
      } else {
        storage.remove(SESSION_KEY);
        setSession(null);
      }
      setLoadingSession(false);
    };
    void load();
  }, [refreshSession, persistSession]);

  const login = useCallback(
    async ({ email, password }: AuthPayload): Promise<AuthResult> => {
      const now = Date.now();

      if (now < failedBlockedUntilRef.current) {
        const seconds = Math.ceil((failedBlockedUntilRef.current - now) / 1000);
        return { success: false, message: `Conta bloqueada temporariamente após 3 tentativas incorretas. Aguarde ${seconds}s ou entre em contato com seu consultor para recuperar a senha.` };
      }
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

      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        return { success: false, message: "Conexão com o servidor não configurada." };
      }

      try {
        const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
          method: "POST",
          headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await response.json();
        if (!response.ok) {
          failedAttemptsRef.current += 1;
          if (failedAttemptsRef.current >= 3) {
            failedBlockedUntilRef.current = Date.now() + 60_000;
            failedAttemptsRef.current = 0;
            return { success: false, message: "Conta bloqueada por 60 segundos após 3 tentativas incorretas. Entre em contato com seu consultor para recuperar a senha." };
          }
          const remaining = 3 - failedAttemptsRef.current;
          const msg = data?.msg || data?.error_description || data?.error || "Credenciais inválidas.";
          return { success: false, message: `${msg} (${remaining} tentativa${remaining > 1 ? "s" : ""} restante${remaining > 1 ? "s" : ""})` };
        }

        const authSession = await buildSession(data, email);
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

  const logout = useCallback(async () => {
    if (session?.accessToken) {
      try {
        const base = SUPABASE_URL.replace(/\/$/, "");
        await fetch(`${base}/auth/v1/logout`, {
          method: "POST",
          headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${session.accessToken}`, "Content-Type": "application/json" },
        });
      } catch { /* best-effort */ }
    }
    setSession(null);
    persistSession(null);
  }, [session?.accessToken, persistSession]);

  const canAccess = useCallback(
    (area: AccessArea, roleOverride?: UserRole) => {
      const role = roleOverride ?? session?.role ?? "consultor";
      const allowed = session?.allowedAreas;
      if (allowed && allowed.length > 0) return allowed.includes(area);
      const rules = ACCESS_RULES[role] ?? ACCESS_RULES.consultor;
      return Boolean(rules[area]);
    },
    [session?.role, session?.allowedAreas]
  );

  return useMemo(
    () => ({ session, loadingSession, isAuthenticated: Boolean(session), canAccess, login, register, logout }),
    [session, loadingSession, canAccess, login, register, logout]
  );
}
