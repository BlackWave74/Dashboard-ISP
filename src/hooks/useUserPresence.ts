import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PresenceEntry {
  auth_user_id: string; // usamos o email como chave única aqui
  name: string;
  email: string;
  online_at: string; // ISO string — momento em que entrou online
}

const PRESENCE_CHANNEL = "isp-user-presence";

/**
 * Hook para RASTREAR a presença do usuário atual no canal Realtime.
 * Chamado uma vez por sessão autenticada — registra o usuário como "online".
 * A chave é o email do usuário (sempre disponível na sessão).
 */
export function useTrackPresence(
  email: string | undefined,
  name: string | undefined,
  _emailDup?: string | undefined,
) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!email || !name) return;

    // Cria um canal exclusivo keyed pelo email
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

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [email, name]);
}

/**
 * Hook para OBSERVAR quem está online — somente para admins.
 * Retorna um Map de email → PresenceEntry com o horário de login.
 */
export function useOnlineUsers(): Map<string, PresenceEntry> {
  const [onlineMap, setOnlineMap] = useState<Map<string, PresenceEntry>>(new Map());

  useEffect(() => {
    const channel = supabase.channel(PRESENCE_CHANNEL);

    const syncState = () => {
      const state = channel.presenceState<PresenceEntry>();
      const map = new Map<string, PresenceEntry>();
      Object.values(state).forEach((entries) => {
        // cada entrada pode ter múltiplas abas — pegamos a mais recente
        const sorted = [...entries].sort(
          (a, b) => new Date(b.online_at).getTime() - new Date(a.online_at).getTime(),
        );
        if (sorted[0]?.email) {
          map.set(sorted[0].email, sorted[0]);
        }
      });
      setOnlineMap(map);
    };

    channel
      .on("presence", { event: "sync" }, syncState)
      .on("presence", { event: "join" }, syncState)
      .on("presence", { event: "leave" }, syncState)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return onlineMap;
}
