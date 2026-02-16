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

    if (action === "create") {
      const { email, password, name, user_profile, cliente_id, areas, projects } = body;

      if (!email || !password) {
        return errRes("E-mail e senha são obrigatórios.");
      }

      // 1. Create auth user
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name: name || "", user_profile: user_profile || "Consultor" },
      });

      if (authError) {
        return errRes(authError.message);
      }

      const authUserId = authData.user.id;

      // 2. Insert into users table
      const { error: userInsertError } = await adminClient
        .from("users")
        .insert({
          auth_user_id: authUserId,
          email,
          name: name || "",
          user_profile: user_profile || "Consultor",
          active: true,
        });

      if (userInsertError) {
        await adminClient.auth.admin.deleteUser(authUserId);
        return errRes(`Falha ao criar registro: ${userInsertError.message}`);
      }

      // 3. Insert role
      const profileToRole: Record<string, string> = {
        Administrador: "admin",
        Consultor: "consultor",
        Gerente: "gerente",
        Coordenador: "coordenador",
        Cliente: "cliente",
      };
      const role = profileToRole[user_profile] ?? "consultor";
      await adminClient.from("user_roles").insert({ user_id: authUserId, role });

      // 4. Insert allowed areas
      if (Array.isArray(areas) && areas.length > 0) {
        const areaRows = areas.map((a: string) => ({ user_id: authUserId, area_name: a }));
        await adminClient.from("user_allowed_areas").insert(areaRows);
      }

      // 5. Insert project access
      if (Array.isArray(projects) && projects.length > 0) {
        const projRows = projects.map((pid: number) => ({ user_id: authUserId, project_id: pid }));
        await adminClient.from("user_project_access").insert(projRows);
      }

      // 6. Audit log
      await adminClient.from("audit_log").insert({
        performed_by: userData.user.id,
        target_user_id: authUserId,
        action: "create_user",
        details: { email, name, user_profile, areas, projects },
      });

      return jsonRes({
        ok: true,
        data: { authUserId, email, name, user_profile },
      });
    }

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
      if (payload?.cliente_id !== undefined) userPayload.cliente_id = payload.cliente_id;

      if (Object.keys(userPayload).length > 0) {
        const { error: updateError } = await adminClient
          .from("users")
          .update(userPayload)
          .eq("id", userId);
        if (updateError) {
          return errRes(`Falha ao atualizar usuário: ${updateError.message}`);
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
          return errRes(`Falha ao sincronizar role: ${roleError.message}`);
        }
      }

      // 3. Sync allowed areas
      if (Array.isArray(areas)) {
        await adminClient.from("user_allowed_areas").delete().eq("user_id", targetAuthUserId);
        if (areas.length > 0) {
          const areaRows = areas.map((a: string) => ({ user_id: targetAuthUserId, area_name: a }));
          const { error: areasError } = await adminClient.from("user_allowed_areas").insert(areaRows);
          if (areasError) {
            return errRes(`Falha ao sincronizar áreas: ${areasError.message}`);
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
            return errRes(`Falha ao sincronizar projetos: ${projError.message}`);
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

    if (action === "delete") {
      const { authUserId } = body;
      if (!authUserId) return errRes("authUserId é obrigatório.");

      const { error: deleteError } = await adminClient.auth.admin.deleteUser(authUserId);
      if (deleteError) {
        return errRes(`Falha ao deletar: ${deleteError.message}`);
      }

      await adminClient.from("users").delete().eq("auth_user_id", authUserId);
      await adminClient.from("user_roles").delete().eq("user_id", authUserId);
      await adminClient.from("user_allowed_areas").delete().eq("user_id", authUserId);
      await adminClient.from("user_project_access").delete().eq("user_id", authUserId);

      await adminClient.from("audit_log").insert({
        performed_by: userData.user.id,
        target_user_id: authUserId,
        action: "delete_user",
        details: { authUserId },
      });

      return jsonRes({ ok: true });
    }

    if (action === "deactivate") {
      const { userId, authUserId: targetAuthUserId } = body;
      if (!userId || !targetAuthUserId) return errRes("userId e authUserId são obrigatórios.");

      // Set user inactive and clear areas/projects
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

    return errRes("Ação inválida. Use 'create', 'update', 'delete' ou 'deactivate'.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return errRes(message, 500);
  }
});
