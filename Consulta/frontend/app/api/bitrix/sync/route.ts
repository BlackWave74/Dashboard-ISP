import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type InvokeResult =
  | { ok: true; data: unknown }
  | { ok: false; status: number; error: string };

const parseJsonSafe = (raw: string) => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

async function invokeSupabaseFunction(
  base: string,
  functionName: string,
  apiKey: string
): Promise<InvokeResult> {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    apikey: apiKey,
  };

  const postResponse = await fetch(`${base}/functions/v1/${functionName}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ source: "frontend" }),
  });

  if (postResponse.status === 405) {
    const getResponse = await fetch(
      `${base}/functions/v1/${functionName}?source=frontend`,
      {
        method: "GET",
        headers,
      }
    );
    const getText = await getResponse.text();
    if (!getResponse.ok) {
      return {
        ok: false,
        status: getResponse.status,
        error: getText || `Erro ${getResponse.status} em ${functionName}`,
      };
    }
    return { ok: true, data: parseJsonSafe(getText) };
  }

  const postText = await postResponse.text();
  if (!postResponse.ok) {
    return {
      ok: false,
      status: postResponse.status,
      error: postText || `Erro ${postResponse.status} em ${functionName}`,
    };
  }

  return { ok: true, data: parseJsonSafe(postText) };
}

async function invokeWithNameFallback(
  base: string,
  functionNames: string[],
  apiKey: string
): Promise<InvokeResult & { functionName?: string }> {
  let lastError: InvokeResult | null = null;
  for (const name of functionNames) {
    const result = await invokeSupabaseFunction(base, name, apiKey);
    if (result.ok) {
      return { ...result, functionName: name };
    }
    lastError = result;
    // 404 sugere nome inválido da function; tenta o próximo candidato.
    if (result.status !== 404) {
      return { ...result, functionName: name };
    }
  }
  if (!lastError) {
    return { ok: false, status: 500, error: "Falha desconhecida ao invocar função." };
  }
  return lastError;
}

async function runSync() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
  const apiKey = serviceRoleKey || anonKey;

  if (!supabaseUrl || !apiKey) {
    return NextResponse.json(
      {
        ok: false,
        error: "missing_env",
        missing: [
          ...(!supabaseUrl ? ["SUPABASE_URL (ou NEXT_PUBLIC_SUPABASE_URL)"] : []),
          ...(!apiKey
            ? ["SUPABASE_SERVICE_ROLE_KEY (ou SERVICE_ROLE_KEY ou SUPABASE_ANON_KEY)"]
            : []),
        ],
      },
      { status: 500 }
    );
  }
  const base = supabaseUrl.replace(/\/$/, "");
  const fnTasksCandidates = [
    "Get-Projetcs-And-Tasks-Bitrix",
    "Get-Projects-And-Tasks-Bitrix",
  ];
  const fnTimesCandidates = ["sync-bitrix-times", "Sync-Bitrix-Times"];

  try {
    const tasks = await invokeWithNameFallback(base, fnTasksCandidates, apiKey);
    if (!tasks.ok) {
      return NextResponse.json(
        { ok: false, function: tasks.functionName ?? fnTasksCandidates[0], error: tasks.error },
        { status: tasks.status }
      );
    }

    const times = await invokeWithNameFallback(base, fnTimesCandidates, apiKey);
    if (!times.ok) {
      return NextResponse.json(
        { ok: false, function: times.functionName ?? fnTimesCandidates[0], error: times.error },
        { status: times.status }
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        tasks: tasks.data,
        times: times.data,
      },
      meta: {
        tasksFunction: tasks.functionName ?? fnTasksCandidates[0],
        timesFunction: times.functionName ?? fnTimesCandidates[0],
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao chamar Edge Function.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST() {
  return runSync();
}

export async function GET() {
  return runSync();
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: "GET, POST, OPTIONS",
    },
  });
}
