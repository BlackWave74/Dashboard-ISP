import { useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  UserCircle,
  Building2,
  ChevronDown,
  ChevronUp,
  Clock,
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
  good:    { label: "Bom",     icon: TrendingUp,   color: "text-emerald-400", bg: "bg-emerald-500/10",  border: "border-emerald-500/20"  },
  neutral: { label: "Regular", icon: Minus,         color: "text-amber-400",   bg: "bg-amber-500/10",    border: "border-amber-500/20"    },
  bad:     { label: "Crítico", icon: TrendingDown,  color: "text-red-400",     bg: "bg-red-500/10",      border: "border-red-500/20"      },
};

/**
 * Extracts a "display client" from the project.
 *
 * Priority:
 *  1. If `clientName` is a real non-empty string → use it as group key.
 *  2. If project name contains " - " or " <> " → split and use left part as client label.
 *  3. Fallback → use "Projeto" as client label (not the full project name).
 *
 * This prevents names like "Info Online <> Consultoria Comercial" from
 * being treated as a standalone client instead of a sub-project of "Info Online".
 */
function resolveDisplayClient(p: ProjectAnalytics): { clientLabel: string; projectLabel: string } {
  const hasClient = p.clientName?.trim();

  if (hasClient) {
    return { clientLabel: hasClient, projectLabel: p.projectName };
  }

  // Try separators in priority order: " - " then " <> "
  const SEPARATORS = [" - ", " <> ", " <> "];
  for (const sep of SEPARATORS) {
    const idx = p.projectName.indexOf(sep);
    if (idx > 0) {
      return {
        clientLabel: p.projectName.slice(0, idx).trim(),
        projectLabel: p.projectName.slice(idx + sep.length).trim() || p.projectName,
      };
    }
  }

  // No separator and no clientName → group under "Projeto" instead of using full name
  return { clientLabel: "Projeto", projectLabel: p.projectName };
}

/** Group projects by resolved client label, sorted alphabetically. */
function groupByResolvedClient(
  projects: ProjectAnalytics[]
): Map<string, { projects: ProjectAnalytics[]; labelsByProject: Map<number, string> }> {
  const map = new Map<string, { projects: ProjectAnalytics[]; labelsByProject: Map<number, string> }>();

  projects.forEach((p) => {
    const { clientLabel, projectLabel } = resolveDisplayClient(p);
    if (!map.has(clientLabel)) {
      map.set(clientLabel, { projects: [], labelsByProject: new Map() });
    }
    const entry = map.get(clientLabel)!;
    entry.projects.push(p);
    entry.labelsByProject.set(p.projectId, projectLabel);
  });

  // Sort groups: named clients alphabetically first, "Projeto" fallback group last
  return new Map(
    [...map.entries()].sort(([a], [b]) => {
      if (a === "Projeto") return 1;
      if (b === "Projeto") return -1;
      return a.localeCompare(b, "pt-BR");
    })
  );
}

/** Compact project row inside a client accordion */
function ProjectRow({
  project,
  projectLabel,
  onToggleFavorite,
  onClick,
  onEditHours,
  isMine,
  isAdmin,
}: {
  project: ProjectAnalytics;
  projectLabel: string;
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
  const hoursRemaining = hasHours ? project.hoursContracted - project.hoursUsed : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group relative rounded-xl border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30 ${
        isMine
          ? "border-[hsl(262_83%_58%/0.25)] bg-[hsl(262_83%_58%/0.03)]"
          : "border-white/[0.05] bg-white/[0.02] hover:border-white/[0.08]"
      }`}
    >
      {/* Performance accent top bar */}
      <div
        className="absolute inset-x-0 top-0 h-[1.5px] rounded-t-xl opacity-40 transition-opacity group-hover:opacity-80"
        style={{
          background:
            project.performance === "good"  ? "hsl(160 84% 39%)" :
            project.performance === "bad"   ? "hsl(0 84% 60%)"   :
                                              "hsl(43 97% 52%)",
        }}
      />

      <div className="flex items-center gap-3 px-4 py-3">
        {/* Left: name + badges */}
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => onClick?.(project)}
        >
          <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
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
          <p className="truncate text-sm font-semibold text-white/85 group-hover:text-white transition-colors">
            {projectLabel}
          </p>
        </div>

        {/* Center: task stats + completion */}
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          {/* Task counts */}
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              <span className="text-xs font-bold text-emerald-400">{project.tasksDone}</span>
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-[hsl(262_83%_58%)]" />
              <span className="text-xs font-bold text-[hsl(262_83%_58%)]">{project.tasksPending}</span>
            </span>
            {project.tasksOverdue > 0 && (
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-red-400" />
                <span className="text-xs font-bold text-red-400">{project.tasksOverdue}</span>
              </span>
            )}
          </div>

          <div className="h-3 w-px bg-white/[0.08]" />

          {/* Completion bar */}
          <div className="flex items-center gap-1.5 w-24">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: "linear-gradient(to right, hsl(262 83% 58%), hsl(234 89% 64%))",
                }}
              />
            </div>
            <span className="text-[10px] font-bold text-white/35 shrink-0 w-8 text-right">{pct}%</span>
          </div>

          <div className="h-3 w-px bg-white/[0.08]" />

          {/* Hours */}
          <div className="flex items-center gap-1.5 min-w-[80px]">
            <Clock className="h-3 w-3 text-white/25 shrink-0" />
            <span className="text-xs font-semibold text-white/55">
              {Math.round(project.hoursUsed)}h
            </span>
            {hasHours ? (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-white/25">/ {project.hoursContracted}h</span>
                <div className="h-1.5 w-12 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${hoursPct}%`, background: hoursBarColor }}
                  />
                </div>
                {hoursRemaining !== null && (
                  <span className={`text-[9px] font-semibold ${hoursRemaining < 0 ? "text-red-400" : "text-white/25"}`}>
                    {hoursRemaining < 0 ? `+${Math.abs(Math.round(hoursRemaining))}h` : `${Math.round(hoursRemaining)}h`}
                  </span>
                )}
              </div>
            ) : isAdmin ? (
              <button
                onClick={(e) => { e.stopPropagation(); onEditHours?.(project); }}
                className="text-[10px] text-white/20 hover:text-[hsl(262_83%_58%)] transition-colors whitespace-nowrap"
              >
                + definir
              </button>
            ) : null}
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-0.5 shrink-0">
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

  const myCount = useMemo(
    () => (myProjectIds ? projects.filter((p) => myProjectIds.has(p.projectId)).length : 0),
    [projects, myProjectIds]
  );

  const filtered = useMemo(() => {
    let list = selectedProject
      ? projects.filter((p) => p.projectId === selectedProject.projectId)
      : projects;
    if (filter === "active")    list = list.filter((p) => p.isActive);
    if (filter === "favorites") list = list.filter((p) => p.isFavorite);
    if (filter === "mine" && myProjectIds) list = list.filter((p) => myProjectIds.has(p.projectId));
    // Sort: mine first, then favorites, then by used hours desc
    return [...list].sort((a, b) => {
      if (filter === "all" && myProjectIds) {
        const aM = myProjectIds.has(a.projectId);
        const bM = myProjectIds.has(b.projectId);
        if (aM !== bM) return aM ? -1 : 1;
      }
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
      return b.hoursUsed - a.hoursUsed;
    });
  }, [projects, filter, selectedProject, myProjectIds]);

  const grouped = useMemo(() => groupByResolvedClient(filtered), [filtered]);

  const filtersConfig: { key: Filter; label: string; count: number; icon?: React.ReactNode }[] = [
    { key: "all",       label: "Todos",         count: projects.length },
    ...(myProjectIds && myCount > 0
      ? [{ key: "mine" as Filter, label: "Meus", count: myCount, icon: <UserCircle className="h-3 w-3" /> }]
      : []),
    { key: "active",    label: "Ativos",         count: projects.filter((p) => p.isActive).length },
    { key: "favorites", label: "Favoritos",      count: projects.filter((p) => p.isFavorite).length },
  ];

  const toggleCollapse = (clientKey: string) =>
    setCollapsedClients((prev) => {
      const next = new Set(prev);
      next.has(clientKey) ? next.delete(clientKey) : next.add(clientKey);
      return next;
    });

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
          <h3 className="text-lg font-bold text-white/90">Projetos por Cliente</h3>
          <span className="rounded-full bg-white/[0.05] border border-white/[0.06] px-2 py-0.5 text-[10px] text-white/40 font-semibold">
            {filtered.length}
          </span>
          <span className="rounded-full bg-white/[0.04] border border-white/[0.04] px-2 py-0.5 text-[10px] text-white/25">
            {grouped.size} cliente{grouped.size !== 1 ? "s" : ""}
          </span>
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

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-white/25">Nenhum projeto encontrado.</p>
      ) : (
        <div className="space-y-3">
          {[...grouped.entries()].map(([clientLabel, { projects: clientProjects, labelsByProject }]) => {
            const isCollapsed = collapsedClients.has(clientLabel);
            const totalHours      = clientProjects.reduce((s, p) => s + p.hoursUsed, 0);
            const totalContracted = clientProjects.reduce((s, p) => s + (p.hoursContracted || 0), 0);
            const activeCount     = clientProjects.filter((p) => p.isActive).length;
            const overdueCount    = clientProjects.reduce((s, p) => s + p.tasksOverdue, 0);
            const doneCount       = clientProjects.reduce((s, p) => s + p.tasksDone, 0);
            const hoursPct        = totalContracted > 0 ? Math.min(100, Math.round((totalHours / totalContracted) * 100)) : 0;
            const hoursBarColor   =
              hoursPct >= 90 ? "hsl(0 84% 60%)" :
              hoursPct >= 70 ? "hsl(43 97% 52%)" :
              "hsl(160 84% 39%)";

            // Single-project group: same name as client → don't show redundant sub-label
            // Also applies when clientLabel is "Projeto" (fallback) - always show project name
            const isSingleSelf = clientLabel === "Projeto"
              ? false
              : (clientProjects.length === 1 &&
                  labelsByProject.get(clientProjects[0].projectId) === clientLabel);

            return (
              <div
                key={clientLabel}
                className="overflow-hidden rounded-2xl border border-white/[0.06] transition-shadow hover:shadow-lg hover:shadow-black/20"
                style={{ background: "linear-gradient(160deg, hsl(270 50% 11% / 0.8), hsl(234 45% 8% / 0.6))" }}
              >
                {/* ── Client accordion header ── */}
                <button
                  onClick={() => toggleCollapse(clientLabel)}
                  className="group flex w-full items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.02]"
                >
                  {/* Icon */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[hsl(262_83%_58%/0.2)] bg-[hsl(262_83%_58%/0.08)]">
                    <Building2 className="h-4 w-4 text-[hsl(262_83%_58%)]" />
                  </div>

                  {/* Client name + meta badges */}
                  <div className="flex flex-1 flex-col items-start gap-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-white/90 truncate max-w-[260px]">
                        {clientLabel}
                      </span>
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
                      {doneCount > 0 && (
                        <span className="rounded-full bg-emerald-500/8 border border-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-400/70 font-semibold">
                          {doneCount} concluíd{doneCount !== 1 ? "as" : "a"}
                        </span>
                      )}
                    </div>

                    {/* Hours progress bar */}
                    <div className="flex w-full max-w-[300px] items-center gap-2">
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

                  {/* Right: set-hours button + chevron */}
                  <div className="flex shrink-0 items-center gap-2">
                    {isAdmin && onEditClientHours && !isSingleSelf && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditClientHours(clientLabel, clientProjects);
                        }}
                        className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1.5 text-[10px] font-semibold text-white/30 transition hover:border-[hsl(262_83%_58%/0.3)] hover:text-[hsl(262_83%_58%)] hover:bg-[hsl(262_83%_58%/0.05)]"
                        title="Definir horas para todos os projetos do cliente"
                      >
                        <Clock className="h-3 w-3" />
                        Horas
                      </button>
                    )}
                    {isCollapsed
                      ? <ChevronDown className="h-4 w-4 text-white/25 transition group-hover:text-white/50" />
                      : <ChevronUp   className="h-4 w-4 text-white/25 transition group-hover:text-white/50" />
                    }
                  </div>
                </button>

                {/* ── Project rows (collapsible) ── */}
                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-1.5 border-t border-white/[0.04] p-3">
                        {clientProjects.map((p) => (
                          <ProjectRow
                            key={p.projectId}
                            project={p}
                            projectLabel={
                              isSingleSelf
                                ? p.projectName
                                : (labelsByProject.get(p.projectId) ?? p.projectName)
                            }
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
      )}
    </motion.div>
  );
}
