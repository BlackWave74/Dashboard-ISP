import { useEffect, useRef, useState } from "react";
import { supabaseExt as supabase } from "@/lib/supabase";

export interface PresenceEntry {
  auth_user_id: string;
  name: string;
  email: string;
  online_at: string;
}

const PRESENCE_CHANNEL = "isp-user-presence";

/**
 * Wait until supabaseExt has a valid access token.
 * Retries up to 10 times with 800ms intervals.
 */
async function waitForSession(cancelled: () => boolean): Promise<boolean> {
  for (let attempt = 0; attempt < 10; attempt++) {
    if (cancelled()) return false;
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) return true;
    await new Promise((r) => setTimeout(r, 800));
  }
  console.warn("[Presence] supabaseExt session not available after retries");
  return false;
}

/**
 * Hook para RASTREAR a presença do usuário atual no canal Realtime.
 * Chamado uma vez por sessão autenticada — registra o usuário como "online".
 */
export function useTrackPresence(
  email: string | undefined,
  name: string | undefined,
  _emailDup?: string | undefined,
) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!email || !name) return;

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;

    let cancelled = false;

    const startTracking = async () => {
      const ready = await waitForSession(() => cancelled);
      if (!ready || cancelled) return;

      const channel = supabase.channel(PRESENCE_CHANNEL, {
        config: { presence: { key: normalizedEmail } },
      });

      channel
        .on("presence", { event: "sync" }, () => {})
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await channel.track({
              auth_user_id: normalizedEmail,
              name,
              email: normalizedEmail,
              online_at: new Date().toISOString(),
            } satisfies PresenceEntry);
          }
        });

      channelRef.current = channel;
    };

    startTracking();

    return () => {
      cancelled = true;
      if (channelRef.current) {
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [email, name]);
}

/**
 * Hook para OBSERVAR quem está online — somente para admins.
 * Retorna um Map de email → PresenceEntry com o horário de login.
 */
export function useOnlineUsers(): Map<string, PresenceEntry> {
  const [onlineMap, setOnlineMap] = useState<Map<string, PresenceEntry>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const startObserving = async () => {
      const ready = await waitForSession(() => cancelled);
      if (!ready || cancelled) return;

      const channel = supabase.channel(PRESENCE_CHANNEL, {
        config: { presence: { key: "__observer__" } },
      });

      const syncState = () => {
        const state = channel.presenceState<PresenceEntry>();
        const map = new Map<string, PresenceEntry>();
        Object.values(state).forEach((entries) => {
          const sorted = [...entries].sort(
            (a, b) => new Date(b.online_at).getTime() - new Date(a.online_at).getTime(),
          );
          const entry = sorted[0];
          if (entry?.email && entry.email !== "__observer__") {
            map.set(entry.email.trim().toLowerCase(), entry);
          }
        });
        setOnlineMap(map);
      };

      channel
        .on("presence", { event: "sync" }, syncState)
        .on("presence", { event: "join" }, syncState)
        .on("presence", { event: "leave" }, syncState)
        .subscribe();

      channelRef.current = channel;
    };

    startObserving();

    return () => {
      cancelled = true;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  return onlineMap;
}
