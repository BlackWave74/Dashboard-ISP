import { useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { UserCircle, Building2, ChevronDown, ChevronUp, Clock, Edit3 } from "lucide-react";
import type { ProjectAnalytics } from "../types";
import AnalyticsProjectCard from "./AnalyticsProjectCard";

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

/** Group projects by client name */
function groupByClient(projects: ProjectAnalytics[]): Map<string, ProjectAnalytics[]> {
  const map = new Map<string, ProjectAnalytics[]>();
  projects.forEach((p) => {
    // Only use clientName if it's a real, non-empty string
    const key = p.clientName?.trim() || "__no_client__";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  });
  // Sort entries: named clients first (alpha), "no client" last
  const sorted = new Map(
    [...map.entries()].sort(([a], [b]) => {
      if (a === "__no_client__") return 1;
      if (b === "__no_client__") return -1;
      return a.localeCompare(b, "pt-BR");
    })
  );
  return sorted;
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

  const filters: { key: Filter; label: string; count: number; icon?: React.ReactNode }[] = [
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
      className="space-y-6"
    >
      {/* Header + filter pills */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-white/90">Projetos</h3>
          <span className="rounded-full bg-white/[0.05] border border-white/[0.06] px-2 py-0.5 text-[10px] text-white/40 font-semibold">
            {filtered.length}
          </span>
        </div>
        <div className="flex gap-1 rounded-xl border border-white/[0.06] bg-white/[0.03] p-1">
          {filters.map((f) => (
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

      {/* Grouped by client */}
      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-white/25">
          Nenhum projeto encontrado.
        </p>
      ) : (
        <div className="space-y-8">
          {[...grouped.entries()].map(([clientKey, clientProjects]) => {
            const isNoClient = clientKey === "__no_client__";
            const clientName = isNoClient ? "Projetos sem cliente associado" : clientKey;
            const isCollapsed = collapsedClients.has(clientKey);
            const totalHours = clientProjects.reduce((s, p) => s + p.hoursUsed, 0);
            const totalContracted = clientProjects.reduce((s, p) => s + (p.hoursContracted || 0), 0);
            const activeCount = clientProjects.filter((p) => p.isActive).length;
            const hoursPct = totalContracted > 0 ? Math.min(100, Math.round((totalHours / totalContracted) * 100)) : 0;
            const hoursBarColor =
              hoursPct >= 90 ? "hsl(0 84% 60%)" :
              hoursPct >= 70 ? "hsl(43 97% 52%)" :
              "hsl(160 84% 39%)";

            return (
              <div key={clientKey}>
                {/* Client section header */}
                <div className="mb-4 overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
                  <button
                    onClick={() => toggleCollapse(clientKey)}
                    className="group flex w-full items-center gap-4 px-5 py-4 transition hover:bg-white/[0.02]"
                  >
                    {/* Icon */}
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                      isNoClient
                        ? "border-white/[0.06] bg-white/[0.04]"
                        : "border-[hsl(262_83%_58%/0.25)] bg-[hsl(262_83%_58%/0.08)]"
                    }`}>
                      <Building2 className={`h-4 w-4 ${isNoClient ? "text-white/30" : "text-[hsl(262_83%_58%)]"}`} />
                    </div>

                    {/* Client info */}
                    <div className="flex flex-1 flex-col items-start gap-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-sm font-bold ${isNoClient ? "text-white/40 italic" : "text-white/85"}`}>
                          {clientName}
                        </span>
                        <span className="rounded-full bg-white/[0.06] border border-white/[0.05] px-2 py-0.5 text-[10px] text-white/35 font-semibold">
                          {clientProjects.length} projeto{clientProjects.length !== 1 ? "s" : ""}
                        </span>
                        {activeCount > 0 && (
                          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-400 font-semibold">
                            {activeCount} ativo{activeCount !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>

                      {/* Hours bar for client */}
                      {!isNoClient && (
                        <div className="flex w-full max-w-xs items-center gap-2">
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
                      )}
                    </div>

                    {/* Right side */}
                    <div className="flex shrink-0 items-center gap-2">
                      {isAdmin && !isNoClient && onEditClientHours && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onEditClientHours(clientName, clientProjects); }}
                          className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1.5 text-[10px] font-semibold text-white/30 transition hover:border-[hsl(262_83%_58%/0.3)] hover:text-[hsl(262_83%_58%)] hover:bg-[hsl(262_83%_58%/0.05)]"
                          title="Definir horas contratadas para todos os projetos deste cliente"
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
                </div>

                {/* Project cards */}
                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-visible"
                    >
                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        <AnimatePresence mode="popLayout">
                          {clientProjects.map((p, i) => (
                            <AnalyticsProjectCard
                              key={p.projectId}
                              project={p}
                              onToggleFavorite={onToggleFavorite}
                              onClick={onProjectClick}
                              onEditHours={onEditHours}
                              index={i}
                              isMine={myProjectIds?.has(p.projectId)}
                              isAdmin={isAdmin}
                            />
                          ))}
                        </AnimatePresence>
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
