import { useState } from "react";
import type { TaskView } from "@/modules/tasks/types";
import { STATUS_LABELS } from "@/modules/tasks/types";
import { formatDurationHHMM } from "@/modules/tasks/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Calendar, User, FolderKanban, Clock, FileText } from "lucide-react";

/* Parse description into structured steps */
function FormattedDescription({ text }: { text?: string }) {
  if (!text || text === "Sem descrição") {
    return <p className="text-xs text-[hsl(var(--task-text-muted))] italic">Sem descrição disponível</p>;
  }

  // Try to detect numbered steps like "1. xxx 2. xxx" or "- xxx"
  const lines = text
    .split(/(?=\d+\.\s)|(?:\n)|(?:(?<=\.\s)(?=-))/g)
    .map((l) => l.trim())
    .filter(Boolean);

  // If it splits into multiple meaningful chunks, render as structured list
  if (lines.length > 1) {
    return (
      <div className="space-y-1.5">
        {lines.map((line, i) => {
          const stepMatch = line.match(/^(\d+)\.\s*(.*)/);
          if (stepMatch) {
            return (
              <div key={i} className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[hsl(var(--task-yellow)/0.12)] text-[9px] font-bold text-[hsl(var(--task-yellow))]">
                  {stepMatch[1]}
                </span>
                <p className="text-xs text-[hsl(var(--task-text))] leading-relaxed">{stepMatch[2]}</p>
              </div>
            );
          }
          const bulletMatch = line.match(/^[-•]\s*(.*)/);
          if (bulletMatch) {
            return (
              <div key={i} className="flex items-start gap-2 pl-1">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--task-purple))]" />
                <p className="text-xs text-[hsl(var(--task-text))] leading-relaxed">{bulletMatch[1]}</p>
              </div>
            );
          }
          // Label-like lines (e.g., "Observações: ...")
          const labelMatch = line.match(/^([A-ZÀ-Ú][a-zà-ú]*(?:\s[a-zà-ú]+)*):\s*(.*)/);
          if (labelMatch) {
            return (
              <div key={i}>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--task-yellow))]">{labelMatch[1]}</span>
                <p className="text-xs text-[hsl(var(--task-text))] leading-relaxed mt-0.5">{labelMatch[2]}</p>
              </div>
            );
          }
          return <p key={i} className="text-xs text-[hsl(var(--task-text))] leading-relaxed">{line}</p>;
        })}
      </div>
    );
  }

  return <p className="text-xs text-[hsl(var(--task-text))] leading-relaxed whitespace-pre-wrap">{text}</p>;
}

type TaskListTableProps = {
  tasks: TaskView[];
};

const statusDot = (status: TaskView["statusKey"]) => {
  switch (status) {
    case "done": return "bg-emerald-400";
    case "overdue": return "bg-rose-400 animate-pulse";
    case "pending": return "bg-[hsl(var(--task-yellow))]";
    default: return "bg-[hsl(var(--task-text-muted))]";
  }
};

const statusPill = (status: TaskView["statusKey"]) => {
  switch (status) {
    case "done": return "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
    case "overdue": return "bg-rose-500/10 text-rose-300 border-rose-500/20";
    case "pending": return "bg-[hsl(var(--task-yellow)/0.1)] text-[hsl(var(--task-yellow))] border-[hsl(var(--task-yellow)/0.2)]";
    default: return "bg-[hsl(var(--task-surface))] text-[hsl(var(--task-text-muted))] border-[hsl(var(--task-border))]";
  }
};

export function TaskListTable({ tasks }: TaskListTableProps) {
  const [expandedId, setExpandedId] = useState<string | number | null>(null);

  if (!tasks.length) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-[hsl(var(--task-border))] bg-[hsl(var(--task-surface))]">
      {/* Header */}
      <div className="hidden sm:grid grid-cols-[1fr_130px_100px_130px_130px_80px] bg-[hsl(var(--task-bg))] border-b border-[hsl(var(--task-border))]">
        {["Tarefa", "Status", "Prazo", "Responsável", "Projeto", "Duração"].map((h) => (
          <div key={h} className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[hsl(var(--task-text-muted)/0.6)]">
            {h}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y divide-[hsl(var(--task-border)/0.5)]">
        {tasks.map((task, index) => {
          const key = task.raw.id ?? task.raw.task_id ?? `${task.title}-${index}`;
          const isExpanded = expandedId === key;
          const isOverdue = task.statusKey === "overdue";

          return (
            <div key={key}>
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.025, duration: 0.2 }}
                onClick={() => setExpandedId(isExpanded ? null : key)}
                className={`group grid grid-cols-1 sm:grid-cols-[1fr_130px_100px_130px_130px_80px] bg-transparent transition-colors cursor-pointer hover:bg-[hsl(var(--task-surface-hover))] ${isOverdue ? "task-shake" : ""}`}
              >
                {/* Task name */}
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${statusDot(task.statusKey)}`} />
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium text-[hsl(var(--task-text))] truncate block">{task.title}</span>
                    <span className="text-[10px] text-[hsl(var(--task-text-muted))] truncate block sm:hidden">
                      {task.project} • {task.consultant}
                    </span>
                  </div>
                  <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-[hsl(var(--task-text-muted))] transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </div>

                {/* Status */}
                <div className="hidden sm:flex items-center px-3 py-3">
                  <span className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-[9px] font-bold whitespace-nowrap ${statusPill(task.statusKey)}`}>
                    {STATUS_LABELS[task.statusKey]?.label ?? "—"}
                  </span>
                </div>

                {/* Deadline */}
                <div className="hidden sm:flex items-center px-3 py-3">
                  <span className={`text-xs ${task.statusKey === "overdue" ? "text-rose-400 font-bold" : task.deadlineIsSoon ? "text-[hsl(var(--task-yellow))]" : "text-[hsl(var(--task-text-muted))]"}`}>
                    {task.deadlineLabel}
                  </span>
                </div>

                {/* Consultant */}
                <div className="hidden sm:flex items-center gap-2 px-3 py-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--task-purple)/0.15)] text-[9px] font-bold text-[hsl(var(--task-purple))]">
                    {task.consultant ? task.consultant.charAt(0).toUpperCase() : "?"}
                  </div>
                  <span className="text-xs text-[hsl(var(--task-text-muted))] truncate">{task.consultant}</span>
                </div>

                {/* Project */}
                <div className="hidden sm:flex items-center px-3 py-3">
                  <span className="text-xs text-[hsl(var(--task-text-muted))] truncate">{task.project}</span>
                </div>

                {/* Duration */}
                <div className="hidden sm:flex items-center px-3 py-3">
                  <span className="text-xs font-mono text-[hsl(var(--task-text-muted))]">
                    {formatDurationHHMM(task.durationSeconds)}
                  </span>
                </div>
              </motion.div>

              {/* Expanded details */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 py-4 bg-[hsl(var(--task-bg))] border-t border-[hsl(var(--task-border)/0.3)]">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 gap-y-5">
                        <div className="flex items-start gap-2.5 sm:col-span-2 lg:col-span-4">
                          <FileText className="h-4 w-4 mt-0.5 shrink-0 text-[hsl(var(--task-yellow))]" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[9px] uppercase tracking-wider text-[hsl(var(--task-text-muted))] mb-1.5">Descrição</p>
                            <FormattedDescription text={task.description} />
                          </div>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <User className="h-4 w-4 mt-0.5 shrink-0 text-[hsl(var(--task-purple))]" />
                          <div>
                            <p className="text-[9px] uppercase tracking-wider text-[hsl(var(--task-text-muted))] mb-0.5">Responsável</p>
                            <p className="text-xs font-medium text-[hsl(var(--task-text))]">{task.consultant}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <FolderKanban className="h-4 w-4 mt-0.5 shrink-0 text-emerald-400" />
                          <div>
                            <p className="text-[9px] uppercase tracking-wider text-[hsl(var(--task-text-muted))] mb-0.5">Projeto</p>
                            <p className="text-xs font-medium text-[hsl(var(--task-text))]">{task.project}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <Calendar className="h-4 w-4 mt-0.5 shrink-0 text-rose-400" />
                          <div>
                            <p className="text-[9px] uppercase tracking-wider text-[hsl(var(--task-text-muted))] mb-0.5">Prazo</p>
                            <p className={`text-xs font-medium ${task.statusKey === "overdue" ? "text-rose-400" : "text-[hsl(var(--task-text))]"}`}>
                              {task.deadlineLabel || "Sem prazo definido"}
                            </p>
                          </div>
                        </div>
                      </div>
                      {task.durationSeconds != null && task.durationSeconds > 0 && (
                        <div className="mt-3 flex items-center gap-2 pt-3 border-t border-[hsl(var(--task-border)/0.3)]">
                          <Clock className="h-3.5 w-3.5 text-[hsl(var(--task-text-muted))]" />
                          <span className="text-[10px] text-[hsl(var(--task-text-muted))]">
                            Tempo registrado: <span className="font-bold text-[hsl(var(--task-text))]">{task.durationLabel}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
