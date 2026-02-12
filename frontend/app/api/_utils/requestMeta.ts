import { randomUUID } from "crypto";

export function getClientIp(headers: Headers) {
  const cf = headers.get("cf-connecting-ip");
  if (cf) return cf.trim();

  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }

  return "unknown";
}

export function getRequestId(headers: Headers) {
  return headers.get("x-request-id")?.trim() || randomUUID();
}
