import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, ArrowRight } from "lucide-react";
import assistantAvatar from "@/assets/assistant-avatar.png";

const MESSAGES = [
  {
    text: "Lembre-se de revisar suas tarefas e, se precisar de ajuda, acione nossa equipe! Juntos, somos mais fortes! 💪",
    cta: "Ver Tarefas",
    link: "/tarefas",
  },
  {
    text: "Que tal dar uma olhada nas suas analíticas? Acompanhar os números ajuda a tomar decisões mais inteligentes! 📊",
    cta: "Ver Analíticas",
    link: "/analiticas",
  },
  {
    text: "Você sabia que pode exportar relatórios em PDF? Mantenha sua equipe informada com dados atualizados! 📄",
    cta: "Ver Ferramentas",
    link: "/ferramentas",
  },
  {
    text: "Confira o ranking de produtividade! Veja quem está se destacando e motive a equipe! 🏆",
    cta: "Ver Ranking",
    link: "/gamificacao",
  },
  {
    text: "Mantenha suas tarefas em dia! Tarefas organizadas = menos estresse e mais resultados. 🎯",
    cta: "Ver Tarefas",
    link: "/tarefas",
  },
];

const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const DISMISS_KEY = "assistant-reminder-dismissed";

export default function AssistantReminder() {
  const [visible, setVisible] = useState(false);
  const [messageIdx, setMessageIdx] = useState(0);

  const show = useCallback(() => {
    const lastDismissed = localStorage.getItem(DISMISS_KEY);
    if (lastDismissed) {
      const elapsed = Date.now() - Number(lastDismissed);
      if (elapsed < INTERVAL_MS) return;
    }
    setMessageIdx(Math.floor(Math.random() * MESSAGES.length));
    setVisible(true);
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  }, []);

  useEffect(() => {
    // Show after 30 seconds on first load
    const initialTimer = setTimeout(show, 30_000);
    // Then periodically
    const interval = setInterval(show, INTERVAL_MS);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [show]);

  const msg = MESSAGES[messageIdx];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="fixed bottom-6 left-6 z-50 w-[340px] max-w-[calc(100vw-3rem)]"
        >
          <div
            className="relative overflow-hidden rounded-2xl border border-white/[0.08] shadow-2xl"
            style={{
              background: "linear-gradient(145deg, hsl(262 50% 16%), hsl(234 45% 10%))",
              boxShadow: "0 20px 50px -12px hsl(262 83% 20% / 0.5)",
            }}
          >
            {/* Top accent bar */}
            <div className="h-[2px] w-full bg-gradient-to-r from-primary via-[hsl(262_83%_58%)] to-transparent opacity-60" />

            {/* Close button */}
            <button
              onClick={dismiss}
              className="absolute top-3 right-3 rounded-lg p-1 text-white/20 transition hover:bg-white/[0.06] hover:text-white/50"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            <div className="flex gap-3 p-4">
              {/* Avatar */}
              <div className="shrink-0">
                <div
                  className="h-12 w-12 rounded-full border-2 overflow-hidden"
                  style={{ borderColor: "hsl(262 83% 58% / 0.4)" }}
                >
                  <img
                    src={assistantAvatar}
                    alt="Assistente ISP"
                    className="h-full w-full object-cover"
                  />
                </div>
                {/* Online dot */}
                <div className="relative -mt-3 ml-8">
                  <div className="h-3.5 w-3.5 rounded-full border-2 bg-emerald-400" style={{ borderColor: "hsl(234 45% 10%)" }} />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-primary/70 mb-1">
                  ISP Assistente
                </p>
                <p className="text-[13px] leading-relaxed text-white/75">
                  {msg.text}
                </p>

                {/* CTA */}
                <a
                  href={msg.link}
                  onClick={dismiss}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white/90 transition hover:bg-white/[0.08]"
                  style={{
                    background: "linear-gradient(135deg, hsl(262 83% 58% / 0.2), hsl(234 89% 64% / 0.15))",
                    border: "1px solid hsl(262 83% 58% / 0.2)",
                  }}
                >
                  {msg.cta}
                  <ArrowRight className="h-3 w-3" />
                </a>
              </div>
            </div>

            {/* Subtle animated pulse */}
            <motion.div
              className="absolute -bottom-4 -left-4 h-20 w-20 rounded-full opacity-[0.04]"
              style={{ background: "radial-gradient(circle, hsl(262 83% 58%), transparent)" }}
              animate={{ scale: [1, 1.3, 1], opacity: [0.04, 0.08, 0.04] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
