import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import WeeklyReportModal from "@/components/WeeklyReportModal";
import type { TaskView } from "@/modules/tasks/types";
import {
  parseDateValue,
  isDeadlineSoon,
  normalizeTaskTitle,
  deadlineColor,
  formatDatePtBR,
  formatDurationHHMM,
  type TaskStatusKey,
} from "@/modules/tasks/utils";

/* ─── Messages by role category ─── */

const STAFF_MESSAGES = [
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
  {
    text: "Verifique os prazos das tarefas da sua equipe. Antecipar atrasos é a chave para entregas de qualidade! ⏰",
    cta: "Ver Tarefas",
    link: "/tarefas",
  },
  {
    text: "Já verificou as integrações hoje? Manter tudo conectado garante que nada fique para trás! 🔗",
    cta: "Ver Integrações",
    link: "/integracoes",
  },
  {
    text: "Acompanhe as horas alocadas nos projetos. Entender o investimento de tempo é essencial para o planejamento! ⏱️",
    cta: "Ver Analíticas",
    link: "/analiticas",
  },
  {
    text: "Dica: use o calendário para ter uma visão geral dos prazos da semana. Organização faz toda a diferença! 📅",
    cta: "Ver Calendário",
    link: "/calendario",
  },
  {
    text: "Precisa de ajuda? Nossa equipe de suporte está sempre pronta para auxiliar você! 🤝",
    cta: "Abrir Suporte",
    link: "/suporte",
  },
  {
    text: "Bora tirar um relatório semanal? Veja o progresso de todos os projetos em um só lugar! 📋",
    cta: "Gerar Relatório",
    link: "__weekly_report__",
    isReport: true,
  },
];

const CLIENT_MESSAGES = [
  {
    text: "O sistema evolui em parceria! Compartilhe suas sugestões de melhorias ou relate problemas ao seu consultor. Juntos somos mais fortes! Vamos crescer juntos! 🤝",
    cta: "Falar com Suporte",
    link: "/suporte",
  },
  {
    text: "Acompanhe o progresso das suas tarefas em tempo real! Tudo atualizado automaticamente para sua comodidade. ✅",
    cta: "Ver Tarefas",
    link: "/tarefas",
  },
  {
    text: "Sua opinião é muito importante para nós! Conte ao seu consultor como podemos melhorar ainda mais. 💡",
    cta: "Falar com Suporte",
    link: "/suporte",
  },
  {
    text: "Estamos sempre trabalhando para entregar o melhor resultado. Confira as últimas atualizações! 🚀",
    cta: "Ver Tarefas",
    link: "/tarefas",
  },
  {
    text: "Ficou com dúvida? Fale com nosso suporte — estamos aqui para ajudar você a alcançar os melhores resultados! 💬",
    cta: "Falar com Suporte",
    link: "/suporte",
  },
  {
    text: "Transparência é nosso compromisso! Acompanhe cada etapa do seu projeto diretamente no painel. 🔍",
    cta: "Ver Tarefas",
    link: "/tarefas",
  },
  {
    text: "Obrigado por confiar na ISP Consulte! Seu sucesso é o nosso sucesso. Estamos juntos nessa jornada! 🌟",
    cta: "Ver Tarefas",
    link: "/tarefas",
  },
];

type NotifTask = {
  title?: string;
  project?: string;
  statusKey?: string;
  deadlineDate?: Date | null;
  deadlineIsSoon?: boolean;
  consultant?: string;
};

type MessageItem = {
  text: string;
  cta: string;
  link: string;
  isReport?: boolean;
};

const INTERVAL_MS = 5 * 60 * 1000;
const DISMISS_KEY = "assistant-reminder-dismissed";

type Props = {
  notifTasks?: NotifTask[];
};

export default function AssistantReminder({ notifTasks }: Props) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [messageIdx, setMessageIdx] = useState(0);
  const [showReport, setShowReport] = useState(false);

  const role = session?.role;
  const isClient = role === "cliente";
  const messages: MessageItem[] = isClient ? CLIENT_MESSAGES : STAFF_MESSAGES;

  // Convert notifTasks to TaskView-like objects for the report modal
  const reportTasks = useMemo<TaskView[]>(() => {
    if (!notifTasks) return [];
    return notifTasks.map((t) => ({
      title: t.title || "Tarefa",
      description: "",
      project: t.project || "Sem projeto",
      consultant: t.consultant || "",
      statusKey: (t.statusKey || "unknown") as TaskStatusKey,
      durationLabel: "",
      deadlineDate: t.deadlineDate || null,
      deadlineLabel: "",
      deadlineColor: "",
      deadlineIsSoon: t.deadlineIsSoon || false,
      raw: {} as any,
    }));
  }, [notifTasks]);

  const show = useCallback(() => {
    const lastDismissed = localStorage.getItem(DISMISS_KEY);
    if (lastDismissed) {
      const elapsed = Date.now() - Number(lastDismissed);
      if (elapsed < INTERVAL_MS) return;
    }
    setMessageIdx(Math.floor(Math.random() * messages.length));
    setVisible(true);
  }, [messages.length]);

  const dismiss = useCallback(() => {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  }, []);

  const handleCta = useCallback(
    (msg: MessageItem) => {
      dismiss();
      if (msg.isReport) {
        setShowReport(true);
      } else {
        navigate(msg.link);
      }
    },
    [dismiss, navigate]
  );

  useEffect(() => {
    const initialTimer = setTimeout(show, 30_000);
    const interval = setInterval(show, INTERVAL_MS);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [show]);

  if (!session) return null;

  const msg = messages[messageIdx];
  const label = isClient ? "ISP Parceiro" : "ISP Assistente";

  return (
    <>
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
              <div className="h-[2px] w-full bg-gradient-to-r from-primary via-[hsl(262_83%_58%)] to-transparent opacity-60" />

              <button
                onClick={dismiss}
                className="absolute top-3 right-3 rounded-lg p-1 text-white/20 transition hover:bg-white/[0.06] hover:text-white/50"
              >
                <X className="h-3.5 w-3.5" />
              </button>

              <div className="flex gap-3 p-4">
                {/* Company logo as avatar */}
                <div className="shrink-0">
                  <div
                    className="h-12 w-12 rounded-full border-2 overflow-hidden flex items-center justify-center bg-white/10"
                    style={{ borderColor: "hsl(262 83% 58% / 0.4)" }}
                  >
                    <img
                      src="/resouce/logo.png"
                      alt="ISP Consulte"
                      className="h-9 w-9 object-contain"
                    />
                  </div>
                  <div className="relative -mt-3 ml-8">
                    <div className="h-3.5 w-3.5 rounded-full border-2 bg-emerald-400" style={{ borderColor: "hsl(234 45% 10%)" }} />
                  </div>
                </div>

                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-primary/70 mb-1">
                    {label}
                  </p>
                  <p className="text-[13px] leading-relaxed text-white/75">
                    {msg.text}
                  </p>

                  <button
                    type="button"
                    onClick={() => handleCta(msg)}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white/90 transition hover:bg-white/[0.08]"
                    style={{
                      background: "linear-gradient(135deg, hsl(262 83% 58% / 0.2), hsl(234 89% 64% / 0.15))",
                      border: "1px solid hsl(262 83% 58% / 0.2)",
                    }}
                  >
                    {msg.isReport ? <FileText className="h-3 w-3" /> : null}
                    {msg.cta}
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>

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

      {/* Weekly Report Modal */}
      <WeeklyReportModal
        open={showReport}
        onClose={() => setShowReport(false)}
        tasks={reportTasks}
        userName={session.name}
      />
    </>
  );
}
