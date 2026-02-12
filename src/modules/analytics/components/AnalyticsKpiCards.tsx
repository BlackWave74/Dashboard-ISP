import { Users, FolderKanban, Clock, ListChecks, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

type Props = {
  clients: number;
  activeProjects: number;
  totalHours: number;
  totalTasks: number;
  doneCount: number;
  overdueCount: number;
};

export default function AnalyticsKpiCards({ clients, activeProjects, totalHours, totalTasks, doneCount, overdueCount }: Props) {
  const completionRate = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;
  const overdueRate = totalTasks > 0 ? Math.round((overdueCount / totalTasks) * 100) : 0;

  const kpis = [
    {
      label: "Clientes Atendidos",
      value: clients.toLocaleString("pt-BR"),
      desc: "Clientes com projetos vinculados",
      icon: Users,
      color: "from-[hsl(270_80%_55%)] to-[hsl(234_89%_55%)]",
      glow: "hsl(270 80% 55% / 0.25)",
      badge: `${activeProjects} projetos`,
      badgeUp: true,
    },
    {
      label: "Projetos Ativos",
      value: activeProjects.toLocaleString("pt-BR"),
      desc: "Com tarefas em andamento",
      icon: FolderKanban,
      color: "from-[hsl(250_80%_60%)] to-[hsl(270_80%_55%)]",
      glow: "hsl(250 80% 60% / 0.25)",
      badge: `${totalTasks} tarefas`,
      badgeUp: true,
    },
    {
      label: "Horas Alocadas",
      value: `${Math.round(totalHours).toLocaleString("pt-BR")}h`,
      desc: "Total registrado no período",
      icon: Clock,
      color: "from-[hsl(160_84%_39%)] to-[hsl(200_80%_50%)]",
      glow: "hsl(160 84% 39% / 0.25)",
      badge: `~${Math.round(totalHours / Math.max(activeProjects, 1))}h/projeto`,
      badgeUp: true,
    },
    {
      label: "Taxa de Conclusão",
      value: `${completionRate}%`,
      desc: `${doneCount} concluídas de ${totalTasks}`,
      icon: overdueRate > 0 ? AlertTriangle : ListChecks,
      color: overdueRate > 20
        ? "from-[hsl(0_84%_60%)] to-[hsl(38_92%_50%)]"
        : "from-[hsl(234_89%_64%)] to-[hsl(260_80%_55%)]",
      glow: overdueRate > 20 ? "hsl(0 84% 60% / 0.25)" : "hsl(234 89% 64% / 0.25)",
      badge: overdueRate > 0 ? `${overdueCount} atrasadas` : "Sem atrasos",
      badgeUp: overdueRate === 0,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((k, i) => (
        <div
          key={k.label}
          className="group relative overflow-hidden rounded-2xl border border-white/[0.06] p-5 transition-all duration-500 hover:-translate-y-1 hover:border-white/[0.12] hover:shadow-2xl"
          style={{
            background: "linear-gradient(145deg, hsl(270 50% 14% / 0.8), hsl(234 45% 10% / 0.6))",
            opacity: 0,
            animation: `fadeSlideUp 0.6s ease-out ${i * 120}ms forwards`,
          }}
        >
          {/* Corner glow on hover */}
          <div
            className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
            style={{ background: k.glow }}
          />

          {/* Top accent line */}
          <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${k.color} opacity-50 transition-opacity duration-500 group-hover:opacity-100`} />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${k.color} shadow-lg transition-transform duration-300 group-hover:scale-110`}>
                <k.icon className="h-5 w-5 text-white" />
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  k.badgeUp
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-[hsl(0_84%_60%/0.15)] text-[hsl(0_84%_60%)]"
                }`}
              >
                {k.badgeUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {k.badge}
              </span>
            </div>

            <p className="text-2xl font-bold text-white/90">{k.value}</p>
            <p className="mt-0.5 text-xs font-semibold text-white/60">{k.label}</p>
            <p className="mt-1 text-[0.65rem] text-white/35">{k.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
