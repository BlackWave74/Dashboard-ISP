import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { motion } from "framer-motion";

type Props = {
  done: number;
  pending: number;
  overdue: number;
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl px-3 py-2 border border-white/10 backdrop-blur-xl"
      style={{ background: "linear-gradient(145deg, hsl(270 50% 14% / 0.95), hsl(234 45% 10% / 0.95))" }}
    >
      <p className="text-xs font-bold text-white">{payload[0].name}: {payload[0].value}</p>
    </div>
  );
};

export default function AnalyticsTaskSummary({ done, pending, overdue }: Props) {
  const total = done + pending + overdue;

  const data = [
    { name: "Concluídas", value: done, color: "hsl(160 84% 39%)" },
    { name: "Em andamento", value: pending, color: "hsl(262 83% 58%)" },
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
      color: "hsl(262 83% 58%)",
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="rounded-2xl border border-white/[0.06] p-6 h-full flex flex-col transition-all hover:border-white/[0.10]"
      style={{ background: "linear-gradient(145deg, hsl(270 50% 14% / 0.8), hsl(234 45% 10% / 0.6))" }}
    >
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-bold text-white/90">Resumo de Tarefas</h3>
        <span className="rounded-full bg-gradient-to-r from-[hsl(262_83%_58%/0.15)] to-[hsl(234_89%_64%/0.15)] px-3 py-1 text-xs font-bold text-white/50 border border-white/[0.06]">
          {total} total
        </span>
      </div>

      <div className="flex items-center gap-6 flex-1">
        {/* Donut */}
        {data.length > 0 && (
          <div className="relative h-[150px] w-[150px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={68}
                  paddingAngle={4}
                  dataKey="value"
                  strokeWidth={0}
                  isAnimationActive={true}
                  animationDuration={1500}
                  animationEasing="ease-out"
                >
                  {data.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-white/90">
                {total ? Math.round((done / total) * 100) : 0}%
              </span>
              <span className="text-[0.55rem] text-white/30 font-semibold uppercase tracking-wider">Concluído</span>
            </div>
          </div>
        )}

        {/* Breakdown */}
        <div className="flex-1 space-y-3">
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5" style={{ color: item.color }} />
                    <span className="text-xs text-white/45 font-medium">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white/80">{item.value}</span>
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
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
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.pct}%` }}
                    transition={{ duration: 1, delay: 0.5 + i * 0.15, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ background: item.color }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
