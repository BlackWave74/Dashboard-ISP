import { motion } from "framer-motion";
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

type Props = {
  done: number;
  pending: number;
  overdue: number;
};

const tooltipStyle = {
  background: "hsl(258 30% 10%)",
  border: "1px solid hsl(260 22% 20%)",
  borderRadius: 12,
  fontSize: 12,
  color: "hsl(210 40% 96%)",
  boxShadow: "0 12px 40px -10px rgba(0,0,0,0.6)",
};

export default function AnalyticsTaskSummary({ done, pending, overdue }: Props) {
  const total = done + pending + overdue;
  const data = [
    { name: "Concluídas", value: done, color: "hsl(160 84% 39%)" },
    { name: "Em andamento", value: pending, color: "hsl(38 92% 50%)" },
    { name: "Atrasadas", value: overdue, color: "hsl(0 84% 60%)" },
  ].filter((d) => d.value > 0);

  const items = [
    { icon: CheckCircle2, label: "Concluídas", value: done, color: "hsl(var(--ana-green))", pct: total ? Math.round((done / total) * 100) : 0 },
    { icon: Clock, label: "Em andamento", value: pending, color: "hsl(var(--ana-amber))", pct: total ? Math.round((pending / total) * 100) : 0 },
    { icon: AlertTriangle, label: "Atrasadas", value: overdue, color: "hsl(var(--ana-red))", pct: total ? Math.round((overdue / total) * 100) : 0 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="ana-card p-5 space-y-4"
    >
      <h3 className="text-sm font-semibold text-[hsl(var(--ana-text))]">Resumo de Tarefas</h3>

      <div className="flex items-center gap-6">
        {data.length > 0 && (
          <div className="h-[160px] w-[160px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={72}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {data.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="flex-1 space-y-3">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="space-y-1">
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5" style={{ color: item.color }} />
                  <span className="text-xs text-[hsl(var(--ana-text-muted))]">{item.label}</span>
                  <span className="ml-auto text-xs font-bold text-[hsl(var(--ana-text))]">{item.value}</span>
                  <span className="text-[10px] text-[hsl(var(--ana-text-muted))]">{item.pct}%</span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-[hsl(var(--ana-border))]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.pct}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
