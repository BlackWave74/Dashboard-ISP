import { Users, FolderKanban, Clock } from "lucide-react";
import { motion } from "framer-motion";

type Props = {
  clients: number;
  activeProjects: number;
  totalHours: number;
  totalTasks: number;
  doneCount: number;
  overdueCount: number;
};

export default function AnalyticsKpiCards({ clients, activeProjects, totalHours, totalTasks, doneCount, overdueCount }: Props) {
  const pendingCount = totalTasks - doneCount - overdueCount;
  const completionPct = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;

  const kpis = [
    {
      label: "Clientes Atendidos",
      value: clients.toLocaleString("pt-BR"),
      sub: `com projetos vinculados`,
      icon: Users,
      gradient: "from-[hsl(270_80%_55%)] to-[hsl(234_89%_55%)]",
    },
    {
      label: "Projetos Ativos",
      value: activeProjects.toLocaleString("pt-BR"),
      sub: `${totalTasks} tarefas no total`,
      icon: FolderKanban,
      gradient: "from-[hsl(250_80%_60%)] to-[hsl(270_80%_55%)]",
    },
    {
      label: "Horas Alocadas",
      value: `${Math.round(totalHours).toLocaleString("pt-BR")}h`,
      sub: `~${activeProjects > 0 ? Math.round(totalHours / activeProjects) : 0}h por projeto`,
      icon: Clock,
      gradient: "from-[hsl(160_84%_39%)] to-[hsl(200_80%_50%)]",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {kpis.map((k, i) => (
        <motion.div
          key={k.label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: i * 0.1, ease: "easeOut" }}
          className="group relative overflow-hidden rounded-2xl border border-white/[0.06] p-6 transition-all duration-500 hover:-translate-y-1 hover:border-white/[0.10] hover:shadow-2xl"
          style={{
            background: "linear-gradient(145deg, hsl(270 50% 14% / 0.8), hsl(234 45% 10% / 0.6))",
          }}
        >
          {/* Top accent line */}
          <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${k.gradient} opacity-40 transition-opacity duration-500 group-hover:opacity-100`} />

          <div className="relative z-10 flex items-start gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${k.gradient} shadow-lg transition-transform duration-300 group-hover:scale-110`}>
              <k.icon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-3xl font-bold text-white/90">{k.value}</p>
              <p className="text-sm font-semibold text-white/50 mt-0.5">{k.label}</p>
              <p className="text-xs text-white/30 mt-0.5">{k.sub}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
