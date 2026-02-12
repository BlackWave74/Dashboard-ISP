import { Users, FolderKanban, Clock, CheckCircle2, AlertTriangle, TrendingUp } from "lucide-react";
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

  const kpis = [
    {
      label: "Clientes Atendidos",
      value: clients.toLocaleString("pt-BR"),
      sub: `${activeProjects} projetos ativos`,
      icon: Users,
      gradient: "from-[hsl(270_80%_55%)] to-[hsl(234_89%_55%)]",
      iconBg: "hsl(270 80% 55%)",
    },
    {
      label: "Total de Tarefas",
      value: totalTasks.toLocaleString("pt-BR"),
      sub: `${doneCount} concluídas · ${pendingCount} em andamento`,
      icon: CheckCircle2,
      gradient: "from-[hsl(160_84%_39%)] to-[hsl(200_80%_50%)]",
      iconBg: "hsl(160 84% 39%)",
    },
    {
      label: "Horas Alocadas",
      value: `${Math.round(totalHours).toLocaleString("pt-BR")}h`,
      sub: `~${activeProjects > 0 ? Math.round(totalHours / activeProjects) : 0}h por projeto`,
      icon: Clock,
      gradient: "from-[hsl(250_80%_60%)] to-[hsl(270_80%_55%)]",
      iconBg: "hsl(250 80% 60%)",
    },
    {
      label: "Tarefas Atrasadas",
      value: overdueCount.toLocaleString("pt-BR"),
      sub: totalTasks > 0 ? `${Math.round((overdueCount / totalTasks) * 100)}% do total` : "Nenhuma tarefa",
      icon: overdueCount > 0 ? AlertTriangle : TrendingUp,
      gradient: overdueCount > 0 ? "from-[hsl(0_84%_60%)] to-[hsl(38_92%_50%)]" : "from-[hsl(160_84%_39%)] to-[hsl(200_80%_50%)]",
      iconBg: overdueCount > 0 ? "hsl(0 84% 60%)" : "hsl(160 84% 39%)",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((k, i) => (
        <motion.div
          key={k.label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: i * 0.1, ease: "easeOut" }}
          className="group relative overflow-hidden rounded-2xl border border-white/[0.06] p-5 transition-all duration-500 hover:-translate-y-1 hover:border-white/[0.10] hover:shadow-2xl"
          style={{
            background: "linear-gradient(145deg, hsl(270 50% 14% / 0.8), hsl(234 45% 10% / 0.6))",
          }}
        >
          {/* Corner glow on hover */}
          <div
            className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
            style={{ background: `${k.iconBg.replace(")", " / 0.2)")}` }}
          />

          {/* Top accent line */}
          <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${k.gradient} opacity-40 transition-opacity duration-500 group-hover:opacity-100`} />

          <div className="relative z-10">
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${k.gradient} shadow-lg transition-transform duration-300 group-hover:scale-110`}>
              <k.icon className="h-5 w-5 text-white" />
            </div>

            <p className="text-2xl font-bold text-white/90">{k.value}</p>
            <p className="mt-0.5 text-xs font-semibold text-white/50">{k.label}</p>
            <p className="mt-1 text-[0.65rem] text-white/30">{k.sub}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
