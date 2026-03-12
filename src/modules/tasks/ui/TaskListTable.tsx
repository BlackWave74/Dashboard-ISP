import { useState } from "react";
import type { TaskView, ElapsedTimeRecord } from "@/modules/tasks/types";
import { STATUS_LABELS } from "@/modules/tasks/types";
import { formatDurationHHMM, durationColorClass } from "@/modules/tasks/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Calendar, User, FolderKanban, Clock, FileText } from "lucide-react";
import { FormattedDescription } from "./FormattedDescription";
import { TimeTrackingSection } from "./TimeTrackingSection";

type TaskListTableProps = {
  tasks: TaskView[];
  timeEntriesByTaskId?: Record<string, ElapsedTimeRecord[]>;
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

/** Mini bar showing duration intensity (max 8h as 100%) */
function DurationBar({ seconds }: { seconds?: number }) {
  if (!seconds || seconds <= 0) return null;
  const hours = seconds / 3600;
  const pct = Math.min(100, (hours / 8) * 100);
  const color = durationColorClass(seconds);
  return (
    <div className="h-1 w-full rounded-full bg-[hsl(var(--task-border))] overflow-hidden mt-1">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="h-full rounded-full"
        style={{ background: color.accent }}
      />
    </div>
  );
}

export function TaskListTable({ tasks, timeEntriesByTaskId }: TaskListTableProps) {
  const [expandedId, setExpandedId] = useState<string | number | null>(null);

  if (!tasks.length) return null;

  return (
    <div className="overflow-x-auto rounded-2xl border border-[hsl(var(--task-border))] bg-[hsl(var(--task-surface))]" style={{ minWidth: 0 }}>
      {/* Header */}
      <div className="hidden md:grid lg:hidden grid-cols-[minmax(120px,1.2fr)_80px_90px_100px] bg-[hsl(var(--task-bg))] border-b border-[hsl(var(--task-border))]">
        <div className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white">Tarefa</div>
        {["Status", "Prazo", "Duração"].map((h) => (
          <div key={h} className="px-2 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white text-center">{h}</div>
        ))}
      </div>
      <div className="hidden lg:grid grid-cols-[minmax(140px,1.2fr)_90px_110px_170px_minmax(160px,1fr)_120px] bg-[hsl(var(--task-bg))] border-b border-[hsl(var(--task-border))]">
        <div className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white">Tarefa</div>
        {["Status", "Prazo"].map((h) => (
          <div key={h} className="px-2 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white text-center">{h}</div>
        ))}
        {["Responsável", "Projeto"].map((h) => (
          <div key={h} className="px-2 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white text-left">{h}</div>
        ))}
        <div className="px-2 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white text-center">Duração</div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-[hsl(var(--task-border)/0.5)]">
        {tasks.map((task, index) => {
          const key = task.raw.id ?? task.raw.task_id ?? `${task.title}-${index}`;
          const isExpanded = expandedId === key;
          const isOverdue = task.statusKey === "overdue";
          const taskId = task.raw.id ?? task.raw.task_id;
          const entries = taskId && timeEntriesByTaskId ? timeEntriesByTaskId[String(taskId)] : undefined;
          const durColor = durationColorClass(task.durationSeconds);
          const durationText = formatDurationHHMM(task.durationSeconds);

          return (
            <div key={key}>
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.025, duration: 0.2 }}
                onClick={() => setExpandedId(isExpanded ? null : key)}
                className={`group grid grid-cols-1 md:grid-cols-[minmax(120px,1.2fr)_80px_90px_100px] lg:grid-cols-[minmax(140px,1.2fr)_90px_110px_170px_minmax(160px,1fr)_120px] bg-transparent transition-colors cursor-pointer hover:bg-[hsl(var(--task-surface-hover))] ${isOverdue ? "task-shake" : ""}`}
              >
                {/* Task name */}
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${statusDot(task.statusKey)}`} />
                  <div className="min-w-0 flex-1">
                    <span className="text-[13px] font-semibold text-[hsl(var(--task-text))] truncate block">{task.title}</span>
                    <span className="text-[10px] text-[hsl(var(--task-text-muted))] truncate block lg:hidden">
                      {task.project} • {task.consultant}
                    </span>
                  </div>
                  <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-[hsl(var(--task-text-muted))] transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </div>

                {/* Status */}
                <div className="hidden md:flex items-center justify-center px-3 py-3">
                  <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[9px] font-bold whitespace-nowrap ${statusPill(task.statusKey)}`}>
                    {STATUS_LABELS[task.statusKey]?.label ?? "—"}
                  </span>
                </div>

                {/* Deadline */}
                <div className="hidden md:flex items-center justify-center px-3 py-3">
                  <span className={`text-[13px] ${task.statusKey === "overdue" ? "text-rose-400 font-bold" : task.deadlineIsSoon ? "text-[hsl(var(--task-yellow))]" : "text-[hsl(var(--task-text-muted))]"}`}>
                    {task.deadlineLabel}
                  </span>
                </div>

                {/* Consultant - hidden on tablet, visible on lg+ */}
                <div className="hidden lg:flex items-center gap-2 px-2 py-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--task-purple)/0.15)] text-[9px] font-bold text-[hsl(var(--task-purple))]">
                    {task.consultant ? task.consultant.charAt(0).toUpperCase() : "?"}
                  </div>
                  <span className="text-[13px] text-white truncate">{task.consultant}</span>
                </div>

                {/* Project - hidden on tablet, visible on lg+ */}
                <div className="hidden lg:flex items-center px-2 py-3">
                  <span className="text-[13px] text-white truncate">{task.project}</span>
                </div>

                {/* Duration - color coded with mini bar */}
                <div className="hidden md:flex items-center justify-center px-3 py-3">
                  {durationText ? (
                    <div className="min-w-[80px]">
                      <div className="flex items-center gap-1.5">
                        <Clock className={`h-3 w-3 shrink-0 ${durColor.text}`} />
                        <span className={`text-[13px] font-bold font-mono whitespace-nowrap ${durColor.text}`}>
                          {durationText}
                        </span>
                      </div>
                      <DurationBar seconds={task.durationSeconds} />
                    </div>
                  ) : (
                    <span className="text-[11px] text-[hsl(var(--task-text-muted))] italic">Sem registro</span>
                  )}
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
                    <div className="px-4 sm:px-6 py-4 bg-[hsl(var(--task-bg))] border-t border-[hsl(var(--task-border)/0.3)]">
                      {/* Meta info grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        <div className="rounded-lg border border-[hsl(var(--task-border))] bg-[hsl(var(--task-surface))] p-2.5">
                          <div className="flex items-center gap-1.5 mb-1">
                            <User className="h-3 w-3 text-[hsl(var(--task-purple))]" />
                            <span className="text-[9px] uppercase tracking-wider text-[hsl(var(--task-text-muted))]">Responsável</span>
                          </div>
                          <p className="text-xs font-semibold text-[hsl(var(--task-text))]">{task.consultant}</p>
                        </div>
                        <div className="rounded-lg border border-[hsl(var(--task-border))] bg-[hsl(var(--task-surface))] p-2.5">
                          <div className="flex items-center gap-1.5 mb-1">
                            <FolderKanban className="h-3 w-3 text-emerald-400" />
                            <span className="text-[9px] uppercase tracking-wider text-[hsl(var(--task-text-muted))]">Projeto</span>
                          </div>
                          <p className="text-xs font-semibold text-[hsl(var(--task-text))]">{task.project}</p>
                        </div>
                        <div className="rounded-lg border border-[hsl(var(--task-border))] bg-[hsl(var(--task-surface))] p-2.5">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Calendar className="h-3 w-3 text-rose-400" />
                            <span className="text-[9px] uppercase tracking-wider text-[hsl(var(--task-text-muted))]">Prazo</span>
                          </div>
                          <p className={`text-xs font-semibold ${task.statusKey === "overdue" ? "text-rose-400" : "text-[hsl(var(--task-text))]"}`}>
                            {task.deadlineLabel || "Sem prazo"}
                          </p>
                        </div>
                        {task.durationSeconds != null && task.durationSeconds > 0 && (
                          <div className={`rounded-lg border ${durColor.border} ${durColor.bg} p-2.5`}>
                            <div className="flex items-center gap-1.5 mb-1">
                              <Clock className={`h-3 w-3 ${durColor.text}`} />
                              <span className="text-[9px] uppercase tracking-wider text-[hsl(var(--task-text-muted))]">Tempo Total</span>
                            </div>
                            <p className={`text-xs font-bold font-mono ${durColor.text}`}>{formatDurationHHMM(task.durationSeconds)}</p>
                            <DurationBar seconds={task.durationSeconds} />
                          </div>
                        )}
                      </div>

                      {/* Time Tracking Section */}
                      {entries && entries.length > 0 && (
                        <TimeTrackingSection entries={entries} totalSeconds={task.durationSeconds} />
                      )}

                      {/* Description */}
                      <div className="rounded-lg border border-[hsl(var(--task-border))] bg-[hsl(var(--task-surface))] p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <FileText className="h-3 w-3 text-[hsl(var(--task-yellow))]" />
                          <span className="text-[9px] uppercase tracking-wider text-[hsl(var(--task-text-muted))]">Descrição</span>
                        </div>
                        <FormattedDescription text={task.description} />
                      </div>
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
