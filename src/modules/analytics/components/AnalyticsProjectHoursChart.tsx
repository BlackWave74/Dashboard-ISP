import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import { motion } from "framer-motion";
import type { ProjectAnalytics } from "../types";

type Props = {
  projects: ProjectAnalytics[];
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      className="rounded-xl px-4 py-3 border border-white/10 shadow-2xl backdrop-blur-xl"
      style={{
        background: "linear-gradient(145deg, hsl(270 50% 14% / 0.95), hsl(234 45% 10% / 0.95))",
      }}
    >
      <p className="text-xs font-bold text-white/90 mb-1">{d.fullName}</p>
      <p className="text-xs text-white/40">{d.client}</p>
      <div className="flex gap-4 mt-2">
        <span className="text-sm font-bold text-white">{d.hours}h</span>
        <span className="text-xs text-white/40">{d.tasks} tarefas</span>
      </div>
    </div>
  );
};

const barColors = [
  "hsl(262 83% 58%)",
  "hsl(250 80% 55%)",
  "hsl(234 89% 64%)",
  "hsl(270 80% 55%)",
  "hsl(200 80% 55%)",
  "hsl(160 84% 39%)",
  "hsl(280 70% 50%)",
  "hsl(220 80% 55%)",
];

export default function AnalyticsProjectHoursChart({ projects }: Props) {
  const data = useMemo(() => {
    return [...projects]
      .filter((p) => p.hoursUsed > 0)
      .sort((a, b) => b.hoursUsed - a.hoursUsed)
      .slice(0, 8)
      .map((p) => ({
        name: p.projectName.length > 16 ? p.projectName.slice(0, 16) + "…" : p.projectName,
        fullName: p.projectName,
        client: p.clientName,
        hours: Math.round(p.hoursUsed),
        tasks: p.tasksDone + p.tasksPending + p.tasksOverdue,
      }));
  }, [projects]);

  if (data.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.35 }}
      className="rounded-2xl border border-white/[0.06] p-6 transition-all hover:border-white/[0.10]"
      style={{ background: "linear-gradient(145deg, hsl(270 50% 14% / 0.8), hsl(234 45% 10% / 0.6))" }}
    >
      <div className="mb-4">
        <h3 className="text-lg font-bold text-white/90">Horas por Projeto</h3>
        <p className="text-xs text-white/30 mt-0.5">Top projetos com mais horas alocadas</p>
      </div>

      <div style={{ height: Math.max(200, data.length * 42) }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
            <XAxis
              type="number"
              tick={{ fill: "hsl(270 10% 30%)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: "hsl(270 10% 45%)", fontSize: 11, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              width={120}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(270 20% 15% / 0.5)" }} />
            <Bar
              dataKey="hours"
              radius={[0, 8, 8, 0]}
              isAnimationActive={true}
              animationDuration={1500}
              animationEasing="ease-out"
              animationBegin={500}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={barColors[i % barColors.length]} />
              ))}
              <LabelList dataKey="hours" position="right" formatter={(v: number) => `${v}h`} style={{ fill: "hsl(270 10% 55%)", fontSize: 11, fontWeight: 600 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
