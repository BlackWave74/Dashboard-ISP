import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { promises as fs } from "fs";
import path from "path";
import { getClientIp, getRequestId } from "@/app/api/_utils/requestMeta";
import { rateLimit } from "@/app/api/_utils/rateLimit";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SERVICE_ROLE_KEY ??
  "";

const ADMIN_ROLES = ["Administrador", "admin", "administrador"];
type PublicUser = Record<string, unknown> & {
  auth_user_id: string;
  name?: string | null;
  last_name?: string | null;
  second_name?: string | null;
  email?: string | null;
  user_profile?: string | null;
  active?: boolean | null;
};

const jsonResponse = (data: unknown, init?: number | ResponseInit) =>
  NextResponse.json(data, typeof init === "number" ? { status: init } : init);

const withRequestId = (response: NextResponse, reqId: string) => {
  response.headers.set("X-Request-Id", reqId);
  return response;
};

const resolveLogFile = () => {
  const configured = process.env.ADMIN_USERS_LOG_PATH?.trim();
  if (configured) {
    return path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured);
  }
  if (process.env.VERCEL === "1" || process.env.VERCEL === "true") {
    return "/tmp/admin-users.log";
  }
  return path.join(process.cwd(), "logs", "admin-users.log");
};

const logFile = resolveLogFile();
async function logError(message: string, details?: unknown) {
  try {
    await fs.mkdir(path.dirname(logFile), { recursive: true });
    const ts = new Date().toISOString();
    await fs.appendFile(
      logFile,
      `[${ts}] ${message}${details ? ` | ${JSON.stringify(details)}` : ""}\n`,
      "utf8"
    );
  } catch (err) {
    console.error("Failed to write log", err);
  }
}

const ensureEnv = () => {
  const missing: string[] = [];
  if (!SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!SUPABASE_ANON_KEY) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!SERVICE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY (ou SERVICE_ROLE_KEY)");
  if (missing.length) {
    return jsonResponse({ ok: false, error: "missing_env", missing }, 500);
  }
  return null;
};

async function assertAdmin(request: Request) {
  const missing = ensureEnv();
  if (missing) return { error: missing };

  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return { error: jsonResponse({ ok: false, error: "missing_bearer" }, 401) };

  const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: userData, error } = await supabaseAnon.auth.getUser(token);
  if (error || !userData?.user?.id) {
    await logError("auth_get_user_failed", { error });
    return { error: jsonResponse({ ok: false, error: "unauthorized" }, 401) };
  }

  const metaRole = normalizeProfile(userData.user.user_metadata?.user_profile as string | undefined);

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: publicRows } = await supabaseAdmin
    .from("users")
    .select("auth_user_id,user_profile,active")
    .eq("auth_user_id", userData.user.id)
    .limit(1)
    .maybeSingle();

  const role =
    normalizeProfile(publicRows?.user_profile as string | undefined) ?? metaRole ?? "";
  const active = publicRows?.active ?? true;
  if (!active || !ADMIN_ROLES.includes(role)) {
    await logError("admin_validation_failed", {
      auth_user_id: userData.user.id,
      active,
      role,
      metaRole,
      has_public: !!publicRows,
    });
    return { error: jsonResponse({ ok: false, error: "not_admin" }, 403) };
  }

  return { authUserId: userData.user.id, supabaseAdmin };
}

const normalizeProfile = (value?: string | null) => {
  if (!value) return undefined;
  if (value === "Administrador" || value === "Consultor") return value;
  const lower = value.toLowerCase();
  if (lower.startsWith("admin")) return "Administrador";
  if (lower.startsWith("consult")) return "Consultor";
  return undefined;
};

const extractMissingColumnFromMessage = (message: string) => {
  const m = /could not find the '([^']+)' column/i.exec(message || "");
  return m?.[1]?.trim() || "";
};

async function updateAuthUser(targetId: string, authPayload: Record<string, unknown>) {
  if (!Object.keys(authPayload).length) return null;
  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(targetId, authPayload);
  if (error) throw new Error(error.message || "auth_update_failed");
  return data;
}

async function updatePublicUser(targetId: string, publicPayload: Record<string, unknown>) {
  if (!Object.keys(publicPayload).length) return null;
  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY);
  const runUpdate = async (payload: Record<string, unknown>) =>
    supabaseAdmin
      .from("users")
      .update(payload)
      .eq("auth_user_id", targetId)
      .select()
      .maybeSingle();

  let payload = { ...publicPayload };
  let data: unknown = null;
  let error: { message?: string } | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    ({ data, error } = await runUpdate(payload));
    if (!error) break;

    const missingCol = extractMissingColumnFromMessage(error.message || "");
    if (!missingCol || payload[missingCol] === undefined) break;
    delete payload[missingCol];
  }
  if (error) throw new Error(error.message || "public_update_failed");
  return data as PublicUser;
}

export async function GET(request: Request) {
  const reqId = getRequestId(request.headers);
  const ip = getClientIp(request.headers);
  const rl = rateLimit(`${request.method}:${ip}:${new URL(request.url).pathname}`);
  if (!rl.allowed) {
    return withRequestId(
      NextResponse.json({ ok: false, error: "rate_limited", request_id: reqId }, {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rl.retryAfter / 1000)) },
      }),
      reqId
    );
  }

  const envError = ensureEnv();
  if (envError) return withRequestId(envError, reqId);
  const adminCheck = await assertAdmin(request);
  if (adminCheck.error) return withRequestId(adminCheck.error, reqId);

  const url = new URL(request.url);
  const page = Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1;
  const perPage = Number.parseInt(url.searchParams.get("per_page") ?? "50", 10) || 50;

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: authList, error: authError } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });
    if (authError) {
      return jsonResponse({ ok: false, error: authError.message || "list_auth_failed" }, 400);
    }

    const authUsers = authList?.users ?? [];
    const ids = authUsers.map((u) => u.id).filter(Boolean);

    let publicMap: Record<string, PublicUser> = {};
    if (ids.length) {
      const { data: publicData } = await supabaseAdmin
        .from("users")
        .select("*")
        .in("auth_user_id", ids);
      if (Array.isArray(publicData)) {
        publicMap = Object.fromEntries(publicData.map((row: PublicUser) => [row.auth_user_id, row]));
      }
    }

    const users = authUsers.map((user) => ({
      auth_user_id: user.id,
      email: user.email,
      user_metadata: user.user_metadata ?? {},
      public: publicMap[user.id] ?? null,
    }));

    return withRequestId(jsonResponse({ ok: true, users, page, per_page: perPage }), reqId);
  } catch (error) {
    await logError("list_failed", { error: (error as Error).message });
    return withRequestId(
      jsonResponse({ ok: false, error: "list_failed", details: (error as Error).message }, 500),
      reqId
    );
  }
}

export async function POST(request: Request) {
  const reqId = getRequestId(request.headers);
  const ip = getClientIp(request.headers);
  const rl = rateLimit(`${request.method}:${ip}:${new URL(request.url).pathname}`);
  if (!rl.allowed) {
    return withRequestId(
      NextResponse.json({ ok: false, error: "rate_limited", request_id: reqId }, {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rl.retryAfter / 1000)) },
      }),
      reqId
    );
  }

  const envError = ensureEnv();
  if (envError) return withRequestId(envError, reqId);
  const adminCheck = await assertAdmin(request);
  if (adminCheck.error) return withRequestId(adminCheck.error, reqId);

  try {
    const body = await request.json();
    const email: string | undefined = body?.email?.trim();
    const password: string | undefined = body?.password;
    const name: string | undefined = body?.name;
    const perfilRaw: string | undefined = body?.perfil || body?.user_profile;
    const clientName: string | undefined = body?.client_name;
    const allowedAreas: string[] | undefined = Array.isArray(body?.allowed_areas)
      ? body.allowed_areas.map((x: unknown) => String(x))
      : undefined;
    const perfil = normalizeProfile(perfilRaw);

    if (!email || !password || !name || !perfil) {
      return withRequestId(jsonResponse({ ok: false, error: "missing_fields" }, 400), reqId);
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        user_profile: perfil,
        client_name: clientName,
        ...(allowedAreas ? { allowed_areas: allowedAreas } : {}),
      },
    });
    if (authError || !authData?.user?.id) {
      await logError("auth_create_failed", { error: authError?.message, email });
      const low = (authError?.message || "").toLowerCase();
      if (low.includes("already been registered") || low.includes("already registered")) {
        return withRequestId(
          jsonResponse(
            {
              ok: false,
              error: "email_already_registered",
              message: "Já existe um usuário cadastrado com este e-mail.",
            },
            409
          ),
          reqId
        );
      }
      return withRequestId(
        jsonResponse({ ok: false, error: authError?.message || "auth_create_failed" }, 400),
        reqId
      );
    }

    const targetId = authData.user.id;
    const publicPayload: Record<string, unknown> = {
      auth_user_id: targetId,
      email,
      name,
      user_profile: perfil,
      ...(allowedAreas ? { allowed_areas: allowedAreas } : {}),
      ...(clientName ? { client_name: clientName } : {}),
    };
    const publicExtras = body?.public ?? {};
    for (const [k, v] of Object.entries(publicExtras)) {
      if (v !== undefined) publicPayload[k] = v;
    }

    const upsertPayload: Record<string, unknown> = { active: true, ...publicPayload };
    const runUpsert = async (payload: Record<string, unknown>) =>
      supabaseAdmin
        .from("users")
        .upsert(payload, { onConflict: "auth_user_id" })
        .select()
        .maybeSingle();

    let payload = { ...upsertPayload };
    let pubData: unknown = null;
    let pubError: { message?: string } | null = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      ({ data: pubData, error: pubError } = await runUpsert(payload));
      if (!pubError) break;

      const missingCol = extractMissingColumnFromMessage(pubError.message || "");
      if (!missingCol || payload[missingCol] === undefined) break;
      delete payload[missingCol];
    }

    if (pubError) {
      await logError("public_upsert_failed", { error: pubError.message, targetId });
      return withRequestId(
        jsonResponse({ ok: false, error: pubError.message || "public_upsert_failed" }, 400),
        reqId
      );
    }

    return withRequestId(
      NextResponse.json({ ok: true, auth_user_id: targetId, user: pubData, auth: authData }, { status: 201 }),
      reqId
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "create_failed";
    await logError("create_failed", { error: message });
    return withRequestId(jsonResponse({ ok: false, error: message }, 500), reqId);
  }
}

export async function PATCH(request: Request) {
  const reqId = getRequestId(request.headers);
  const ip = getClientIp(request.headers);
  const rl = rateLimit(`${request.method}:${ip}:${new URL(request.url).pathname}`);
  if (!rl.allowed) {
    return withRequestId(
      NextResponse.json({ ok: false, error: "rate_limited", request_id: reqId }, {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rl.retryAfter / 1000)) },
      }),
      reqId
    );
  }

  const envError = ensureEnv();
  if (envError) return withRequestId(envError, reqId);
  const adminCheck = await assertAdmin(request);
  if (adminCheck.error) return withRequestId(adminCheck.error, reqId);

  try {
    const body = await request.json();
    const targetId: string | undefined = body?.target_auth_user_id;
    if (!targetId) {
      return withRequestId(jsonResponse({ ok: false, error: "missing_target_auth_user_id" }, 400), reqId);
    }

    const authPayloadRaw = (body?.auth ?? {}) as Record<string, unknown>;
    const publicPayloadRaw = (body?.public ?? {}) as Record<string, unknown>;

    const authPayload: Record<string, unknown> = {};
    if (authPayloadRaw.email) authPayload.email = String(authPayloadRaw.email).trim();
    if (authPayloadRaw.password) authPayload.password = String(authPayloadRaw.password);
    if (authPayloadRaw.user_metadata) {
      const meta = authPayloadRaw.user_metadata as Record<string, unknown>;
      const user_profile = normalizeProfile(meta?.user_profile as string | undefined);
      authPayload.user_metadata = {
        ...(meta ?? {}),
        ...(user_profile ? { user_profile } : {}),
        ...(meta?.client_name ? { client_name: meta.client_name } : {}),
        ...(meta?.allowed_areas
          ? {
              allowed_areas: Array.isArray(meta.allowed_areas)
                ? meta.allowed_areas.map((x) => String(x))
                : [],
            }
          : {}),
      };
    }

    const publicPayload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(publicPayloadRaw)) {
      if (value !== undefined) {
        publicPayload[key] = value;
      }
    }
    if (publicPayloadRaw.allowed_areas) {
      const arr = Array.isArray(publicPayloadRaw.allowed_areas)
        ? (publicPayloadRaw.allowed_areas as unknown[]).map((x) => String(x))
        : [];
      publicPayload.allowed_areas = arr;
    }
    if (publicPayload.user_profile) {
      const normalized = normalizeProfile(publicPayload.user_profile as string | null);
      if (!normalized) {
        return withRequestId(jsonResponse({ ok: false, error: "invalid_user_profile" }, 400), reqId);
      }
      publicPayload.user_profile = normalized;
    }

    // Mirror email if changed in auth and not provided in public
    if (authPayload.email && publicPayload.email === undefined) {
      publicPayload.email = authPayload.email;
    }

    let authResult: unknown = null;
    if (Object.keys(authPayload).length) {
      authResult = await updateAuthUser(targetId, authPayload);
    }

    const publicResult = await updatePublicUser(targetId, publicPayload);

    return withRequestId(jsonResponse({ ok: true, auth: authResult, public: publicResult }), reqId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "patch_failed";
    await logError("patch_failed", { error: message });
    return withRequestId(jsonResponse({ ok: false, error: message }, 500), reqId);
  }
}

export async function DELETE(request: Request) {
  const reqId = getRequestId(request.headers);
  const ip = getClientIp(request.headers);
  const rl = rateLimit(`${request.method}:${ip}:${new URL(request.url).pathname}`);
  if (!rl.allowed) {
    return withRequestId(
      NextResponse.json({ ok: false, error: "rate_limited", request_id: reqId }, {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rl.retryAfter / 1000)) },
      }),
      reqId
    );
  }

  const envError = ensureEnv();
  if (envError) return withRequestId(envError, reqId);
  const adminCheck = await assertAdmin(request);
  if (adminCheck.error) return withRequestId(adminCheck.error, reqId);

  try {
    const body = await request.json();
    const targetId: string | undefined = body?.target_auth_user_id ?? body?.id;
    if (!targetId) {
      return withRequestId(jsonResponse({ ok: false, error: "missing_target_auth_user_id" }, 400), reqId);
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(targetId);
    if (authError) {
      await logError("auth_delete_failed", { error: authError.message, targetId });
      return withRequestId(
        jsonResponse({ ok: false, error: authError.message || "auth_delete_failed" }, 400),
        reqId
      );
    }

    const { error: pubError } = await supabaseAdmin.from("users").delete().eq("auth_user_id", targetId);
    if (pubError) {
      await logError("public_delete_failed", { error: pubError.message, targetId });
      return withRequestId(
        jsonResponse({ ok: false, error: pubError.message || "public_delete_failed" }, 400),
        reqId
      );
    }

    return withRequestId(jsonResponse({ ok: true, deleted: targetId }), reqId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "delete_failed";
    await logError("delete_failed", { error: message });
    return withRequestId(jsonResponse({ ok: false, error: message }, 500), reqId);
  }
}
