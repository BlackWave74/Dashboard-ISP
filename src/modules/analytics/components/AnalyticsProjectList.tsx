import { useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { UserCircle, Building2, ChevronDown, ChevronUp } from "lucide-react";
import type { ProjectAnalytics } from "../types";
import AnalyticsProjectCard from "./AnalyticsProjectCard";

type Props = {
  projects: ProjectAnalytics[];
  onToggleFavorite: (id: number) => void;
  onProjectClick?: (project: ProjectAnalytics) => void;
  onEditHours?: (project: ProjectAnalytics) => void;
  selectedProject: ProjectAnalytics | null;
  myProjectIds?: Set<number>;
  isAdmin?: boolean;
};

type Filter = "all" | "mine" | "active" | "favorites";

/** Group projects by client name */
function groupByClient(projects: ProjectAnalytics[]): Map<string, ProjectAnalytics[]> {
  const map = new Map<string, ProjectAnalytics[]>();
  projects.forEach((p) => {
    const key = p.clientName?.trim() || "Sem Cliente";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  });
  // Sort entries: named clients first, "Sem Cliente" last
  const sorted = new Map(
    [...map.entries()].sort(([a], [b]) => {
      if (a === "Sem Cliente") return 1;
      if (b === "Sem Cliente") return -1;
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

  const toggleCollapse = (clientName: string) => {
    setCollapsedClients((prev) => {
      const next = new Set(prev);
      if (next.has(clientName)) next.delete(clientName);
      else next.add(clientName);
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
        <div className="space-y-6">
          {[...grouped.entries()].map(([clientName, clientProjects]) => {
            const isCollapsed = collapsedClients.has(clientName);
            const totalHours = clientProjects.reduce((s, p) => s + p.hoursUsed, 0);
            const activeCount = clientProjects.filter((p) => p.isActive).length;

            return (
              <div key={clientName}>
                {/* Client section header */}
                <button
                  onClick={() => toggleCollapse(clientName)}
                  className="group mb-3 flex w-full items-center gap-3 rounded-xl px-1 py-1 transition hover:bg-white/[0.02]"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.04]">
                    <Building2 className="h-3.5 w-3.5 text-white/40" />
                  </div>
                  <div className="flex flex-1 items-center gap-2 min-w-0">
                    <span className="truncate text-sm font-bold text-white/80">{clientName}</span>
                    <span className="shrink-0 rounded-full bg-white/[0.06] border border-white/[0.04] px-2 py-0.5 text-[10px] text-white/35 font-semibold">
                      {clientProjects.length} projeto{clientProjects.length !== 1 ? "s" : ""}
                    </span>
                    {activeCount > 0 && (
                      <span className="shrink-0 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-400 font-semibold">
                        {activeCount} ativo{activeCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-[11px] text-white/25 font-semibold">{Math.round(totalHours)}h utilizadas</span>
                    {isCollapsed
                      ? <ChevronDown className="h-3.5 w-3.5 text-white/25 transition group-hover:text-white/50" />
                      : <ChevronUp className="h-3.5 w-3.5 text-white/25 transition group-hover:text-white/50" />
                    }
                  </div>
                </button>

                {/* Divider */}
                <div className="mb-4 h-px bg-white/[0.04]" />

                {/* Project cards */}
                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
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
