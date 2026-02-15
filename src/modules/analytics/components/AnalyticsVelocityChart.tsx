import { useMemo } from "react";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import type { TaskRecord } from "@/modules/tasks/types";

type Props = {
  tasks: TaskRecord[];
  classifyTask: (t: TaskRecord) => "done" | "overdue" | "pending";
};

const WEEKS = 12;

export default function AnalyticsVelocityChart({ tasks, classifyTask }: Props) {
  const { weekData, avgVelocity, trend } = useMemo(() => {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - WEEKS * 7);

    // Group completed tasks by week
    const weeks: { label: string; count: number; startDate: Date }[] = [];
    for (let w = 0; w < WEEKS; w++) {
      const ws = new Date(startDate);
      ws.setDate(ws.getDate() + w * 7);
      const we = new Date(ws);
      we.setDate(we.getDate() + 7);
      weeks.push({
        label: ws.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
        count: 0,
        startDate: ws,
      });
    }

    // Count completed tasks per week using deadline/due_date or created_at
    const doneTasks = tasks.filter((t) => classifyTask(t) === "done");
    doneTasks.forEach((t) => {
      const raw = t.deadline ?? t.due_date ?? t.dueDate ?? t.created_at ?? t.createdAt;
      if (!raw) return;
      const d = new Date(String(raw));
      if (Number.isNaN(d.getTime())) return;
      if (d < startDate || d > now) return;

      const diffMs = d.getTime() - startDate.getTime();
      const weekIdx = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
      if (weekIdx >= 0 && weekIdx < WEEKS) {
        weeks[weekIdx].count++;
      }
    });

    const avg = weeks.reduce((s, w) => s + w.count, 0) / WEEKS;

    // Trend: compare last 4 weeks vs first 4 weeks
    const firstHalf = weeks.slice(0, Math.floor(WEEKS / 2)).reduce((s, w) => s + w.count, 0);
    const secondHalf = weeks.slice(Math.floor(WEEKS / 2)).reduce((s, w) => s + w.count, 0);
    const trend: "up" | "down" | "flat" = secondHalf > firstHalf * 1.15 ? "up" : secondHalf < firstHalf * 0.85 ? "down" : "flat";

    return { weekData: weeks, avgVelocity: avg, trend };
  }, [tasks, classifyTask]);

  const maxCount = Math.max(...weekData.map((w) => w.count), 1);

  // Build SVG path for area chart
  const chartW = 340;
  const chartH = 100;
  const padX = 0;
  const padY = 10;

  const points = weekData.map((w, i) => ({
    x: padX + (i / (WEEKS - 1)) * (chartW - padX * 2),
    y: padY + (1 - w.count / maxCount) * (chartH - padY * 2),
  }));

  // Smooth curve using cubic bezier
  const buildPath = () => {
    if (points.length < 2) return "";
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx1 = prev.x + (curr.x - prev.x) * 0.4;
      const cpx2 = curr.x - (curr.x - prev.x) * 0.4;
      d += ` C ${cpx1} ${prev.y}, ${cpx2} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    return d;
  };

  const linePath = buildPath();
  const areaPath = linePath + ` L ${points[points.length - 1].x} ${chartH} L ${points[0].x} ${chartH} Z`;

  // Average line
  const avgY = padY + (1 - avgVelocity / maxCount) * (chartH - padY * 2);

  const trendConfig = {
    up: { label: "Acelerando", color: "hsl(160 84% 39%)", emoji: "🚀" },
    down: { label: "Desacelerando", color: "hsl(0 84% 60%)", emoji: "📉" },
    flat: { label: "Estável", color: "hsl(200 80% 55%)", emoji: "➡️" },
  };

  const tc = trendConfig[trend];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.35 }}
      className="rounded-2xl border border-white/[0.06] p-6 transition-all hover:border-white/[0.10]"
      style={{ background: "linear-gradient(145deg, hsl(270 50% 14% / 0.8), hsl(234 45% 10% / 0.6))" }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "hsl(160 84% 39% / 0.15)" }}>
            <Zap className="h-4 w-4" style={{ color: "hsl(160 84% 39%)" }} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white/90">Velocidade de Entrega</h3>
            <p className="text-[10px] text-white/30">Tarefas concluídas por semana</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold"
            style={{ color: tc.color, background: `${tc.color.replace(")", " / 0.15)")}` }}
          >
            {tc.emoji} {tc.label}
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="relative">
        <svg width="100%" viewBox={`0 0 ${chartW} ${chartH + 20}`} preserveAspectRatio="none" className="overflow-visible">
          {/* Area fill */}
          <motion.path
            d={areaPath}
            fill="url(#velocityFill)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          />

          {/* Line */}
          <motion.path
            d={linePath}
            fill="none"
            stroke="url(#velocityStroke)"
            strokeWidth={2.5}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.3, duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          />

          {/* Average line */}
          <line
            x1={0}
            y1={avgY}
            x2={chartW}
            y2={avgY}
            stroke="hsl(262 83% 58% / 0.3)"
            strokeWidth={1}
            strokeDasharray="4 4"
          />
          <text x={chartW - 2} y={avgY - 4} textAnchor="end" className="text-[8px] fill-white/25">
            média {avgVelocity.toFixed(1)}/sem
          </text>

          {/* Data points */}
          {points.map((p, i) => (
            <motion.g key={i}>
              <motion.circle
                cx={p.x}
                cy={p.y}
                r={3}
                fill="hsl(262 83% 58%)"
                stroke="hsl(270 50% 12%)"
                strokeWidth={2}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.8 + i * 0.06 }}
              />
              {/* Pulse on last point */}
              {i === points.length - 1 && (
                <motion.circle
                  cx={p.x}
                  cy={p.y}
                  r={3}
                  fill="none"
                  stroke="hsl(262 83% 58%)"
                  strokeWidth={1}
                  initial={{ r: 3, opacity: 0.8 }}
                  animate={{ r: 12, opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
                />
              )}
            </motion.g>
          ))}

          {/* Week labels (show every other) */}
          {weekData.map((w, i) => (
            i % 2 === 0 && (
              <text
                key={i}
                x={points[i].x}
                y={chartH + 14}
                textAnchor="middle"
                className="text-[7px] fill-white/20"
              >
                {w.label}
              </text>
            )
          ))}

          <defs>
            <linearGradient id="velocityStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="hsl(234 89% 64%)" />
              <stop offset="100%" stopColor="hsl(160 84% 39%)" />
            </linearGradient>
            <linearGradient id="velocityFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(262 83% 58% / 0.2)" />
              <stop offset="100%" stopColor="hsl(262 83% 58% / 0)" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Bottom stats */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          { label: "Média/semana", value: avgVelocity.toFixed(1) },
          { label: "Melhor semana", value: maxCount.toString() },
          { label: "Total entregue", value: weekData.reduce((s, w) => s + w.count, 0).toString() },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 + i * 0.1 }}
            className="rounded-xl border border-white/[0.04] bg-white/[0.02] py-2 px-2 text-center"
          >
            <p className="text-sm font-bold text-white/80">{s.value}</p>
            <p className="text-[8px] text-white/25">{s.label}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
