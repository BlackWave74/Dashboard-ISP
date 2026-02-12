import { useMemo, useState } from "react";
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

const periodOptions = [
  { key: "7d", label: "7D", days: 7 },
  { key: "30d", label: "1M", days: 30 },
  { key: "90d", label: "3M", days: 90 },
  { key: "180d", label: "6M", days: 180 },
  { key: "all", label: "Tudo", days: 0 },
] as const;

export default function AnalyticsPerformanceChart({ times }: Props) {
  const [period, setPeriod] = useState<string>("180d");

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
    <div className="rounded-xl border border-border/50 bg-card/80 p-5">
      {/* Header */}
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">Desempenho do Projeto</h3>
          <p className="text-xs text-muted-foreground">Horas registradas ao longo do tempo</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Period filters */}
          <div className="flex gap-0.5 rounded-lg border border-border/50 bg-muted/50 p-0.5">
            {periodOptions.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                  period === p.key
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="mt-3 mb-4 flex gap-6 text-xs">
        <div>
          <span className="text-muted-foreground">Total período</span>
          <p className="text-lg font-bold text-foreground">{Math.round(totalHours).toLocaleString("pt-BR")}h</p>
        </div>
        <div>
          <span className="text-muted-foreground">Pico</span>
          <p className="text-lg font-bold text-primary">{peakHours.toLocaleString("pt-BR")}h</p>
        </div>
        <div>
          <span className="text-muted-foreground">Média/dia</span>
          <p className="text-lg font-bold text-foreground">
            {chartData.length > 0 ? (totalHours / chartData.length).toFixed(1) : "0"}h
          </p>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 ? (
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="anaGradMain" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(262 83% 58%)" stopOpacity={0.35} />
                  <stop offset="40%" stopColor="hsl(234 89% 64%)" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="hsl(234 89% 64%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="anaStrokeGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="hsl(262 83% 58%)" />
                  <stop offset="50%" stopColor="hsl(234 89% 64%)" />
                  <stop offset="100%" stopColor="hsl(200 80% 60%)" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 25% 16%)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: "hsl(215 20% 60%)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: "hsl(215 20% 60%)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(222 40% 8%)",
                  border: "1px solid hsl(222 25% 16%)",
                  borderRadius: 10,
                  fontSize: 12,
                  color: "hsl(210 40% 96%)",
                  boxShadow: "0 12px 40px -10px rgba(0,0,0,0.6)",
                }}
                formatter={(v: number) => [`${v}h`, "Horas"]}
                labelStyle={{ color: "hsl(215 15% 55%)", marginBottom: 4 }}
              />
              <Area
                type="monotone"
                dataKey="hours"
                stroke="url(#anaStrokeGrad)"
                strokeWidth={2.5}
                fill="url(#anaGradMain)"
                dot={false}
                activeDot={{
                  r: 5,
                  fill: "hsl(262 83% 58%)",
                  stroke: "hsl(222 40% 8%)",
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex h-[300px] items-center justify-center">
          <p className="text-sm text-muted-foreground">Sem dados para o período selecionado.</p>
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary" /> Horas Registradas
        </span>
      </div>
    </div>
  );
}
