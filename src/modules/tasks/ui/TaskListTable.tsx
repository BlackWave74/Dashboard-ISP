import type { TaskView } from "@/modules/tasks/types";
import { STATUS_LABELS } from "@/modules/tasks/types";
import { formatDurationHHMM } from "@/modules/tasks/utils";
import { motion } from "framer-motion";

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
  if (!tasks.length) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-[hsl(var(--task-border))] bg-[hsl(var(--task-surface))]">
      {/* Header */}
      <div className="hidden sm:grid grid-cols-[1fr_90px_100px_130px_130px_80px] bg-[hsl(var(--task-bg))] border-b border-[hsl(var(--task-border))]">
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
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.025, duration: 0.2 }}
              className="group grid grid-cols-1 sm:grid-cols-[1fr_90px_100px_130px_130px_80px] bg-transparent transition-colors hover:bg-[hsl(var(--task-surface-hover))]"
            >
              {/* Task name */}
              <div className="flex items-center gap-3 px-4 py-3.5">
                <span className={`h-2 w-2 shrink-0 rounded-full ${statusDot(task.statusKey)}`} />
                <div className="min-w-0">
                  <span className="text-sm font-medium text-[hsl(var(--task-text))] truncate block">{task.title}</span>
                  <span className="text-[10px] text-[hsl(var(--task-text-muted))] truncate block sm:hidden">
                    {task.project} • {task.consultant}
                  </span>
                </div>
              </div>

              {/* Status */}
              <div className="hidden sm:flex items-center px-3 py-3">
                <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[9px] font-bold ${statusPill(task.statusKey)}`}>
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
          );
        })}
      </div>
    </div>
  );
}
