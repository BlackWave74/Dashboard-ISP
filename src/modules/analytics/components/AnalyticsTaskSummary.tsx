import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

type Props = {
  done: number;
  pending: number;
  overdue: number;
};

const tooltipBg = {
  background: "linear-gradient(145deg, hsl(270 50% 12%), hsl(234 45% 8%))",
  border: "1px solid hsl(270 30% 20%)",
  borderRadius: 12,
  fontSize: 12,
  color: "hsl(210 40% 96%)",
  boxShadow: "0 12px 40px -10px rgba(0,0,0,0.6)",
};

export default function AnalyticsTaskSummary({ done, pending, overdue }: Props) {
  const total = done + pending + overdue;

  const data = [
    { name: "Concluídas", value: done, color: "hsl(160 84% 39%)" },
    { name: "Em andamento", value: pending, color: "hsl(43 97% 52%)" },
    { name: "Atrasadas", value: overdue, color: "hsl(0 84% 60%)" },
  ].filter((d) => d.value > 0);

  const items = [
    {
      icon: CheckCircle2,
      label: "Concluídas",
      value: done,
      color: "hsl(160 84% 39%)",
      pct: total ? Math.round((done / total) * 100) : 0,
    },
    {
      icon: Clock,
      label: "Em andamento",
      value: pending,
      color: "hsl(43 97% 52%)",
      pct: total ? Math.round((pending / total) * 100) : 0,
    },
    {
      icon: AlertTriangle,
      label: "Atrasadas",
      value: overdue,
      color: "hsl(0 84% 60%)",
      pct: total ? Math.round((overdue / total) * 100) : 0,
    },
  ];

  return (
    <div
      className="rounded-2xl border border-white/[0.06] p-6 h-full flex flex-col transition-all"
      style={{ background: "linear-gradient(145deg, hsl(270 50% 14% / 0.8), hsl(234 45% 10% / 0.6))" }}
    >
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-bold text-white/90">Resumo de Tarefas</h3>
        <span className="rounded-full bg-gradient-to-r from-[hsl(262_83%_58%/0.2)] to-[hsl(234_89%_64%/0.2)] px-3 py-1 text-xs font-bold text-white/60 border border-white/[0.06]">
          {total} total
        </span>
      </div>

      <div className="flex items-center gap-6 flex-1">
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
                <Tooltip contentStyle={tooltipBg} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-white/90">
                {total ? Math.round((done / total) * 100) : 0}%
              </span>
              <span className="text-[0.6rem] text-white/35 font-semibold uppercase tracking-wider">Concluído</span>
            </div>
          </div>
        )}

        {/* Breakdown */}
        <div className="flex-1 space-y-4">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" style={{ color: item.color }} />
                    <span className="text-xs text-white/50 font-medium">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white/80">{item.value}</span>
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[10px] font-bold border border-white/[0.06]"
                      style={{
                        color: item.color,
                        background: `${item.color.replace(")", " / 0.1)")}`,
                      }}
                    >
                      {item.pct}%
                    </span>
                  </div>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
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
