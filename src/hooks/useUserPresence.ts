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
 * Hook para RASTREAR a presença do usuário atual no canal Realtime.
 * Chamado uma vez por sessão autenticada — registra o usuário como "online".
 * A chave é o email do usuário (sempre disponível na sessão).
 *
 * IMPORTANTE: Aguarda a sessão do supabaseExt estar sincronizada antes
 * de abrir o canal Realtime, evitando falhas silenciosas de autenticação.
 */
export function useTrackPresence(
  email: string | undefined,
  name: string | undefined,
  _emailDup?: string | undefined,
) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!email || !name) return;

    let cancelled = false;

    const startTracking = async () => {
      // Wait until supabaseExt has a valid session (synced from useAuth)
      // Retry a few times with short delays to handle timing issues
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.access_token) break;
        if (cancelled) return;
        await new Promise((r) => setTimeout(r, 600));
      }
      if (cancelled) return;

      const channel = supabase.channel(PRESENCE_CHANNEL, {
        config: { presence: { key: email } },
      });

      channel
        .on("presence", { event: "sync" }, () => {})
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await channel.track({
              auth_user_id: email,
              name,
              email,
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
 * Usa o mesmo canal para leitura de presença.
 */
export function useOnlineUsers(): Map<string, PresenceEntry> {
  const [onlineMap, setOnlineMap] = useState<Map<string, PresenceEntry>>(new Map());

  useEffect(() => {
    let cancelled = false;

    const startObserving = async () => {
      // Wait for session like the tracker
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.access_token) break;
        if (cancelled) return;
        await new Promise((r) => setTimeout(r, 600));
      }
      if (cancelled) return;

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
            map.set(entry.email, entry);
          }
        });
        setOnlineMap(map);
      };

      channel
        .on("presence", { event: "sync" }, syncState)
        .on("presence", { event: "join" }, syncState)
        .on("presence", { event: "leave" }, syncState)
        .subscribe();

      // Cleanup ref for this closure
      if (!cancelled) {
        cleanupRef = () => {
          supabase.removeChannel(channel);
        };
      }
    };

    let cleanupRef: (() => void) | null = null;
    startObserving();

    return () => {
      cancelled = true;
      cleanupRef?.();
    };
  }, []);

  return onlineMap;
}
