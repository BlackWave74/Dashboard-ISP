import { useCallback, useEffect, useState } from "react";
import { supabaseRest, safeJson } from "./supabaseRest";
import { callManageUser } from "./manageUserApi";
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
      // Use edge function with service_role to bypass RLS and list ALL users
      const result = await callManageUser(token, { action: "list" });
      const data = result.data;
      if (Array.isArray(data)) {
        setUsers(data.map((u: Record<string, unknown>) => ({
          id: String(u.id ?? ""),
          auth_user_id: String(u.auth_user_id ?? ""),
          email: String(u.email ?? ""),
          name: String(u.name ?? ""),
          user_profile: String(u.user_profile ?? "Consultor"),
          active: u.active !== false,
          role: u.role ? String(u.role) : undefined,
          cliente_id: null,
        })));
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
      const data = await safeJson(res);
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
      const data = await safeJson(res);
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

    // Use edge function with service_role to bypass RESTRICTIVE RLS
    await callManageUser(token, {
      action: "update",
      userId,
      authUserId,
      payload: {
        name: payload.name,
        email: payload.email,
        user_profile: payload.user_profile,
        active: payload.active,
      },
      areas: selectedAreas,
      projects: selectedProjects,
    });
  }, [token]);

  const deleteUser = useCallback(async (userId: string, authUserId: string, performedBy: string) => {
    if (!token) throw new Error("Sem token");
    await callManageUser(token, { action: "delete", authUserId });
  }, [token]);

  const getUserAreas = useCallback(async (authUserId: string): Promise<string[]> => {
    if (!token || !authUserId) return [];
    try {
      const res = await supabaseRest(`user_allowed_areas?user_id=eq.${authUserId}&select=area_name`, token);
      const data = await safeJson(res);
      return Array.isArray(data) ? data.map((r: { area_name: string }) => r.area_name) : [];
    } catch { return []; }
  }, [token]);

  const getUserProjects = useCallback(async (authUserId: string): Promise<number[]> => {
    if (!token || !authUserId) return [];
    try {
      const res = await supabaseRest(`user_project_access?user_id=eq.${authUserId}&select=project_id`, token);
      const data = await safeJson(res);
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