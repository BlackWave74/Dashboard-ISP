import { useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  UserCircle,
  Building2,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  EyeOff,
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  Pencil,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import type { ProjectAnalytics } from "../types";

type Props = {
  projects: ProjectAnalytics[];
  onToggleFavorite: (id: number) => void;
  onProjectClick?: (project: ProjectAnalytics) => void;
  onEditHours?: (project: ProjectAnalytics) => void;
  onEditClientHours?: (clientName: string, projects: ProjectAnalytics[]) => void;
  selectedProject: ProjectAnalytics | null;
  myProjectIds?: Set<number>;
  isAdmin?: boolean;
};

type Filter = "all" | "mine" | "active" | "favorites";

const perfConfig = {
  good: { label: "Bom", icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  neutral: { label: "Regular", icon: Minus, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  bad: { label: "Crítico", icon: TrendingDown, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
};

/** Group projects by client name, always puts no-client last */
function groupByClient(projects: ProjectAnalytics[]): Map<string, ProjectAnalytics[]> {
  const map = new Map<string, ProjectAnalytics[]>();
  projects.forEach((p) => {
    const key = p.clientName?.trim() || "__no_client__";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  });
  return new Map(
    [...map.entries()].sort(([a], [b]) => {
      if (a === "__no_client__") return 1;
      if (b === "__no_client__") return -1;
      return a.localeCompare(b, "pt-BR");
    })
  );
}

/** Compact project row inside a client accordion */
function ProjectRow({
  project,
  onToggleFavorite,
  onClick,
  onEditHours,
  isMine,
  isAdmin,
}: {
  project: ProjectAnalytics;
  onToggleFavorite: (id: number) => void;
  onClick?: (p: ProjectAnalytics) => void;
  onEditHours?: (p: ProjectAnalytics) => void;
  isMine?: boolean;
  isAdmin?: boolean;
}) {
  const perf = perfConfig[project.performance];
  const PerfIcon = perf.icon;
  const total = project.tasksDone + project.tasksPending + project.tasksOverdue;
  const pct = total > 0 ? Math.round((project.tasksDone / total) * 100) : 0;
  const hasHours = project.hoursContracted > 0;
  const hoursPct = hasHours ? Math.min(100, Math.round((project.hoursUsed / project.hoursContracted) * 100)) : 0;
  const hoursBarColor =
    hoursPct >= 90 ? "hsl(0 84% 60%)" :
    hoursPct >= 70 ? "hsl(43 97% 52%)" :
    "hsl(160 84% 39%)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group relative rounded-xl border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30 ${
        isMine
          ? "border-[hsl(262_83%_58%/0.25)] bg-[hsl(262_83%_58%/0.04)]"
          : "border-white/[0.05] bg-white/[0.02]"
      }`}
    >
      {/* Performance accent line */}
      <div
        className="absolute inset-x-0 top-0 h-[1.5px] rounded-t-xl opacity-60 transition-opacity group-hover:opacity-100"
        style={{
          background: project.performance === "good"
            ? "hsl(160 84% 39%)"
            : project.performance === "bad"
            ? "hsl(0 84% 60%)"
            : "hsl(43 97% 52%)",
        }}
      />

      <div className="p-4">
        {/* Top row: name + badges + actions */}
        <div className="flex items-start gap-3">
          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => onClick?.(project)}
          >
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              {isMine && (
                <span className="rounded-full bg-[hsl(262_83%_58%/0.2)] border border-[hsl(262_83%_58%/0.3)] px-1.5 py-0.5 text-[9px] font-bold text-[hsl(262_83%_58%)]">
                  Meu
                </span>
              )}
              {project.isActive && (
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">
                  Ativo
                </span>
              )}
              <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold border ${perf.bg} ${perf.border} ${perf.color}`}>
                <PerfIcon className="h-2.5 w-2.5" />
                {perf.label}
              </span>
            </div>
            <h4 className="truncate text-sm font-semibold text-white/85 group-hover:text-white/95 transition-colors">
              {project.projectName}
            </h4>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {isAdmin && (
              <button
                onClick={(e) => { e.stopPropagation(); onEditHours?.(project); }}
                className="rounded-lg p-1.5 text-white/15 transition hover:text-[hsl(262_83%_58%)] hover:bg-[hsl(262_83%_58%/0.1)]"
                title="Editar horas contratadas"
              >
                <Pencil className="h-3 w-3" />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(project.projectId); }}
              className="rounded-lg p-1.5 transition hover:scale-110"
            >
              <Star
                className={`h-3.5 w-3.5 transition ${
                  project.isFavorite ? "fill-amber-400 text-amber-400" : "text-white/15 hover:text-amber-400/60"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Stats + Hours row */}
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          {/* Task stats compact */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              <span className="text-xs font-bold text-emerald-400">{project.tasksDone}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-[hsl(262_83%_58%)]" />
              <span className="text-xs font-bold text-[hsl(262_83%_58%)]">{project.tasksPending}</span>
            </div>
            {project.tasksOverdue > 0 && (
              <div className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-red-400" />
                <span className="text-xs font-bold text-red-400">{project.tasksOverdue}</span>
              </div>
            )}
          </div>

          <div className="h-3 w-px bg-white/[0.08]" />

          {/* Completion bar */}
          <div className="flex flex-1 items-center gap-2 min-w-[100px]">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: "linear-gradient(to right, hsl(262 83% 58%), hsl(234 89% 64%))",
                }}
              />
            </div>
            <span className="text-[10px] font-bold text-white/40 shrink-0">{pct}%</span>
          </div>

          <div className="h-3 w-px bg-white/[0.08]" />

          {/* Hours */}
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-white/25" />
            <span className="text-xs font-semibold text-white/60">{Math.round(project.hoursUsed)}h</span>
            {hasHours && (
              <>
                <span className="text-[10px] text-white/25">/ {project.hoursContracted}h</span>
                <div className="h-1.5 w-14 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${hoursPct}%`, background: hoursBarColor }}
                  />
                </div>
              </>
            )}
            {!hasHours && isAdmin && (
              <button
                onClick={(e) => { e.stopPropagation(); onEditHours?.(project); }}
                className="text-[10px] text-white/20 hover:text-[hsl(262_83%_58%)] transition-colors"
              >
                + definir
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function AnalyticsProjectList({
  projects,
  onToggleFavorite,
  onProjectClick,
  onEditHours,
  onEditClientHours,
  selectedProject,
  myProjectIds,
  isAdmin,
}: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [collapsedClients, setCollapsedClients] = useState<Set<string>>(new Set());
  const [showNoClient, setShowNoClient] = useState(false);

  const myCount = useMemo(
    () => (myProjectIds ? projects.filter((p) => myProjectIds.has(p.projectId)).length : 0),
    [projects, myProjectIds]
  );

  const filtered = useMemo(() => {
    let list = selectedProject
      ? projects.filter((p) => p.projectId === selectedProject.projectId)
      : projects;
    if (filter === "active") list = list.filter((p) => p.isActive);
    if (filter === "favorites") list = list.filter((p) => p.isFavorite);
    if (filter === "mine" && myProjectIds) list = list.filter((p) => myProjectIds.has(p.projectId));
    return [...list].sort((a, b) => {
      if (filter === "all" && myProjectIds) {
        const aIsMine = myProjectIds.has(a.projectId);
        const bIsMine = myProjectIds.has(b.projectId);
        if (aIsMine !== bIsMine) return aIsMine ? -1 : 1;
      }
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
      return b.hoursUsed - a.hoursUsed;
    });
  }, [projects, filter, selectedProject, myProjectIds]);

  const grouped = useMemo(() => groupByClient(filtered), [filtered]);

  // Separate clients with/without name
  const namedClients = useMemo(() =>
    [...grouped.entries()].filter(([k]) => k !== "__no_client__"),
    [grouped]
  );
  const noClientProjects = useMemo(() =>
    grouped.get("__no_client__") ?? [],
    [grouped]
  );

  const namedCount = namedClients.reduce((s, [, ps]) => s + ps.length, 0);

  const filtersConfig: { key: Filter; label: string; count: number; icon?: React.ReactNode }[] = [
    { key: "all", label: "Todos", count: projects.length },
    ...(myProjectIds && myCount > 0
      ? [{ key: "mine" as Filter, label: "Meus Projetos", count: myCount, icon: <UserCircle className="h-3 w-3" /> }]
      : []),
    { key: "active", label: "Ativos", count: projects.filter((p) => p.isActive).length },
    { key: "favorites", label: "Favoritos", count: projects.filter((p) => p.isFavorite).length },
  ];

  const toggleCollapse = (clientKey: string) => {
    setCollapsedClients((prev) => {
      const next = new Set(prev);
      if (next.has(clientKey)) next.delete(clientKey);
      else next.add(clientKey);
      return next;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="space-y-5"
    >
      {/* Header + filter pills */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-white/90">Projetos</h3>
          <span className="rounded-full bg-white/[0.05] border border-white/[0.06] px-2 py-0.5 text-[10px] text-white/40 font-semibold">
            {namedCount}
          </span>
          {noClientProjects.length > 0 && (
            <button
              onClick={() => setShowNoClient((v) => !v)}
              className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold transition-all ${
                showNoClient
                  ? "border-white/[0.12] bg-white/[0.06] text-white/50"
                  : "border-white/[0.06] text-white/25 hover:text-white/40"
              }`}
              title={showNoClient ? "Ocultar projetos sem cliente" : "Mostrar projetos sem cliente"}
            >
              {showNoClient ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              +{noClientProjects.length} sem cliente
            </button>
          )}
        </div>
        <div className="flex gap-1 rounded-xl border border-white/[0.06] bg-white/[0.03] p-1">
          {filtersConfig.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                filter === f.key
                  ? "bg-gradient-to-r from-[hsl(262_83%_58%)] to-[hsl(234_89%_64%)] text-white shadow-lg shadow-[hsl(262_83%_58%/0.25)]"
                  : "text-white/25 hover:text-white/50"
              }`}
            >
              {f.icon}
              {f.label}
              <span className="ml-0.5 opacity-50">{f.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* No projects at all */}
      {filtered.length === 0 && (
        <p className="py-12 text-center text-sm text-white/25">
          Nenhum projeto encontrado.
        </p>
      )}

      {/* Named client accordions */}
      <div className="space-y-3">
        {namedClients.map(([clientKey, clientProjects]) => {
          const isCollapsed = collapsedClients.has(clientKey);
          const totalHours = clientProjects.reduce((s, p) => s + p.hoursUsed, 0);
          const totalContracted = clientProjects.reduce((s, p) => s + (p.hoursContracted || 0), 0);
          const activeCount = clientProjects.filter((p) => p.isActive).length;
          const overdueCount = clientProjects.reduce((s, p) => s + p.tasksOverdue, 0);
          const hoursPct = totalContracted > 0 ? Math.min(100, Math.round((totalHours / totalContracted) * 100)) : 0;
          const hoursBarColor =
            hoursPct >= 90 ? "hsl(0 84% 60%)" :
            hoursPct >= 70 ? "hsl(43 97% 52%)" :
            "hsl(160 84% 39%)";

          return (
            <div key={clientKey} className="overflow-hidden rounded-2xl border border-white/[0.06]">
              {/* Client header — clickable accordion toggle */}
              <button
                onClick={() => toggleCollapse(clientKey)}
                className="group flex w-full items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.02]"
                style={{ background: "linear-gradient(to right, hsl(262 83% 58% / 0.05), transparent)" }}
              >
                {/* Icon */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[hsl(262_83%_58%/0.2)] bg-[hsl(262_83%_58%/0.08)]">
                  <Building2 className="h-4 w-4 text-[hsl(262_83%_58%)]" />
                </div>

                {/* Client info */}
                <div className="flex flex-1 flex-col items-start gap-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-white/90">{clientKey}</span>
                    <span className="rounded-full bg-white/[0.06] border border-white/[0.05] px-2 py-0.5 text-[10px] text-white/35 font-semibold">
                      {clientProjects.length} projeto{clientProjects.length !== 1 ? "s" : ""}
                    </span>
                    {activeCount > 0 && (
                      <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-400 font-semibold">
                        {activeCount} ativo{activeCount !== 1 ? "s" : ""}
                      </span>
                    )}
                    {overdueCount > 0 && (
                      <span className="rounded-full bg-red-500/10 border border-red-500/20 px-2 py-0.5 text-[10px] text-red-400 font-semibold">
                        {overdueCount} atrasad{overdueCount !== 1 ? "as" : "a"}
                      </span>
                    )}
                  </div>

                  {/* Hours progress */}
                  <div className="flex w-full max-w-[280px] items-center gap-2">
                    <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                      {totalContracted > 0 && (
                        <div
                          className="absolute left-0 top-0 h-full rounded-full transition-all duration-700"
                          style={{ width: `${hoursPct}%`, background: hoursBarColor }}
                        />
                      )}
                    </div>
                    <span className="shrink-0 text-[10px] font-semibold text-white/30">
                      {Math.round(totalHours)}h
                      {totalContracted > 0 && ` / ${Math.round(totalContracted)}h`}
                    </span>
                  </div>
                </div>

                {/* Right actions */}
                <div className="flex shrink-0 items-center gap-2">
                  {isAdmin && onEditClientHours && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onEditClientHours(clientKey, clientProjects); }}
                      className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1.5 text-[10px] font-semibold text-white/30 transition hover:border-[hsl(262_83%_58%/0.3)] hover:text-[hsl(262_83%_58%)] hover:bg-[hsl(262_83%_58%/0.05)]"
                      title="Definir horas para todos os projetos"
                    >
                      <Clock className="h-3 w-3" />
                      Horas
                    </button>
                  )}
                  {isCollapsed
                    ? <ChevronDown className="h-4 w-4 text-white/25 transition group-hover:text-white/50" />
                    : <ChevronUp className="h-4 w-4 text-white/25 transition group-hover:text-white/50" />
                  }
                </div>
              </button>

              {/* Project rows */}
              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2 border-t border-white/[0.04] p-4">
                      {clientProjects.map((p) => (
                        <ProjectRow
                          key={p.projectId}
                          project={p}
                          onToggleFavorite={onToggleFavorite}
                          onClick={onProjectClick}
                          onEditHours={onEditHours}
                          isMine={myProjectIds?.has(p.projectId)}
                          isAdmin={isAdmin}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* No-client section — hidden by default */}
      {noClientProjects.length > 0 && showNoClient && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-2xl border border-dashed border-white/[0.08]"
        >
          <div className="flex items-center gap-3 border-b border-white/[0.05] px-5 py-3">
            <Building2 className="h-4 w-4 text-white/25" />
            <span className="text-sm font-semibold italic text-white/35">
              Projetos sem cliente associado
            </span>
            <span className="rounded-full bg-white/[0.04] border border-white/[0.05] px-2 py-0.5 text-[10px] text-white/25 font-semibold">
              {noClientProjects.length}
            </span>
          </div>
          <div className="space-y-2 p-4">
            {noClientProjects.map((p) => (
              <ProjectRow
                key={p.projectId}
                project={p}
                onToggleFavorite={onToggleFavorite}
                onClick={onProjectClick}
                onEditHours={onEditHours}
                isMine={myProjectIds?.has(p.projectId)}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
