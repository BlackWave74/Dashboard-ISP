import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

type Props = {
  done: number;
  pending: number;
  overdue: number;
};

export default function AnalyticsTaskSummary({ done, pending, overdue }: Props) {
  const total = done + pending + overdue;

  const data = [
    { name: "Concluídas", value: done, color: "hsl(160 84% 39%)" },
    { name: "Em andamento", value: pending, color: "hsl(38 92% 50%)" },
    { name: "Atrasadas", value: overdue, color: "hsl(0 84% 60%)" },
  ].filter((d) => d.value > 0);

  const items = [
    {
      icon: CheckCircle2,
      label: "Concluídas",
      value: done,
      color: "hsl(160 84% 39%)",
      pct: total ? Math.round((done / total) * 100) : 0,
      badgeBg: "bg-emerald-500/15",
      badgeText: "text-emerald-400",
    },
    {
      icon: Clock,
      label: "Em andamento",
      value: pending,
      color: "hsl(38 92% 50%)",
      pct: total ? Math.round((pending / total) * 100) : 0,
      badgeBg: "bg-amber-500/15",
      badgeText: "text-amber-400",
    },
    {
      icon: AlertTriangle,
      label: "Atrasadas",
      value: overdue,
      color: "hsl(0 84% 60%)",
      pct: total ? Math.round((overdue / total) * 100) : 0,
      badgeBg: "bg-destructive/15",
      badgeText: "text-destructive",
    },
  ];

  return (
    <div className="rounded-xl border border-border/50 bg-card/80 p-5 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">Resumo de Tarefas</h3>
        <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
          {total} total
        </span>
      </div>

      <div className="mt-4 flex items-center gap-5 flex-1">
        {/* Donut */}
        {data.length > 0 && (
          <div className="relative h-[160px] w-[160px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {data.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-foreground">
                {total ? Math.round((done / total) * 100) : 0}%
              </span>
              <span className="text-[0.65rem] text-muted-foreground">Concluído</span>
            </div>
          </div>
        )}

        {/* Breakdown */}
        <div className="flex-1 space-y-3">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5" style={{ color: item.color }} />
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">{item.value}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${item.badgeBg} ${item.badgeText}`}
                    >
                      {item.pct}%
                    </span>
                  </div>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${item.pct}%`, background: item.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
