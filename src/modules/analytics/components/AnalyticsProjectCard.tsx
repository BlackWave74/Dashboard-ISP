import { Star, TrendingUp, TrendingDown, Minus, Clock } from "lucide-react";
import type { ProjectAnalytics } from "../types";

type Props = {
  project: ProjectAnalytics;
  onToggleFavorite: (id: number) => void;
};

const perfConfig = {
  good: { label: "Bom", icon: TrendingUp, bg: "bg-emerald-500/15", text: "text-emerald-400" },
  neutral: { label: "Regular", icon: Minus, bg: "bg-amber-500/15", text: "text-amber-400" },
  bad: { label: "Crítico", icon: TrendingDown, bg: "bg-destructive/15", text: "text-destructive" },
};

export default function AnalyticsProjectCard({ project, onToggleFavorite }: Props) {
  const perf = perfConfig[project.performance];
  const PerfIcon = perf.icon;
  const totalTasks = project.tasksDone + project.tasksPending + project.tasksOverdue;
  const completionPct = totalTasks > 0 ? Math.round((project.tasksDone / totalTasks) * 100) : 0;

  return (
    <div
      className="group relative overflow-hidden rounded-xl border border-border/50 bg-card/80 p-5 transition-all hover:border-border hover:-translate-y-0.5 hover:shadow-[0_20px_50px_-30px_rgba(0,0,0,0.7)]"
      style={{ opacity: 0, animation: "fadeSlideUp 0.5s ease-out forwards" }}
    >
      {/* Top accent */}
      <div
        className={`absolute inset-x-0 top-0 h-[2px] ${
          project.performance === "good"
            ? "bg-gradient-to-r from-emerald-500 to-primary"
            : project.performance === "bad"
            ? "bg-gradient-to-r from-destructive to-amber-500"
            : "bg-gradient-to-r from-amber-500 to-primary"
        } opacity-50 transition-opacity group-hover:opacity-100`}
      />

      {/* Corner glow */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-primary/5 blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      {/* Header */}
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-[0.15em] text-primary/70">{project.clientName}</p>
          <h4 className="mt-0.5 truncate text-sm font-bold text-foreground">{project.projectName}</h4>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {project.isActive && (
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
              Ativo
            </span>
          )}
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${perf.bg} ${perf.text}`}>
            <PerfIcon className="h-3 w-3" />
            {perf.label}
          </span>
          <button onClick={() => onToggleFavorite(project.projectId)} className="transition hover:scale-110">
            <Star
              className={`h-4 w-4 transition ${
                project.isFavorite
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/30 hover:text-amber-400/60"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Task stats grid */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-center">
          <p className="text-lg font-bold text-emerald-400">{project.tasksDone}</p>
          <p className="text-[10px] text-muted-foreground">Concluídas</p>
        </div>
        <div className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-center">
          <p className="text-lg font-bold text-amber-400">{project.tasksPending}</p>
          <p className="text-[10px] text-muted-foreground">Andamento</p>
        </div>
        <div className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-center">
          <p className="text-lg font-bold text-destructive">{project.tasksOverdue}</p>
          <p className="text-[10px] text-muted-foreground">Atrasadas</p>
        </div>
      </div>

      {/* Progress */}
      <div className="mt-3 space-y-1">
        <div className="flex justify-between text-[10px]">
          <span className="text-muted-foreground">Progresso</span>
          <span className="font-bold text-foreground">{completionPct}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-violet-500 transition-all duration-700 ease-out"
            style={{ width: `${completionPct}%` }}
          />
        </div>
      </div>

      {/* Hours */}
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Horas utilizadas</span>
        <span className="ml-auto text-sm font-bold text-foreground">{Math.round(project.hoursUsed)}h</span>
        {project.hoursContracted > 0 && (
          <span className="text-xs text-muted-foreground">/ {project.hoursContracted}h</span>
        )}
      </div>
    </div>
  );
}
