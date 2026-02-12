import { useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ProjectAnalytics } from "../types";
import AnalyticsProjectCard from "./AnalyticsProjectCard";

type Props = {
  projects: ProjectAnalytics[];
  onToggleFavorite: (id: number) => void;
  selectedProject: ProjectAnalytics | null;
};

type Filter = "all" | "active" | "favorites";

export default function AnalyticsProjectList({ projects, onToggleFavorite, selectedProject }: Props) {
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-bold text-white/90">Projetos</h3>
        <div className="flex gap-0.5 rounded-lg border border-white/[0.06] bg-white/[0.03] p-0.5">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                filter === f.key
                  ? "bg-gradient-to-r from-[hsl(262_83%_58%)] to-[hsl(234_89%_64%)] text-white shadow-lg shadow-[hsl(262_83%_58%/0.3)]"
                  : "text-white/30 hover:text-white/60"
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
            <motion.div
              key={p.projectId}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <AnalyticsProjectCard project={p} onToggleFavorite={onToggleFavorite} />
            </motion.div>
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <p className="col-span-full py-12 text-center text-sm text-white/30">
            Nenhum projeto encontrado.
          </p>
        )}
      </div>
    </div>
  );
}
