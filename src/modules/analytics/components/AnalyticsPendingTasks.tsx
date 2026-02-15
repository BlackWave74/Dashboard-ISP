import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Clock, ChevronDown, ChevronUp } from "lucide-react";
import type { TaskRecord } from "@/modules/tasks/types";

type Props = {
  tasks: TaskRecord[];
  classifyTask: (t: TaskRecord) => "done" | "overdue" | "pending";
};

const PAGE_SIZE = 10;

export default function AnalyticsPendingTasks({ tasks, classifyTask }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const pendingTasks = useMemo(() => {
    return tasks
      .filter((t) => {
        const c = classifyTask(t);
        return c === "pending" || c === "overdue";
      })
      .map((t) => ({
        ...t,
        _status: classifyTask(t) as "pending" | "overdue",
        _title: String(t.title ?? t.nome ?? t.name ?? "Sem título"),
        _project: String(t.project_name ?? t.projects?.name ?? t.project ?? t.projeto ?? "—"),
        _responsible: String(t.responsible_name ?? t.responsavel ?? t.consultant ?? "—"),
        _deadline: t.deadline ?? t.due_date ?? t.dueDate,
      }))
      .sort((a, b) => {
        // overdue first
        if (a._status !== b._status) return a._status === "overdue" ? -1 : 1;
        // then by deadline
        const da = a._deadline ? new Date(String(a._deadline)).getTime() : Infinity;
        const db = b._deadline ? new Date(String(b._deadline)).getTime() : Infinity;
        return da - db;
      });
  }, [tasks, classifyTask]);

  const visible = showAll ? pendingTasks : pendingTasks.slice(0, PAGE_SIZE);
  const overdueCount = pendingTasks.filter((t) => t._status === "overdue").length;
  const pendingCount = pendingTasks.filter((t) => t._status === "pending").length;

  if (pendingTasks.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.45 }}
      className="rounded-2xl border border-white/[0.06] overflow-hidden"
      style={{ background: "linear-gradient(145deg, hsl(270 50% 14% / 0.7), hsl(234 45% 10% / 0.5))" }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 transition hover:bg-white/[0.02]"
      >
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold text-white/90">Tarefas Pendentes</h3>
          <div className="flex gap-1.5">
            {overdueCount > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-[hsl(0_84%_60%/0.15)] px-2 py-0.5 text-[10px] font-bold text-[hsl(0_84%_60%)]">
                <AlertTriangle className="h-3 w-3" /> {overdueCount} atrasada{overdueCount > 1 ? "s" : ""}
              </span>
            )}
            <span className="flex items-center gap-1 rounded-full bg-[hsl(262_83%_58%/0.15)] px-2 py-0.5 text-[10px] font-bold text-[hsl(262_83%_58%)]">
              <Clock className="h-3 w-3" /> {pendingCount} em andamento
            </span>
          </div>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-white/30" /> : <ChevronDown className="h-4 w-4 text-white/30" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/[0.04]">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_150px_120px_100px] gap-2 px-5 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/25">
                <span>Tarefa</span>
                <span>Projeto</span>
                <span>Responsável</span>
                <span className="text-right">Prazo</span>
              </div>

              {/* Rows */}
              {visible.map((t, i) => {
                const deadlineStr = t._deadline
                  ? new Date(String(t._deadline)).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
                  : "—";
                return (
                  <motion.div
                    key={`${t.task_id ?? t.id}-${i}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="grid grid-cols-[1fr_150px_120px_100px] gap-2 border-t border-white/[0.03] px-5 py-2.5 text-xs transition hover:bg-white/[0.02]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{
                          background: t._status === "overdue" ? "hsl(0 84% 60%)" : "hsl(262 83% 58%)",
                        }}
                      />
                      <span className="truncate text-white/70">{t._title}</span>
                    </div>
                    <span className="truncate text-white/40">{t._project}</span>
                    <span className="truncate text-white/40">{t._responsible}</span>
                    <span
                      className="text-right font-medium"
                      style={{ color: t._status === "overdue" ? "hsl(0 84% 60%)" : "hsl(262 83% 58% / 0.7)" }}
                    >
                      {deadlineStr}
                    </span>
                  </motion.div>
                );
              })}

              {/* Show more */}
              {pendingTasks.length > PAGE_SIZE && (
                <div className="border-t border-white/[0.03] px-5 py-3 text-center">
                  <button
                    onClick={() => setShowAll((v) => !v)}
                    className="text-[11px] font-semibold text-[hsl(262_83%_58%)] hover:underline transition"
                  >
                    {showAll ? "Mostrar menos" : `Ver todas (${pendingTasks.length})`}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
