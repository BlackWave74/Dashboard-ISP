/**
 * Frontend helper to call the manage-user edge function.
 * All user management writes go through this function,
 * which uses service_role on the server to bypass RLS.
 */

// Use the Lovable Cloud Supabase URL for edge functions
const LOVABLE_CLOUD_URL = "https://phughcqnevoziyqmpvoj.supabase.co";
const EDGE_FN_URL = `${LOVABLE_CLOUD_URL}/functions/v1/manage-user`;

export async function callManageUser(
  token: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  const res = await fetch(EDGE_FN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();

  if (!res.ok || json.ok === false) {
    throw new Error(json.error || `HTTP ${res.status}`);
  }

  return json;
}
