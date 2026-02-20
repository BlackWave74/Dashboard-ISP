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
  Search,
  X,
  Timer,
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
  good:    { label: "Bom",     icon: TrendingUp,   color: "text-emerald-400", bg: "bg-emerald-500/10",  border: "border-emerald-500/25"  },
  neutral: { label: "Regular", icon: Minus,         color: "text-amber-400",   bg: "bg-amber-500/10",    border: "border-amber-500/25"    },
  bad:     { label: "Crítico", icon: TrendingDown,  color: "text-red-400",     bg: "bg-red-500/10",      border: "border-red-500/25"      },
};

/**
 * Extracts a "display client" from the project.
 * Priority:
 *  1. If `clientName` is a real non-empty string → use it as group key.
 *  2. If project name contains " - " or " <> " → split and use left part.
 *  3. Fallback → use the project name itself as the label (no generic "Projeto").
 */
function resolveDisplayClient(p: ProjectAnalytics): { clientLabel: string; projectLabel: string } {
  const hasClient = p.clientName?.trim();
  if (hasClient) {
    return { clientLabel: hasClient, projectLabel: p.projectName };
  }

  const SEPARATORS = [" - ", " <> "];
  for (const sep of SEPARATORS) {
    const idx = p.projectName.indexOf(sep);
    if (idx > 0) {
      return {
        clientLabel: p.projectName.slice(0, idx).trim(),
        projectLabel: p.projectName.slice(idx + sep.length).trim() || p.projectName,
      };
    }
  }

  // No separator — use the project name directly as the group label
  return { clientLabel: p.projectName, projectLabel: p.projectName };
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
    // Avoid duplicates within the same client group
    if (!entry.projects.find((ep) => ep.projectId === p.projectId)) {
      entry.projects.push(p);
      entry.labelsByProject.set(p.projectId, projectLabel);
    }
  });

  return new Map(
    [...map.entries()].sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
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
      className={`group relative rounded-xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/25 ${
        isMine
          ? "border-[hsl(262_83%_58%/0.3)] bg-[hsl(262_83%_58%/0.04)]"
          : "border-white/[0.06] bg-white/[0.025] hover:border-white/[0.1] hover:bg-white/[0.035]"
      }`}
    >
      {/* Performance accent bar */}
      <div
        className="absolute inset-x-0 top-0 h-[2px] rounded-t-xl opacity-50 transition-opacity group-hover:opacity-90"
        style={{
          background:
            project.performance === "good"  ? "hsl(160 84% 39%)" :
            project.performance === "bad"   ? "hsl(0 84% 60%)"   :
                                              "hsl(43 97% 52%)",
        }}
      />

      <div className="flex items-center gap-4 px-4 py-3.5">
        {/* Left: name + badges */}
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => onClick?.(project)}
        >
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            {isMine && (
              <span className="rounded-full bg-[hsl(262_83%_58%/0.18)] border border-[hsl(262_83%_58%/0.35)] px-2 py-0.5 text-[10px] font-bold text-[hsl(262_83%_58%)]">
                Meu
              </span>
            )}
            {project.isActive && (
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                Ativo
              </span>
            )}
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${perf.bg} ${perf.border} ${perf.color}`}>
              <PerfIcon className="h-3 w-3" />
              {perf.label}
            </span>
          </div>
          <p className="truncate text-sm font-semibold text-white/80 group-hover:text-white transition-colors leading-snug">
            {projectLabel}
          </p>
        </div>

        {/* Center: stats */}
        <div className="hidden md:flex items-center gap-4 shrink-0">
          {/* Task counts */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-sm font-bold text-emerald-400">{project.tasksDone}</span>
              </div>
              <span className="text-[9px] text-white/30 font-medium">Concluídas</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-1">
                <Timer className="h-3.5 w-3.5 text-[hsl(262_83%_68%)]" />
                <span className="text-sm font-bold text-[hsl(262_83%_68%)]">{project.tasksPending}</span>
              </div>
              <span className="text-[9px] text-white/30 font-medium">Em andamento</span>
            </div>
            {project.tasksOverdue > 0 && (
              <div className="flex flex-col items-center gap-0.5">
                <div className="flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                  <span className="text-sm font-bold text-red-400">{project.tasksOverdue}</span>
                </div>
                <span className="text-[9px] text-white/30 font-medium">Atrasadas</span>
              </div>
            )}
          </div>

          <div className="h-8 w-px bg-white/[0.06]" />

          {/* Completion bar */}
          <div className="flex flex-col gap-1.5 w-28">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/35 font-medium">Progresso</span>
              <span className="text-[11px] font-bold text-white/60">{pct}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: "linear-gradient(to right, hsl(262 83% 58%), hsl(234 89% 64%))",
                }}
              />
            </div>
          </div>

          <div className="h-8 w-px bg-white/[0.06]" />

          {/* Hours */}
          <div className="flex flex-col gap-1 min-w-[100px]">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-white/30 shrink-0" />
              <span className="text-sm font-bold text-white/70">
                {Math.round(project.hoursUsed)}h
              </span>
              {hasHours && (
                <span className="text-[11px] text-white/30">/ {project.hoursContracted}h</span>
              )}
            </div>
            {hasHours ? (
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${hoursPct}%`, background: hoursBarColor }}
                  />
                </div>
                {hoursRemaining !== null && (
                  <span className={`text-[9px] font-bold shrink-0 ${hoursRemaining < 0 ? "text-red-400" : "text-white/30"}`}>
                    {hoursRemaining < 0 ? `+${Math.abs(Math.round(hoursRemaining))}h` : `${Math.round(hoursRemaining)}h`}
                  </span>
                )}
              </div>
            ) : isAdmin ? (
              <button
                onClick={(e) => { e.stopPropagation(); onEditHours?.(project); }}
                className="text-[10px] text-white/25 hover:text-[hsl(262_83%_58%)] transition-colors text-left"
              >
                + definir horas
              </button>
            ) : null}
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1 shrink-0">
          {isAdmin && (
            <button
              onClick={(e) => { e.stopPropagation(); onEditHours?.(project); }}
              className="rounded-lg p-2 text-white/20 transition hover:text-[hsl(262_83%_58%)] hover:bg-[hsl(262_83%_58%/0.1)]"
              title="Editar horas contratadas"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(project.projectId); }}
            className="rounded-lg p-2 transition hover:scale-110"
          >
            <Star
              className={`h-4 w-4 transition ${
                project.isFavorite ? "fill-amber-400 text-amber-400" : "text-white/20 hover:text-amber-400/60"
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
  // Tracks which clients are EXPANDED (default = all collapsed)
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

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

  // Apply client name search filter
  const groupedFiltered = useMemo(() => {
    if (!search.trim()) return grouped;
    const q = search.toLowerCase().trim();
    const result = new Map<string, typeof grouped extends Map<string, infer V> ? V : never>();
    grouped.forEach((val, key) => {
      if (
        key.toLowerCase().includes(q) ||
        val.projects.some((p) =>
          (val.labelsByProject.get(p.projectId) ?? p.projectName).toLowerCase().includes(q)
        )
      ) {
        result.set(key, val);
      }
    });
    return result;
  }, [grouped, search]);

  const filtersConfig: { key: Filter; label: string; count: number; icon?: React.ReactNode }[] = [
    { key: "all",       label: "Todos",    count: projects.length },
    ...(myProjectIds && myCount > 0
      ? [{ key: "mine" as Filter, label: "Meus", count: myCount, icon: <UserCircle className="h-3.5 w-3.5" /> }]
      : []),
    { key: "active",    label: "Ativos",   count: projects.filter((p) => p.isActive).length },
    { key: "favorites", label: "Favoritos",count: projects.filter((p) => p.isFavorite).length },
  ];

  const toggleExpand = (clientKey: string) =>
    setExpandedClients((prev) => {
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
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h3 className="text-xl font-bold text-white/90">Projetos por Cliente</h3>
          <span className="rounded-full bg-white/[0.06] border border-white/[0.07] px-2.5 py-0.5 text-xs text-white/45 font-bold">
            {filtered.length}
          </span>
          <span className="rounded-full bg-white/[0.04] border border-white/[0.05] px-2.5 py-0.5 text-xs text-white/30">
            {groupedFiltered.size} cliente{groupedFiltered.size !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex gap-1 rounded-xl border border-white/[0.07] bg-white/[0.03] p-1">
          {filtersConfig.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
                filter === f.key
                  ? "bg-gradient-to-r from-[hsl(262_83%_58%)] to-[hsl(234_89%_64%)] text-white shadow-lg shadow-[hsl(262_83%_58%/0.3)]"
                  : "text-white/30 hover:text-white/55"
              }`}
            >
              {f.icon}
              {f.label}
              <span className="opacity-50">{f.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por cliente ou projeto..."
          className="w-full rounded-xl border border-white/[0.07] bg-white/[0.03] py-2.5 pl-10 pr-10 text-sm text-white/80 placeholder-white/25 outline-none transition focus:border-[hsl(262_83%_58%/0.4)] focus:bg-white/[0.05]"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-white/30 hover:text-white/60 transition"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {groupedFiltered.size === 0 ? (
        <p className="py-16 text-center text-sm text-white/25">
          {search ? `Nenhum resultado para "${search}".` : "Nenhum projeto encontrado."}
        </p>
      ) : (
        <div className="space-y-2.5">
          {[...groupedFiltered.entries()].map(([clientLabel, { projects: clientProjects, labelsByProject }]) => {
            const isExpanded = expandedClients.has(clientLabel);
            const totalHours      = clientProjects.reduce((s, p) => s + p.hoursUsed, 0);
            const totalContracted = clientProjects.reduce((s, p) => s + (p.hoursContracted || 0), 0);
            const activeCount     = clientProjects.filter((p) => p.isActive).length;
            const overdueCount    = clientProjects.reduce((s, p) => s + p.tasksOverdue, 0);
            const doneCount       = clientProjects.reduce((s, p) => s + p.tasksDone, 0);
            const pendingCount    = clientProjects.reduce((s, p) => s + p.tasksPending, 0);
            const hoursPct        = totalContracted > 0 ? Math.min(100, Math.round((totalHours / totalContracted) * 100)) : 0;
            const hoursBarColor   =
              hoursPct >= 90 ? "hsl(0 84% 60%)" :
              hoursPct >= 70 ? "hsl(43 97% 52%)" :
              "hsl(160 84% 39%)";

            // Single-project group where client == project name → no sub-label needed
            const isSingleSelf =
              clientProjects.length === 1 &&
              labelsByProject.get(clientProjects[0].projectId) === clientLabel;

            return (
              <div
                key={clientLabel}
                className="overflow-hidden rounded-2xl border border-white/[0.07] transition-shadow hover:shadow-lg hover:shadow-black/20"
                style={{ background: "linear-gradient(160deg, hsl(270 50% 10% / 0.85), hsl(234 45% 7% / 0.7))" }}
              >
                {/* ── Client accordion header ── */}
                <button
                  onClick={() => toggleExpand(clientLabel)}
                  className="group flex w-full items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.02]"
                >
                  {/* Icon */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[hsl(262_83%_58%/0.25)] bg-[hsl(262_83%_58%/0.1)]">
                    <Building2 className="h-5 w-5 text-[hsl(262_83%_68%)]" />
                  </div>

                  {/* Client name + meta */}
                  <div className="flex flex-1 flex-col items-start gap-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-bold text-white/90 truncate max-w-[280px]">
                        {clientLabel}
                      </span>
                      <span className="rounded-full bg-white/[0.07] border border-white/[0.06] px-2.5 py-0.5 text-xs text-white/40 font-bold">
                        {clientProjects.length} projeto{clientProjects.length !== 1 ? "s" : ""}
                      </span>
                      {activeCount > 0 && (
                        <span className="rounded-full bg-emerald-500/12 border border-emerald-500/25 px-2.5 py-0.5 text-xs text-emerald-400 font-bold">
                          {activeCount} ativo{activeCount !== 1 ? "s" : ""}
                        </span>
                      )}
                      {overdueCount > 0 && (
                        <span className="rounded-full bg-red-500/12 border border-red-500/25 px-2.5 py-0.5 text-xs text-red-400 font-bold">
                          {overdueCount} atrasada{overdueCount !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>

                    {/* Stats row */}
                    <div className="flex flex-wrap items-center gap-4 w-full">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400/70" />
                          <span className="text-xs font-bold text-emerald-400/70">{doneCount}</span>
                          <span className="text-[10px] text-white/25">concluídas</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Timer className="h-3.5 w-3.5 text-[hsl(262_83%_58%/0.7)]" />
                          <span className="text-xs font-bold text-[hsl(262_83%_68%/0.7)]">{pendingCount}</span>
                          <span className="text-[10px] text-white/25">em andamento</span>
                        </div>
                        {overdueCount > 0 && (
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5 text-red-400/70" />
                            <span className="text-xs font-bold text-red-400/70">{overdueCount}</span>
                            <span className="text-[10px] text-white/25">atrasadas</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 max-w-[240px] flex-1">
                        <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
                          {totalContracted > 0 && (
                            <div
                              className="absolute left-0 top-0 h-full rounded-full transition-all duration-700"
                              style={{ width: `${hoursPct}%`, background: hoursBarColor }}
                            />
                          )}
                        </div>
                        <span className="shrink-0 text-xs font-bold text-white/35">
                          {Math.round(totalHours)}h
                          {totalContracted > 0 && <span className="font-normal text-white/20"> / {Math.round(totalContracted)}h</span>}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: hours button + chevron */}
                  <div className="flex shrink-0 items-center gap-2">
                    {isAdmin && onEditClientHours && !isSingleSelf && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditClientHours(clientLabel, clientProjects);
                        }}
                        className="flex items-center gap-1.5 rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-2 text-xs font-bold text-white/35 transition hover:border-[hsl(262_83%_58%/0.35)] hover:text-[hsl(262_83%_68%)] hover:bg-[hsl(262_83%_58%/0.07)]"
                        title="Definir horas para todos os projetos do cliente"
                      >
                        <Clock className="h-3.5 w-3.5" />
                        Horas
                      </button>
                    )}
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03] transition group-hover:border-white/[0.1]">
                      {isExpanded
                        ? <ChevronUp   className="h-4 w-4 text-white/35 transition group-hover:text-white/60" />
                        : <ChevronDown className="h-4 w-4 text-white/35 transition group-hover:text-white/60" />
                      }
                    </div>
                  </div>
                </button>

                {/* ── Project rows (collapsible) ── */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-2 border-t border-white/[0.05] p-3">
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
