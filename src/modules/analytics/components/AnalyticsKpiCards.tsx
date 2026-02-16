import { FolderKanban, Clock, CheckCircle2, AlertTriangle, TrendingUp, Briefcase } from "lucide-react";
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
      label: "Meus Projetos",
      value: clients.toLocaleString("pt-BR"),
      sub: "com atividade vinculada",
      icon: Briefcase,
      accent: "hsl(262 83% 58%)",
    },
    {
      label: "Horas Alocadas",
      value: `${Math.round(totalHours).toLocaleString("pt-BR")}h`,
      sub: `~${activeProjects > 0 ? Math.round(totalHours / activeProjects) : 0}h por projeto`,
      icon: Clock,
      accent: "hsl(200 80% 55%)",
    },
    {
      label: "Concluídas",
      value: doneCount.toLocaleString("pt-BR"),
      sub: `${completionPct}% do total`,
      icon: CheckCircle2,
      accent: "hsl(160 84% 39%)",
    },
    {
      label: "Em Andamento",
      value: pendingCount.toLocaleString("pt-BR"),
      sub: `${totalTasks > 0 ? Math.round((pendingCount / totalTasks) * 100) : 0}% do total`,
      icon: TrendingUp,
      accent: "hsl(270 80% 55%)",
    },
    {
      label: "Atrasadas",
      value: overdueCount.toLocaleString("pt-BR"),
      sub: `${totalTasks > 0 ? Math.round((overdueCount / totalTasks) * 100) : 0}% do total`,
      icon: AlertTriangle,
      accent: "hsl(0 84% 60%)",
    },
  ];

  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 w-full">
      {kpis.map((k, i) => {
        const Icon = k.icon;
        return (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.06, ease: "easeOut" }}
            className="group relative overflow-hidden rounded-2xl border border-white/[0.06] p-5 transition-all duration-500 hover:-translate-y-0.5 hover:border-white/[0.12] hover:shadow-xl w-full"
            style={{
              background: "linear-gradient(145deg, hsl(270 50% 14% / 0.7), hsl(234 45% 10% / 0.5))",
            }}
          >
            {/* Top accent dot */}
            <div
              className="absolute top-3 right-3 h-2 w-2 rounded-full opacity-50 group-hover:opacity-100 transition-opacity"
              style={{ background: k.accent }}
            />

            <div className="flex items-center justify-center gap-2.5 mb-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
                style={{ background: `${k.accent.replace(")", " / 0.15)")}` }}
              >
                <Icon className="h-4.5 w-4.5" style={{ color: k.accent }} />
              </div>
            </div>

            <p className="text-[11px] font-semibold text-white/40 leading-tight text-center mb-1">{k.label}</p>
            <p className="text-2xl font-bold text-white/90 text-center">{k.value}</p>
            <p className="text-[10px] text-white/25 mt-0.5 text-center">{k.sub}</p>
          </motion.div>
        );
      })}
    </div>
  );
}
