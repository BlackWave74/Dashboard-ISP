import { Users, FolderKanban, Clock, ListChecks } from "lucide-react";
import { motion } from "framer-motion";

type Props = {
  clients: number;
  activeProjects: number;
  totalHours: number;
  totalTasks: number;
};

const kpis = [
  { key: "clients", icon: Users, label: "Clientes Atendidos" },
  { key: "projects", icon: FolderKanban, label: "Projetos Ativos" },
  { key: "hours", icon: Clock, label: "Horas Alocadas" },
  { key: "tasks", icon: ListChecks, label: "Total de Tarefas" },
] as const;

export default function AnalyticsKpiCards({ clients, activeProjects, totalHours, totalTasks }: Props) {
  const values: Record<string, string> = {
    clients: clients.toLocaleString("pt-BR"),
    projects: activeProjects.toLocaleString("pt-BR"),
    hours: `${Math.round(totalHours).toLocaleString("pt-BR")}h`,
    tasks: totalTasks.toLocaleString("pt-BR"),
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi, i) => {
        const Icon = kpi.icon;
        return (
          <motion.div
            key={kpi.key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            className="ana-card p-4 flex items-center gap-4"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--ana-purple)/0.15)]">
              <Icon className="h-5 w-5 text-[hsl(var(--ana-purple))]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-[hsl(var(--ana-text-muted))]">{kpi.label}</p>
              <p className="text-xl font-bold text-[hsl(var(--ana-text))]">{values[kpi.key]}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
