import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ProjectAnalytics } from "../types";
import AnalyticsProjectCard from "./AnalyticsProjectCard";
import AnalyticsSearch from "./AnalyticsSearch";

type Props = {
  projects: ProjectAnalytics[];
  onToggleFavorite: (id: number) => void;
};

type Filter = "all" | "active" | "favorites";

export default function AnalyticsProjectList({ projects, onToggleFavorite }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedProject, setSelectedProject] = useState<ProjectAnalytics | null>(null);

  const filtered = useMemo(() => {
    let list = selectedProject ? [selectedProject] : projects;
    if (filter === "active") list = list.filter((p) => p.isActive);
    if (filter === "favorites") list = list.filter((p) => p.isFavorite);
    // Sort: favorites first, then by hours desc
    return [...list].sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
      return b.hoursUsed - a.hoursUsed;
    });
  }, [projects, filter, selectedProject]);

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "Todos" },
    { key: "active", label: "Ativos" },
    { key: "favorites", label: "Favoritos" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-[hsl(var(--ana-text))]">Projetos</h3>
        <div className="flex items-center gap-3">
          <AnalyticsSearch projects={projects} onSelect={setSelectedProject} selected={selectedProject} />
          <div className="flex gap-1 rounded-lg bg-[hsl(var(--ana-surface))] p-1 border border-[hsl(var(--ana-border))]">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                  filter === f.key
                    ? "bg-[hsl(var(--ana-purple))] text-white shadow-md"
                    : "text-[hsl(var(--ana-text-muted))] hover:text-[hsl(var(--ana-text))]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {filtered.map((p) => (
            <AnalyticsProjectCard
              key={p.projectId}
              project={p}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-[hsl(var(--ana-text-muted))]">
            Nenhum projeto encontrado.
          </p>
        )}
      </div>
    </motion.div>
  );
}
