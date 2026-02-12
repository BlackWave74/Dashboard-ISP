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
    case "overdue": return "bg-rose-400";
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
    <div className="overflow-hidden rounded-xl border border-[hsl(var(--task-border))]">
      {/* Header */}
      <div className="grid grid-cols-[1fr_100px_110px_140px_140px_100px] gap-px bg-[hsl(var(--task-border))]">
        {["Tarefa", "Status", "Prazo", "Responsável", "Projeto", "Duração"].map((h) => (
          <div key={h} className="bg-[hsl(var(--task-surface))] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-[hsl(var(--task-text-muted))]">
            {h}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y divide-[hsl(var(--task-border))]">
        {tasks.map((task, index) => {
          const key = task.raw.id ?? task.raw.task_id ?? `${task.title}-${index}`;
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03, duration: 0.25 }}
              className="group grid grid-cols-[1fr_100px_110px_140px_140px_100px] bg-[hsl(var(--task-bg))] transition hover:bg-[hsl(var(--task-surface-hover))]"
            >
              {/* Task name */}
              <div className="flex items-center gap-3 px-4 py-3">
                <span className={`h-2 w-2 shrink-0 rounded-full ${statusDot(task.statusKey)}`} />
                <span className="text-sm font-medium text-[hsl(var(--task-text))] truncate">{task.title}</span>
              </div>

              {/* Status */}
              <div className="flex items-center px-3 py-3">
                <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold ${statusPill(task.statusKey)}`}>
                  {STATUS_LABELS[task.statusKey]?.label ?? "—"}
                </span>
              </div>

              {/* Deadline */}
              <div className="flex items-center px-3 py-3">
                <span className={`text-xs ${task.statusKey === "overdue" ? "text-rose-400 font-semibold" : task.deadlineIsSoon ? "text-[hsl(var(--task-yellow))]" : "text-[hsl(var(--task-text-muted))]"}`}>
                  {task.deadlineLabel}
                </span>
              </div>

              {/* Consultant */}
              <div className="flex items-center gap-2 px-3 py-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--task-purple)/0.2)] text-[10px] font-bold text-[hsl(var(--task-purple))]">
                  {task.consultant ? task.consultant.charAt(0).toUpperCase() : "?"}
                </div>
                <span className="text-xs text-[hsl(var(--task-text-muted))] truncate">{task.consultant}</span>
              </div>

              {/* Project */}
              <div className="flex items-center px-3 py-3">
                <span className="text-xs text-[hsl(var(--task-text-muted))] truncate">{task.project}</span>
              </div>

              {/* Duration */}
              <div className="flex items-center px-3 py-3">
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
