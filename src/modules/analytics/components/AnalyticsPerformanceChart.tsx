import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ElapsedTimeRecord } from "@/modules/tasks/types";

type Props = {
  times: ElapsedTimeRecord[];
};

const periods = [
  { key: "7d", label: "7D" },
  { key: "30d", label: "1M" },
  { key: "90d", label: "3M" },
  { key: "180d", label: "6M" },
  { key: "all", label: "Tudo" },
] as const;

const tooltipStyle = {
  background: "hsl(258 30% 10%)",
  border: "1px solid hsl(260 22% 20%)",
  borderRadius: 12,
  fontSize: 12,
  color: "hsl(210 40% 96%)",
  boxShadow: "0 12px 40px -10px rgba(0,0,0,0.6)",
  padding: "8px 12px",
};

export default function AnalyticsPerformanceChart({ times }: Props) {
  const [period, setPeriod] = useState<string>("180d");

  const chartData = useMemo(() => {
    const now = new Date();
    const cutoff =
      period === "all"
        ? null
        : new Date(now.getTime() - Number(period.replace("d", "")) * 24 * 60 * 60 * 1000);

    const daily: Record<string, number> = {};
    times.forEach((t) => {
      const d = t.inserted_at ? new Date(String(t.inserted_at)) : null;
      if (!d || Number.isNaN(d.getTime())) return;
      if (cutoff && d < cutoff) return;
      const key = d.toISOString().slice(0, 10);
      daily[key] = (daily[key] ?? 0) + (t.seconds ?? 0) / 3600;
    });

    const sorted = Object.entries(daily)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, hours]) => {
        const d = new Date(date);
        const label = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
        return { date: label, hours: Math.round(hours * 10) / 10 };
      });

    // Aggregate to max 30 points for smooth curve
    if (sorted.length > 30) {
      const step = Math.ceil(sorted.length / 30);
      const aggregated: typeof sorted = [];
      for (let i = 0; i < sorted.length; i += step) {
        const chunk = sorted.slice(i, i + step);
        const totalHours = chunk.reduce((s, c) => s + c.hours, 0);
        aggregated.push({ date: chunk[0].date, hours: Math.round(totalHours * 10) / 10 });
      }
      return aggregated;
    }

    return sorted;
  }, [times, period]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="ana-card ana-glow p-5 space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[hsl(var(--ana-text))]">Desempenho ao Longo do Tempo</h3>
          <p className="mt-0.5 text-xs text-[hsl(var(--ana-text-muted))]">
            Horas registradas por período
          </p>
        </div>
        <div className="flex gap-1 rounded-lg bg-[hsl(var(--ana-surface))] p-1 border border-[hsl(var(--ana-border))]">
          {periods.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                period === p.key
                  ? "bg-[hsl(var(--ana-purple))] text-white shadow-md"
                  : "text-[hsl(var(--ana-text-muted))] hover:text-[hsl(var(--ana-text))]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {chartData.length > 0 ? (
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="anaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(262 83% 58%)" stopOpacity={0.4} />
                  <stop offset="50%" stopColor="hsl(234 89% 64%)" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="hsl(234 89% 64%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="anaStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="hsl(262 83% 58%)" />
                  <stop offset="100%" stopColor="hsl(234 89% 64%)" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(260 22% 14%)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: "hsl(215 15% 45%)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: "hsl(215 15% 45%)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number) => [`${v}h`, "Horas"]}
                labelStyle={{ color: "hsl(215 15% 55%)", marginBottom: 4 }}
              />
              <Area
                type="monotone"
                dataKey="hours"
                stroke="url(#anaStroke)"
                strokeWidth={2.5}
                fill="url(#anaGrad)"
                dot={false}
                activeDot={{
                  r: 5,
                  fill: "hsl(262 83% 58%)",
                  stroke: "hsl(260 35% 6%)",
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex h-[280px] items-center justify-center">
          <p className="text-sm text-[hsl(var(--ana-text-muted))]">Sem dados para o período selecionado.</p>
        </div>
      )}
    </motion.div>
  );
}
