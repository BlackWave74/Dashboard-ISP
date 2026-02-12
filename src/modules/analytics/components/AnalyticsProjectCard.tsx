import { Star, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion } from "framer-motion";
import type { ProjectAnalytics } from "../types";

type Props = {
  project: ProjectAnalytics;
  onToggleFavorite: (id: number) => void;
};

const perfConfig = {
  good: { label: "Bom", icon: TrendingUp, className: "ana-perf-good" },
  neutral: { label: "Regular", icon: Minus, className: "ana-perf-neutral" },
  bad: { label: "Crítico", icon: TrendingDown, className: "ana-perf-bad" },
};

export default function AnalyticsProjectCard({ project, onToggleFavorite }: Props) {
  const perf = perfConfig[project.performance];
  const PerfIcon = perf.icon;
  const totalTasks = project.tasksDone + project.tasksPending + project.tasksOverdue;
  const completionPct = totalTasks > 0 ? Math.round((project.tasksDone / totalTasks) * 100) : 0;
  const hoursUsedPct =
    project.hoursContracted > 0
      ? Math.min(100, Math.round((project.hoursUsed / project.hoursContracted) * 100))
      : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="ana-card p-4 space-y-3"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-[hsl(var(--ana-text))]">{project.projectName}</h3>
            {project.isActive && (
              <span className="shrink-0 rounded-full bg-[hsl(var(--ana-green)/0.15)] px-2 py-0.5 text-[10px] font-bold text-[hsl(var(--ana-green))]">
                Ativo
              </span>
            )}
          </div>
          <p className="truncate text-xs text-[hsl(var(--ana-text-muted))]">{project.clientName}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold ${perf.className}`}>
            <PerfIcon className="h-3 w-3" />
            {perf.label}
          </span>
          <button
            onClick={() => onToggleFavorite(project.projectId)}
            className="transition hover:scale-110"
          >
            <Star
              className={`h-4 w-4 transition ${
                project.isFavorite
                  ? "fill-[hsl(var(--ana-yellow))] text-[hsl(var(--ana-yellow))] ana-star-active"
                  : "text-[hsl(var(--ana-text-muted)/0.4)] hover:text-[hsl(var(--ana-yellow)/0.7)]"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Task summary */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-[hsl(var(--ana-green)/0.08)] p-2">
          <p className="text-lg font-bold text-[hsl(var(--ana-green))]">{project.tasksDone}</p>
          <p className="text-[10px] text-[hsl(var(--ana-text-muted))]">Concluídas</p>
        </div>
        <div className="rounded-lg bg-[hsl(var(--ana-amber)/0.08)] p-2">
          <p className="text-lg font-bold text-[hsl(var(--ana-amber))]">{project.tasksPending}</p>
          <p className="text-[10px] text-[hsl(var(--ana-text-muted))]">Andamento</p>
        </div>
        <div className="rounded-lg bg-[hsl(var(--ana-red)/0.08)] p-2">
          <p className="text-lg font-bold text-[hsl(var(--ana-red))]">{project.tasksOverdue}</p>
          <p className="text-[10px] text-[hsl(var(--ana-text-muted))]">Atrasadas</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px]">
          <span className="text-[hsl(var(--ana-text-muted))]">Conclusão</span>
          <span className="font-semibold text-[hsl(var(--ana-text))]">{completionPct}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[hsl(var(--ana-border))]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${completionPct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--ana-indigo))] to-[hsl(var(--ana-purple))]"
          />
        </div>
      </div>

      {/* Hours bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px]">
          <span className="text-[hsl(var(--ana-text-muted))]">Horas</span>
          <span className="font-semibold text-[hsl(var(--ana-text))]">
            {Math.round(project.hoursUsed)}h
            {project.hoursContracted > 0 && ` / ${project.hoursContracted}h`}
          </span>
        </div>
        {hoursUsedPct !== null && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[hsl(var(--ana-border))]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${hoursUsedPct}%` }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
              className={`h-full rounded-full ${
                hoursUsedPct > 90
                  ? "bg-gradient-to-r from-[hsl(var(--ana-red))] to-[hsl(var(--ana-amber))]"
                  : "bg-gradient-to-r from-[hsl(var(--ana-green))] to-[hsl(var(--ana-indigo))]"
              }`}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}
