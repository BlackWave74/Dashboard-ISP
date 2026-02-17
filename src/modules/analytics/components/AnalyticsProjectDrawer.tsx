import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import type { TaskRecord } from "@/modules/tasks/types";
import type { ProjectAnalytics } from "../types";

type Props = {
  project: ProjectAnalytics | null;
  tasks: TaskRecord[];
  classifyTask: (t: TaskRecord) => "done" | "overdue" | "pending";
  onClose: () => void;
};

const STATUS_CONFIG = {
  overdue: { label: "Atrasadas", icon: AlertTriangle, color: "hsl(0 84% 60%)", bg: "hsl(0 84% 60% / 0.1)" },
  pending: { label: "Em Andamento", icon: Clock, color: "hsl(262 83% 58%)", bg: "hsl(262 83% 58% / 0.1)" },
  done: { label: "Concluídas", icon: CheckCircle2, color: "hsl(160 84% 39%)", bg: "hsl(160 84% 39% / 0.1)" },
} as const;

export default function AnalyticsProjectDrawer({ project, tasks, classifyTask, onClose }: Props) {
  const projectTasks = useMemo(() => {
    if (!project) return { overdue: [], pending: [], done: [] };
    const pid = project.projectId;
    const grouped: Record<"done" | "overdue" | "pending", { title: string; responsible: string; deadline: string }[]> = {
      overdue: [],
      pending: [],
      done: [],
    };
    tasks
      .filter((t) => Number(t.project_id) === pid)
      .forEach((t) => {
        const status = classifyTask(t);
        const raw = t.deadline ?? t.due_date ?? t.dueDate;
        grouped[status].push({
          title: String(t.title ?? t.nome ?? t.name ?? "Sem título"),
          responsible: String(t.responsible_name ?? t.responsavel ?? t.consultant ?? "—"),
          deadline: raw
            ? (() => { const r = String(raw); const m = r.match(/^(\d{4})-(\d{2})-(\d{2})$/); if (m) { return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" }); } return new Date(r).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" }); })()
            : "—",
        });
      });
    return grouped;
  }, [project, tasks, classifyTask]);

  return (
    <AnimatePresence>
      {project && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-white/[0.08]"
            style={{ background: "linear-gradient(165deg, hsl(270 50% 12%), hsl(234 45% 6%))" }}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.06] px-6 py-4" style={{ background: "hsl(270 50% 12% / 0.95)", backdropFilter: "blur(12px)" }}>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.15em] text-[hsl(262_83%_58%)] font-semibold">{project.clientName || "Cliente"}</p>
                <h2 className="truncate text-lg font-bold text-white/90">{project.projectName}</h2>
              </div>
              <button onClick={onClose} className="shrink-0 rounded-lg p-2 text-white/30 transition hover:bg-white/[0.05] hover:text-white/60">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-3 px-6 py-4">
              {(["overdue", "pending", "done"] as const).map((key) => {
                const cfg = STATUS_CONFIG[key];
                const Icon = cfg.icon;
                return (
                  <div key={key} className="rounded-xl border border-white/[0.04] px-3 py-2.5 text-center" style={{ background: cfg.bg }}>
                    <Icon className="mx-auto mb-1 h-4 w-4" style={{ color: cfg.color }} />
                    <p className="text-lg font-bold" style={{ color: cfg.color }}>{projectTasks[key].length}</p>
                    <p className="text-[9px] text-white/35">{cfg.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Task groups */}
            <div className="flex-1 space-y-4 px-6 pb-8">
              {(["overdue", "pending", "done"] as const).map((key) => {
                const cfg = STATUS_CONFIG[key];
                const Icon = cfg.icon;
                const list = projectTasks[key];
                if (list.length === 0) return null;

                return (
                  <div key={key}>
                    <div className="mb-2 flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5" style={{ color: cfg.color }} />
                      <span className="text-xs font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
                      <span className="text-[10px] text-white/25">({list.length})</span>
                    </div>
                    <div className="space-y-1">
                      {list.map((t, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.02 }}
                          className="flex items-center gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-2.5 transition hover:bg-white/[0.04]"
                        >
                          <div className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: cfg.color }} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-white/75">{t.title}</p>
                            <p className="text-[10px] text-white/30">{t.responsible}</p>
                          </div>
                          <span className="shrink-0 text-[10px] font-medium text-white/30">{t.deadline}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {projectTasks.overdue.length === 0 && projectTasks.pending.length === 0 && projectTasks.done.length === 0 && (
                <p className="py-12 text-center text-sm text-white/25">Nenhuma tarefa encontrada neste projeto.</p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
