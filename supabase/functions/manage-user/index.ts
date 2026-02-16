import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// External Supabase (ISP Consulte) — public keys are safe
const EXT_URL = "https://stubkeeuttixteqckshd.supabase.co";
const EXT_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0dWJrZWV1dHRpeHRlcWNrc2hkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NjQ0OTIsImV4cCI6MjA3MzA0MDQ5Mn0.YcpSKrTSb1P1REC8lgkdduDITX52h_z7ArPD6XIkrlU";

function jsonRes(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errRes(message: string, status = 400) {
  return jsonRes({ ok: false, error: message }, status);
}

/** Translate common Supabase Auth errors to Portuguese */
function translateError(msg: string): string {
  const map: Record<string, string> = {
    "A user with this email address has already been registered": "Já existe um usuário com este e-mail.",
    "User not found": "Usuário não encontrado.",
    "Invalid login credentials": "Credenciais inválidas.",
    "Email not confirmed": "E-mail não confirmado.",
    "Password should be at least 6 characters": "A senha deve ter pelo menos 6 caracteres.",
    "Unable to validate email address: invalid format": "Formato de e-mail inválido.",
    "Signup requires a valid password": "É necessário uma senha válida.",
    "User already registered": "Usuário já registrado.",
    "Database error deleting user": "Erro ao excluir usuário do banco de dados.",
    "Database error saving new user": "Erro ao salvar novo usuário no banco de dados.",
  };
  for (const [en, pt] of Object.entries(map)) {
    if (msg.toLowerCase().includes(en.toLowerCase())) return pt;
  }
  return msg;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errRes("Não autorizado.", 401);
    }

    const extServiceRoleKey = Deno.env.get("EXT_SUPABASE_SERVICE_ROLE_KEY");
    if (!extServiceRoleKey) {
      return errRes("Configuração do servidor incompleta.", 500);
    }

    // Verify caller against EXTERNAL Supabase
    const callerClient = createClient(EXT_URL, EXT_ANON, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await callerClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return errRes("Token inválido.", 401);
    }

    const callerUid = userData.user.id;

    // Admin client with SERVICE ROLE on EXTERNAL DB — bypasses RLS
    const adminClient = createClient(EXT_URL, extServiceRoleKey);

    // Check admin: first user_roles, then fallback to users.user_profile
    const { data: roleRows } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUid)
      .limit(1);

    let callerRole = roleRows?.[0]?.role ?? null;

    // Fallback: check users.user_profile if no role found
    if (!callerRole) {
      const { data: userRows } = await adminClient
        .from("users")
        .select("user_profile")
        .eq("auth_user_id", callerUid)
        .limit(1);
      const profile = userRows?.[0]?.user_profile;
      const profileToRole: Record<string, string> = {
        Administrador: "admin", Gerente: "gerente", Coordenador: "coordenador",
        Consultor: "consultor", Cliente: "cliente",
      };
      callerRole = profile ? (profileToRole[profile] ?? "consultor") : null;
    }

    const managerRoles = ["admin", "gerente", "coordenador"];
    if (!callerRole || !managerRoles.includes(callerRole)) {
      return errRes("Apenas administradores podem gerenciar usuários.", 403);
    }

    const body = await req.json();
    const { action } = body;

    /* ═══════════════════════════════════════════ */
    /* ─── LIST ─── */
    /* ═══════════════════════════════════════════ */
    if (action === "list") {
      // Fetch all users via service_role (bypasses RLS)
      const { data: allUsers, error: listErr } = await adminClient
        .from("users")
        .select("id,auth_user_id,email,name,user_profile,active")
        .order("name", { ascending: true })
        .limit(500);

      console.log("[manage-user] list: allUsers count =", allUsers?.length ?? 0, "listErr =", listErr?.message ?? "none");

      if (listErr) {
        return errRes(`Falha ao listar usuários: ${listErr.message}`);
      }

      // Fetch all roles
      const { data: allRoles } = await adminClient
        .from("user_roles")
        .select("user_id,role")
        .limit(1000);

      const roleMap = new Map<string, string>();
      if (Array.isArray(allRoles)) {
        allRoles.forEach((r: { user_id: string; role: string }) => roleMap.set(r.user_id, r.role));
      }

      // Fetch all areas
      const { data: allAreas } = await adminClient
        .from("user_allowed_areas")
        .select("user_id,area_name")
        .limit(5000);

      const areaMap = new Map<string, string[]>();
      if (Array.isArray(allAreas)) {
        allAreas.forEach((a: { user_id: string; area_name: string }) => {
          const existing = areaMap.get(a.user_id) || [];
          existing.push(a.area_name);
          areaMap.set(a.user_id, existing);
        });
      }

      // Fetch all project access
      const { data: allAccess } = await adminClient
        .from("user_project_access")
        .select("user_id,project_id")
        .limit(5000);

      const projectMap = new Map<string, number[]>();
      if (Array.isArray(allAccess)) {
        allAccess.forEach((p: { user_id: string; project_id: number }) => {
          const existing = projectMap.get(p.user_id) || [];
          existing.push(p.project_id);
          projectMap.set(p.user_id, existing);
        });
      }

      const ROLE_TO_PERFIL: Record<string, string> = {
        admin: "Administrador",
        consultor: "Consultor",
        gerente: "Gerente",
        coordenador: "Coordenador",
        cliente: "Cliente",
      };

      const users = (allUsers || []).map((u: Record<string, unknown>) => {
        const authUid = String(u.auth_user_id ?? "");
        const dbRole = roleMap.get(authUid);
        return {
          id: String(u.id ?? ""),
          auth_user_id: authUid,
          email: String(u.email ?? ""),
          name: String(u.name ?? ""),
          user_profile: dbRole ? (ROLE_TO_PERFIL[dbRole] ?? String(u.user_profile ?? "Consultor")) : String(u.user_profile ?? "Consultor"),
          active: u.active !== false,
          role: dbRole ?? null,
          areas: areaMap.get(authUid) ?? [],
          projects: projectMap.get(authUid) ?? [],
        };
      });

      return jsonRes({ ok: true, data: users });
    }

    /* ═══════════════════════════════════════════ */
    /* ─── CREATE ─── */
    /* ═══════════════════════════════════════════ */
    if (action === "create") {
      const { email, password, name, user_profile, areas, projects } = body;

      if (!email || !password) {
        return errRes("E-mail e senha são obrigatórios.");
      }

      // 1. Try to create auth user
      let authUserId: string;
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name: name || "", user_profile: user_profile || "Consultor" },
      });

      if (authError) {
        // Check if this is an "already registered" error — try to recover orphan
        const isAlreadyRegistered =
          authError.message.toLowerCase().includes("already been registered") ||
          authError.message.toLowerCase().includes("already registered") ||
          authError.message.toLowerCase().includes("user already");

        if (isAlreadyRegistered) {
          // List auth users to find the existing one by email
          const { data: listData } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
          const existingAuthUser = listData?.users?.find(
            (u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase()
          );

          if (!existingAuthUser) {
            return errRes("E-mail já registrado no Auth, mas não foi possível localizar o usuário.");
          }

          // Check if they already exist in the users table
          const { data: existingRows } = await adminClient
            .from("users")
            .select("id")
            .eq("auth_user_id", existingAuthUser.id)
            .limit(1);

          if (existingRows && existingRows.length > 0) {
            return errRes("Já existe um usuário ativo com este e-mail. Edite-o na lista ao invés de criar um novo.");
          }

          // Orphan auth user — update password and re-link
          await adminClient.auth.admin.updateUserById(existingAuthUser.id, {
            password,
            email_confirm: true,
            user_metadata: { name: name || "", user_profile: user_profile || "Consultor" },
          });

          authUserId = existingAuthUser.id;
          console.log(`[manage-user] Re-linked orphan auth user ${email} (${authUserId})`);
        } else {
          return errRes(translateError(authError.message));
        }
      } else {
        authUserId = authData.user.id;
      }

      // 2. Upsert into users table
      const { error: userInsertError } = await adminClient
        .from("users")
        .upsert(
          {
            auth_user_id: authUserId,
            email,
            name: name || "",
            user_profile: user_profile || "Consultor",
            active: true,
          },
          { onConflict: "auth_user_id" }
        );

      if (userInsertError) {
        return errRes(`Falha ao criar registro: ${translateError(userInsertError.message)}`);
      }

      // 3. Sync role (delete old + insert new)
      const profileToRole: Record<string, string> = {
        Administrador: "admin",
        Consultor: "consultor",
        Gerente: "gerente",
        Coordenador: "coordenador",
        Cliente: "cliente",
      };
      const role = profileToRole[user_profile] ?? "consultor";
      await adminClient.from("user_roles").delete().eq("user_id", authUserId);
      await adminClient.from("user_roles").insert({ user_id: authUserId, role });

      // 4. Sync allowed areas
      await adminClient.from("user_allowed_areas").delete().eq("user_id", authUserId);
      if (Array.isArray(areas) && areas.length > 0) {
        const areaRows = areas.map((a: string) => ({ user_id: authUserId, area_name: a }));
        await adminClient.from("user_allowed_areas").insert(areaRows);
      }

      // 5. Sync project access
      await adminClient.from("user_project_access").delete().eq("user_id", authUserId);
      if (Array.isArray(projects) && projects.length > 0) {
        const projRows = projects.map((pid: number) => ({ user_id: authUserId, project_id: pid }));
        await adminClient.from("user_project_access").insert(projRows);
      }

      // 6. Audit log
      await adminClient.from("audit_log").insert({
        performed_by: userData.user.id,
        target_user_id: authUserId,
        action: "create_user",
        details: { email, name, user_profile, areas, projects, recovered_orphan: !authData },
      });

      return jsonRes({
        ok: true,
        data: { authUserId, email, name, user_profile },
      });
    }

    /* ═══════════════════════════════════════════ */
    /* ─── UPDATE ─── */
    /* ═══════════════════════════════════════════ */
    if (action === "update") {
      const { userId, authUserId: targetAuthUserId, payload, areas, projects } = body;

      if (!userId || !targetAuthUserId) {
        return errRes("userId e authUserId são obrigatórios.");
      }

      // 1. Update users table
      const userPayload: Record<string, unknown> = {};
      if (payload?.name !== undefined) userPayload.name = payload.name;
      if (payload?.email !== undefined) userPayload.email = payload.email;
      if (payload?.user_profile !== undefined) userPayload.user_profile = payload.user_profile;
      if (payload?.active !== undefined) userPayload.active = payload.active;

      if (Object.keys(userPayload).length > 0) {
        const { error: updateError } = await adminClient
          .from("users")
          .update(userPayload)
          .eq("id", userId);
        if (updateError) {
          return errRes(`Falha ao atualizar usuário: ${translateError(updateError.message)}`);
        }
      }

      // 2. Sync role
      if (payload?.user_profile) {
        const profileToRole: Record<string, string> = {
          Administrador: "admin",
          Consultor: "consultor",
          Gerente: "gerente",
          Coordenador: "coordenador",
          Cliente: "cliente",
        };
        const role = profileToRole[payload.user_profile] ?? "consultor";
        await adminClient.from("user_roles").delete().eq("user_id", targetAuthUserId);
        const { error: roleError } = await adminClient.from("user_roles").insert({ user_id: targetAuthUserId, role });
        if (roleError) {
          return errRes(`Falha ao sincronizar perfil: ${translateError(roleError.message)}`);
        }
      }

      // 3. Sync allowed areas
      if (Array.isArray(areas)) {
        await adminClient.from("user_allowed_areas").delete().eq("user_id", targetAuthUserId);
        if (areas.length > 0) {
          const areaRows = areas.map((a: string) => ({ user_id: targetAuthUserId, area_name: a }));
          const { error: areasError } = await adminClient.from("user_allowed_areas").insert(areaRows);
          if (areasError) {
            return errRes(`Falha ao salvar áreas permitidas: ${translateError(areasError.message)}`);
          }
        }
      }

      // 4. Sync project access
      if (Array.isArray(projects)) {
        await adminClient.from("user_project_access").delete().eq("user_id", targetAuthUserId);
        if (projects.length > 0) {
          const projRows = projects.map((pid: number) => ({ user_id: targetAuthUserId, project_id: pid }));
          const { error: projError } = await adminClient.from("user_project_access").insert(projRows);
          if (projError) {
            return errRes(`Falha ao salvar projetos: ${translateError(projError.message)}`);
          }
        }
      }

      // 5. Audit log
      await adminClient.from("audit_log").insert({
        performed_by: userData.user.id,
        target_user_id: targetAuthUserId,
        action: "update_user",
        details: { userId, changes: userPayload, areas, projects },
      });

      return jsonRes({ ok: true });
    }

    /* ═══════════════════════════════════════════ */
    /* ─── DELETE ─── */
    /* ═══════════════════════════════════════════ */
    if (action === "delete") {
      const { authUserId } = body;
      if (!authUserId) return errRes("authUserId é obrigatório.");

      // 1. Clean up DB records FIRST (before auth delete to avoid FK conflicts)
      await adminClient.from("user_project_access").delete().eq("user_id", authUserId);
      await adminClient.from("user_allowed_areas").delete().eq("user_id", authUserId);
      await adminClient.from("user_roles").delete().eq("user_id", authUserId);
      await adminClient.from("users").delete().eq("auth_user_id", authUserId);

      // 2. Delete auth user
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(authUserId);
      if (deleteError) {
        console.warn("Aviso ao excluir auth:", deleteError.message);
      }

      await adminClient.from("audit_log").insert({
        performed_by: userData.user.id,
        target_user_id: authUserId,
        action: "delete_user",
        details: { authUserId },
      });

      return jsonRes({ ok: true });
    }

    /* ═══════════════════════════════════════════ */
    /* ─── DEACTIVATE ─── */
    /* ═══════════════════════════════════════════ */
    if (action === "deactivate") {
      const { userId, authUserId: targetAuthUserId } = body;
      if (!userId || !targetAuthUserId) return errRes("userId e authUserId são obrigatórios.");

      await adminClient.from("users").update({ active: false }).eq("id", userId);
      await adminClient.from("user_allowed_areas").delete().eq("user_id", targetAuthUserId);
      await adminClient.from("user_project_access").delete().eq("user_id", targetAuthUserId);

      await adminClient.from("audit_log").insert({
        performed_by: userData.user.id,
        target_user_id: targetAuthUserId,
        action: "deactivate_user",
        details: { userId },
      });

      return jsonRes({ ok: true });
    }

    /* ═══════════════════════════════════════════ */
    /* ─── CLEANUP ORPHANS ─── */
    /* ═══════════════════════════════════════════ */
    if (action === "cleanup_orphans") {
      // List all auth users
      const { data: listData, error: listErr } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      if (listErr) return errRes(`Falha ao listar auth: ${listErr.message}`);

      // Get all auth_user_ids from users table
      const { data: dbUsers } = await adminClient
        .from("users")
        .select("auth_user_id")
        .limit(5000);

      const dbSet = new Set((dbUsers ?? []).map((u: { auth_user_id: string }) => u.auth_user_id));

      const orphans: string[] = [];
      for (const authUser of (listData?.users ?? [])) {
        if (!dbSet.has(authUser.id)) {
          // Clean up related records
          await adminClient.from("user_project_access").delete().eq("user_id", authUser.id);
          await adminClient.from("user_allowed_areas").delete().eq("user_id", authUser.id);
          await adminClient.from("user_roles").delete().eq("user_id", authUser.id);
          // Delete auth user
          await adminClient.auth.admin.deleteUser(authUser.id);
          orphans.push(authUser.email ?? authUser.id);
        }
      }

      console.log(`[manage-user] Cleaned up ${orphans.length} orphan auth users`);

      await adminClient.from("audit_log").insert({
        performed_by: userData.user.id,
        target_user_id: null,
        action: "cleanup_orphans",
        details: { removed: orphans },
      });

      return jsonRes({ ok: true, data: { removed: orphans, count: orphans.length } });
    }

    return errRes("Ação inválida. Use 'list', 'create', 'update', 'delete', 'deactivate' ou 'cleanup_orphans'.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno do servidor";
    return errRes(translateError(message), 500);
  }
});