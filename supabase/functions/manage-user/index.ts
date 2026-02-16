import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errRes("Não autorizado.", 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller with their token
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await callerClient.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return errRes("Token inválido.", 401);
    }

    // Check if caller is admin using the is_admin function
    const { data: isAdmin } = await callerClient.rpc("is_admin");
    if (!isAdmin) {
      return errRes("Apenas administradores podem gerenciar usuários.", 403);
    }

    const body = await req.json();
    const { action } = body;

    // Admin client with service role for user management
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

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
      const { error: userError } = await adminClient
        .from("users")
        .insert({
          auth_user_id: authUserId,
          email,
          name: name || "",
          user_profile: user_profile || "Consultor",
          active: true,
        });

      if (userError) {
        // Rollback auth user if users table insert fails
        await adminClient.auth.admin.deleteUser(authUserId);
        return errRes(`Falha ao criar registro: ${userError.message}`);
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
        performed_by: claimsData.user.id,
        target_user_id: authUserId,
        action: "create_user",
        details: { email, name, user_profile, areas, projects },
      });

      return jsonRes({
        ok: true,
        data: { authUserId, email, name, user_profile },
      });
    }

    if (action === "delete") {
      const { authUserId } = body;
      if (!authUserId) return errRes("authUserId é obrigatório.");

      // Delete auth user (cascades to users table if FK set, otherwise clean up)
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(authUserId);
      if (deleteError) {
        return errRes(`Falha ao deletar: ${deleteError.message}`);
      }

      // Clean up related tables
      await adminClient.from("users").delete().eq("auth_user_id", authUserId);
      await adminClient.from("user_roles").delete().eq("user_id", authUserId);
      await adminClient.from("user_allowed_areas").delete().eq("user_id", authUserId);
      await adminClient.from("user_project_access").delete().eq("user_id", authUserId);

      // Audit
      await adminClient.from("audit_log").insert({
        performed_by: claimsData.user.id,
        target_user_id: authUserId,
        action: "delete_user",
        details: { authUserId },
      });

      return jsonRes({ ok: true });
    }

    return errRes("Ação inválida. Use 'create' ou 'delete'.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return errRes(message, 500);
  }
});
