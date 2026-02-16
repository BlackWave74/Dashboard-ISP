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

    // 1. Update users table
    const userPayload: Record<string, unknown> = {};
    if (payload.name !== undefined) userPayload.name = payload.name;
    if (payload.email !== undefined) userPayload.email = payload.email;
    if (payload.user_profile !== undefined) userPayload.user_profile = payload.user_profile;
    if (payload.active !== undefined) userPayload.active = payload.active;
    if (payload.cliente_id !== undefined) userPayload.cliente_id = payload.cliente_id;

    await supabaseRest(`users?id=eq.${userId}`, token, {
      method: "PATCH",
      body: JSON.stringify(userPayload),
    });

    // 2. Sync role
    if (payload.user_profile && authUserId) {
      const appRole = PERFIL_TO_ROLE[payload.user_profile as Perfil] ?? "consultor";
      try {
        await supabaseRest(`user_roles?user_id=eq.${authUserId}`, token, { method: "DELETE" });
        await supabaseRest("user_roles", token, {
          method: "POST",
          body: JSON.stringify({ user_id: authUserId, role: appRole }),
        });
      } catch { /* non-critical */ }
    }

    // 3. Sync allowed areas
    if (authUserId) {
      try {
        await supabaseRest(`user_allowed_areas?user_id=eq.${authUserId}`, token, { method: "DELETE" });
        if (selectedAreas.length > 0) {
          const areaRows = selectedAreas.map(a => ({ user_id: authUserId, area_name: a }));
          await supabaseRest("user_allowed_areas", token, {
            method: "POST",
            body: JSON.stringify(areaRows),
          });
        }
      } catch { /* non-critical */ }
    }

    // 4. Sync project access
    if (authUserId) {
      try {
        await supabaseRest(`user_project_access?user_id=eq.${authUserId}`, token, { method: "DELETE" });
        if (selectedProjects.length > 0) {
          const projRows = selectedProjects.map(pid => ({ user_id: authUserId, project_id: pid }));
          await supabaseRest("user_project_access", token, {
            method: "POST",
            body: JSON.stringify(projRows),
          });
        }
      } catch { /* non-critical */ }
    }

    // 5. Audit log
    try {
      await supabaseRest("audit_log", token, {
        method: "POST",
        body: JSON.stringify({
          performed_by: performedBy,
          target_user_id: authUserId || null,
          action: "update_user",
          details: { user_id: userId, changes: userPayload, areas: selectedAreas, projects: selectedProjects },
        }),
      });
    } catch { /* non-critical */ }
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
