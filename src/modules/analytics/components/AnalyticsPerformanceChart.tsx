import { useMemo, useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { motion } from "framer-motion";
import type { ElapsedTimeRecord } from "@/modules/tasks/types";

type Props = {
  times: ElapsedTimeRecord[];
};

const periodOptions = [
  { key: "7d", label: "7 dias", days: 7 },
  { key: "30d", label: "30 dias", days: 30 },
  { key: "90d", label: "3 meses", days: 90 },
  { key: "180d", label: "6 meses", days: 180 },
  { key: "all", label: "Tudo", days: 0 },
] as const;

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl px-4 py-3 border border-white/10 shadow-2xl backdrop-blur-xl"
      style={{
        background: "linear-gradient(145deg, hsl(270 50% 14% / 0.95), hsl(234 45% 10% / 0.95))",
      }}
    >
      <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">{label}</p>
      <p className="text-lg font-bold text-white">
        {payload[0].value}
        <span className="text-xs text-white/50 ml-1">horas</span>
      </p>
    </div>
  );
};

export default function AnalyticsPerformanceChart({ times }: Props) {
  const [period, setPeriod] = useState<string>("180d");
  const [chartType, setChartType] = useState<"area" | "bar">("area");
  const [animKey, setAnimKey] = useState(0);

  // Re-trigger animation on period/type change
  useEffect(() => {
    setAnimKey((k) => k + 1);
  }, [period, chartType]);

  const chartData = useMemo(() => {
    const now = new Date();
    const selectedPeriod = periodOptions.find((p) => p.key === period);
    const cutoff =
      selectedPeriod && selectedPeriod.days > 0
        ? new Date(now.getTime() - selectedPeriod.days * 24 * 60 * 60 * 1000)
        : null;

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

  const totalHours = chartData.reduce((s, d) => s + d.hours, 0);
  const peakHours = chartData.length > 0 ? Math.max(...chartData.map((d) => d.hours)) : 0;
  const avgHours = chartData.length > 0 ? totalHours / chartData.length : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="rounded-2xl border border-white/[0.06] p-6 transition-all hover:border-white/[0.10]"
      style={{ background: "linear-gradient(145deg, hsl(270 50% 14% / 0.8), hsl(234 45% 10% / 0.6))" }}
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h3 className="text-lg font-bold text-white/90">Desempenho do Projeto</h3>
          <p className="text-xs text-white/35 mt-0.5">Horas registradas ao longo do tempo</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Chart type toggle */}
          <div className="flex gap-0.5 rounded-xl border border-white/[0.06] bg-white/[0.03] p-1">
            {(["area", "bar"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setChartType(type)}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all ${
                  chartType === type
                    ? "bg-gradient-to-r from-[hsl(262_83%_58%)] to-[hsl(234_89%_64%)] text-white shadow-lg shadow-[hsl(262_83%_58%/0.25)]"
                    : "text-white/25 hover:text-white/50"
                }`}
              >
                {type === "area" ? "Montanha" : "Barras"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Period filters */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        {periodOptions.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              period === p.key
                ? "bg-gradient-to-r from-[hsl(262_83%_58%)] to-[hsl(234_89%_64%)] text-white shadow-lg shadow-[hsl(262_83%_58%/0.3)]"
                : "text-white/25 hover:text-white/50 bg-white/[0.03] border border-white/[0.04]"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Quick stats */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          { label: "Total período", value: `${Math.round(totalHours).toLocaleString("pt-BR")}h`, gradient: false },
          { label: "Pico diário", value: `${peakHours.toLocaleString("pt-BR")}h`, gradient: true },
          { label: "Média/dia", value: `${avgHours.toFixed(1)}h`, gradient: false },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-3 text-center"
          >
            <span className="text-[10px] uppercase tracking-wider text-white/25 font-semibold block">{s.label}</span>
            <p className={`text-xl font-bold mt-1 ${s.gradient ? "bg-gradient-to-r from-[hsl(262_83%_58%)] to-[hsl(234_89%_64%)] bg-clip-text text-transparent" : "text-white/80"}`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 0 ? (
        <motion.div
          key={animKey}
          initial={{ opacity: 0, scaleY: 0.3 }}
          animate={{ opacity: 1, scaleY: 1 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformOrigin: "bottom" }}
          className="h-[300px] w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "area" ? (
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="anaGradMountain" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(262 83% 58%)" stopOpacity={0.6} />
                    <stop offset="25%" stopColor="hsl(250 80% 60%)" stopOpacity={0.35} />
                    <stop offset="50%" stopColor="hsl(234 89% 64%)" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="hsl(234 45% 10%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="anaStrokeMountain" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="hsl(262 83% 70%)" />
                    <stop offset="50%" stopColor="hsl(234 89% 74%)" />
                    <stop offset="100%" stopColor="hsl(200 80% 70%)" />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(270 15% 15%)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "hsl(270 10% 35%)", fontSize: 10, fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: "hsl(270 10% 35%)", fontSize: 10, fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="hours"
                  stroke="url(#anaStrokeMountain)"
                  strokeWidth={3}
                  fill="url(#anaGradMountain)"
                  dot={false}
                  activeDot={{
                    r: 7,
                    fill: "hsl(262 83% 58%)",
                    stroke: "hsl(262 83% 70%)",
                    strokeWidth: 3,
                    filter: "url(#glow)",
                  }}
                  isAnimationActive={true}
                  animationDuration={2000}
                  animationEasing="ease-out"
                  animationBegin={200}
                />
              </AreaChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="anaBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(262 83% 65%)" />
                    <stop offset="100%" stopColor="hsl(234 89% 55%)" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(270 15% 15%)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "hsl(270 10% 35%)", fontSize: 10, fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: "hsl(270 10% 35%)", fontSize: 10, fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="hours"
                  fill="url(#anaBarGrad)"
                  radius={[6, 6, 0, 0]}
                  isAnimationActive={true}
                  animationDuration={1500}
                  animationEasing="ease-out"
                  animationBegin={200}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </motion.div>
      ) : (
        <div className="flex h-[300px] items-center justify-center">
          <p className="text-sm text-white/25">Sem dados para o período selecionado.</p>
        </div>
      )}
    </motion.div>
  );
}
