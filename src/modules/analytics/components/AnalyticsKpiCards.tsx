import { Users, FolderKanban, Clock, ListChecks, TrendingUp, TrendingDown } from "lucide-react";

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
      desc: "Clientes com projetos ativos",
      icon: Users,
      iconBg: "bg-primary/20",
      iconColor: "text-primary",
      change: `${activeProjects} projetos`,
      up: true,
    },
    {
      label: "Projetos Ativos",
      value: activeProjects.toLocaleString("pt-BR"),
      desc: "Com tarefas em andamento",
      icon: FolderKanban,
      iconBg: "bg-violet-500/20",
      iconColor: "text-violet-400",
      change: `${totalTasks} tarefas`,
      up: true,
    },
    {
      label: "Horas Alocadas",
      value: `${Math.round(totalHours).toLocaleString("pt-BR")}h`,
      desc: "Total registrado no período",
      icon: Clock,
      iconBg: "bg-emerald-500/20",
      iconColor: "text-emerald-400",
      change: `+${Math.round(totalHours / Math.max(activeProjects, 1))}h/projeto`,
      up: true,
    },
    {
      label: "Taxa de Conclusão",
      value: `${completionRate}%`,
      desc: `${doneCount} de ${totalTasks} tarefas`,
      icon: ListChecks,
      iconBg: "bg-amber-500/20",
      iconColor: "text-amber-400",
      change: overdueRate > 0 ? `${overdueRate}% atrasadas` : "Sem atrasos",
      up: overdueRate === 0,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((k, i) => (
        <div
          key={k.label}
          className="group relative overflow-hidden rounded-xl border border-border/50 bg-card/80 p-5 transition-colors hover:border-border"
          style={{ opacity: 0, animation: `fadeSlideUp 0.5s ease-out ${i * 100}ms forwards` }}
        >
          {/* Subtle glow */}
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/5 blur-2xl transition-opacity group-hover:opacity-100 opacity-0" />

          <div className="relative flex items-start justify-between">
            <div className={`grid h-10 w-10 place-items-center rounded-lg ${k.iconBg}`}>
              <k.icon className={`h-5 w-5 ${k.iconColor}`} />
            </div>
            <span
              className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
                k.up ? "bg-emerald-500/15 text-emerald-400" : "bg-destructive/15 text-destructive"
              }`}
            >
              {k.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {k.change}
            </span>
          </div>

          <p className="mt-4 text-2xl font-bold text-foreground">{k.value}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{k.label}</p>
          <p className="mt-1 text-[0.7rem] text-muted-foreground/70">{k.desc}</p>
        </div>
      ))}
    </div>
  );
}
