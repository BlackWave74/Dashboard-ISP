import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase";

export const safeJson = async (res: Response) => {
  const text = await res.text();
  try { return text ? JSON.parse(text) : null; } catch { return { raw: text }; }
};

export const supabaseRest = async (
  path: string,
  token: string,
  options: RequestInit = {}
) => {
  const base = SUPABASE_URL.replace(/\/$/, "");
  const res = await fetch(`${base}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers as Record<string, string> || {}),
    },
  });
  if (!res.ok) {
    const data = await safeJson(res);
    throw new Error(data?.message ?? data?.error ?? `HTTP ${res.status}`);
  }
  return res;
};
