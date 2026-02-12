import { useMemo, useState } from "react";
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
import type { ElapsedTimeRecord } from "@/modules/tasks/types";

type Props = {
  times: ElapsedTimeRecord[];
};

const periodOptions = [
  { key: "7d", label: "7D", days: 7 },
  { key: "30d", label: "1M", days: 30 },
  { key: "90d", label: "3M", days: 90 },
  { key: "180d", label: "6M", days: 180 },
  { key: "all", label: "Tudo", days: 0 },
] as const;

const tooltipBg = {
  background: "linear-gradient(145deg, hsl(270 50% 12%), hsl(234 45% 8%))",
  border: "1px solid hsl(270 30% 20%)",
  borderRadius: 14,
  fontSize: 12,
  color: "hsl(210 40% 96%)",
  boxShadow: "0 20px 60px -15px rgba(0,0,0,0.7)",
  padding: "10px 14px",
};

export default function AnalyticsPerformanceChart({ times }: Props) {
  const [period, setPeriod] = useState<string>("180d");
  const [chartType, setChartType] = useState<"area" | "bar">("area");

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

  return (
    <div
      className="rounded-2xl border border-white/[0.06] p-6 transition-all"
      style={{ background: "linear-gradient(145deg, hsl(270 50% 14% / 0.8), hsl(234 45% 10% / 0.6))" }}
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h3 className="text-base font-bold text-white/90">Desempenho do Projeto</h3>
          <p className="text-xs text-white/40 mt-0.5">Horas registradas ao longo do tempo</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Chart type toggle */}
          <div className="flex gap-0.5 rounded-lg border border-white/[0.06] bg-white/[0.03] p-0.5">
            {(["area", "bar"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setChartType(type)}
                className={`rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-all ${
                  chartType === type
                    ? "bg-gradient-to-r from-[hsl(262_83%_58%)] to-[hsl(234_89%_64%)] text-white shadow-lg"
                    : "text-white/30 hover:text-white/60"
                }`}
              >
                {type === "area" ? "Montanha" : "Barras"}
              </button>
            ))}
          </div>
          {/* Period filters */}
          <div className="flex gap-0.5 rounded-lg border border-white/[0.06] bg-white/[0.03] p-0.5">
            {periodOptions.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                  period === p.key
                    ? "bg-gradient-to-r from-[hsl(262_83%_58%)] to-[hsl(234_89%_64%)] text-white shadow-lg shadow-[hsl(262_83%_58%/0.3)]"
                    : "text-white/30 hover:text-white/60"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="mb-5 flex gap-8">
        {[
          { label: "Total período", value: `${Math.round(totalHours).toLocaleString("pt-BR")}h`, highlight: false },
          { label: "Pico", value: `${peakHours.toLocaleString("pt-BR")}h`, highlight: true },
          { label: "Média/dia", value: `${chartData.length > 0 ? (totalHours / chartData.length).toFixed(1) : "0"}h`, highlight: false },
        ].map((s) => (
          <div key={s.label}>
            <span className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">{s.label}</span>
            <p className={`text-xl font-bold ${s.highlight ? "bg-gradient-to-r from-[hsl(262_83%_58%)] to-[hsl(234_89%_64%)] bg-clip-text text-transparent" : "text-white/80"}`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 0 ? (
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "area" ? (
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="anaGradMountain" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(262 83% 58%)" stopOpacity={0.5} />
                    <stop offset="30%" stopColor="hsl(234 89% 64%)" stopOpacity={0.25} />
                    <stop offset="70%" stopColor="hsl(234 89% 64%)" stopOpacity={0.08} />
                    <stop offset="100%" stopColor="hsl(234 45% 10%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="anaStrokeMountain" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="hsl(262 83% 65%)" />
                    <stop offset="50%" stopColor="hsl(234 89% 70%)" />
                    <stop offset="100%" stopColor="hsl(200 80% 65%)" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(270 20% 15%)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "hsl(270 10% 40%)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: "hsl(270 10% 40%)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={tooltipBg} formatter={(v: number) => [`${v}h`, "Horas"]} />
                <Area
                  type="monotone"
                  dataKey="hours"
                  stroke="url(#anaStrokeMountain)"
                  strokeWidth={2.5}
                  fill="url(#anaGradMountain)"
                  dot={false}
                  activeDot={{
                    r: 6,
                    fill: "hsl(262 83% 58%)",
                    stroke: "hsl(270 50% 12%)",
                    strokeWidth: 3,
                  }}
                />
              </AreaChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="anaBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(262 83% 58%)" />
                    <stop offset="100%" stopColor="hsl(234 89% 64%)" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(270 20% 15%)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "hsl(270 10% 40%)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: "hsl(270 10% 40%)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={tooltipBg} formatter={(v: number) => [`${v}h`, "Horas"]} />
                <Bar dataKey="hours" fill="url(#anaBarGrad)" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex h-[300px] items-center justify-center">
          <p className="text-sm text-white/30">Sem dados para o período selecionado.</p>
        </div>
      )}
    </div>
  );
}
