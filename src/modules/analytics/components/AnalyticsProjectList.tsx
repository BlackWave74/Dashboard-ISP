import { useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ProjectAnalytics } from "../types";
import AnalyticsProjectCard from "./AnalyticsProjectCard";

type Props = {
  projects: ProjectAnalytics[];
  onToggleFavorite: (id: number) => void;
  onProjectClick?: (project: ProjectAnalytics) => void;
  selectedProject: ProjectAnalytics | null;
};

type Filter = "all" | "active" | "favorites";

export default function AnalyticsProjectList({ projects, onToggleFavorite, onProjectClick, selectedProject }: Props) {
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    let list = selectedProject ? projects.filter((p) => p.projectId === selectedProject.projectId) : projects;
    if (filter === "active") list = list.filter((p) => p.isActive);
    if (filter === "favorites") list = list.filter((p) => p.isFavorite);
    return [...list].sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
      return b.hoursUsed - a.hoursUsed;
    });
  }, [projects, filter, selectedProject]);

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "Todos", count: projects.length },
    { key: "active", label: "Ativos", count: projects.filter((p) => p.isActive).length },
    { key: "favorites", label: "Favoritos", count: projects.filter((p) => p.isFavorite).length },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-white/90">Projetos</h3>
        <div className="flex gap-1 rounded-xl border border-white/[0.06] bg-white/[0.03] p-1">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                filter === f.key
                  ? "bg-gradient-to-r from-[hsl(262_83%_58%)] to-[hsl(234_89%_64%)] text-white shadow-lg shadow-[hsl(262_83%_58%/0.25)]"
                  : "text-white/25 hover:text-white/50"
              }`}
            >
              {f.label}
              <span className="ml-1 opacity-50">{f.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {filtered.map((p, i) => (
            <AnalyticsProjectCard
              key={p.projectId}
              project={p}
              onToggleFavorite={onToggleFavorite}
              onClick={onProjectClick}
              index={i}
            />
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <p className="col-span-full py-12 text-center text-sm text-white/25">
            Nenhum projeto encontrado.
          </p>
        )}
      </div>
    </motion.div>
  );
}
