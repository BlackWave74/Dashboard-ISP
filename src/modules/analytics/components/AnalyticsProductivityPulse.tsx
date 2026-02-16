import { useMemo } from "react";
import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import type { TaskRecord } from "@/modules/tasks/types";

type Props = {
  tasks: TaskRecord[];
  classifyTask: (t: TaskRecord) => "done" | "overdue" | "pending";
};

const WEEKS = 16;

export default function AnalyticsProductivityPulse({ tasks, classifyTask }: Props) {
  // Build weekly done/overdue data for the last WEEKS weeks
  const weeklyData = useMemo(() => {
    const now = Date.now();
    const msPerWeek = 7 * 24 * 3600 * 1000;
    const buckets: { done: number; overdue: number; pending: number; label: string }[] = [];

    for (let i = WEEKS - 1; i >= 0; i--) {
      const weekStart = now - (i + 1) * msPerWeek;
      const weekEnd = now - i * msPerWeek;
      const startDate = new Date(weekStart);
      const label = `${startDate.getDate().toString().padStart(2, "0")}/${(startDate.getMonth() + 1).toString().padStart(2, "0")}`;
      buckets.push({ done: 0, overdue: 0, pending: 0, label });
    }

    tasks.forEach((t) => {
      const status = classifyTask(t);
      const ts = t.completed_at ?? t.updated_at ?? t.created_at;
      if (!ts) return;
      const d = new Date(String(ts)).getTime();
      if (Number.isNaN(d)) return;
      const weeksAgo = Math.floor((now - d) / msPerWeek);
      const idx = WEEKS - 1 - weeksAgo;
      if (idx >= 0 && idx < WEEKS) {
        if (status === "done") buckets[idx].done++;
        else if (status === "overdue") buckets[idx].overdue++;
        else buckets[idx].pending++;
      }
    });

    return buckets;
  }, [tasks, classifyTask]);

  const maxVal = useMemo(() => Math.max(...weeklyData.map((d) => d.done + d.overdue), 1), [weeklyData]);

  // SVG dimensions
  const W = 600;
  const H = 180;
  const padX = 30;
  const padY = 20;
  const graphW = W - padX * 2;
  const graphH = H - padY * 2;

  // Generate EKG-style path for done tasks
  const generatePulsePath = (data: number[], max: number) => {
    const points: { x: number; y: number }[] = [];
    const stepX = graphW / (data.length - 1);

    data.forEach((val, i) => {
      const x = padX + i * stepX;
      const normalizedVal = val / max;

      if (val === 0) {
        // Flat line when no activity
        points.push({ x, y: padY + graphH * 0.75 });
      } else {
        // EKG spike pattern
        const baseY = padY + graphH * 0.75;
        const peakY = padY + graphH * (1 - normalizedVal) * 0.7;
        const spikeWidth = stepX * 0.15;

        // Pre-spike dip
        points.push({ x: x - spikeWidth * 2, y: baseY + 4 });
        // Sharp rise
        points.push({ x: x - spikeWidth, y: peakY });
        // Sharp fall
        points.push({ x: x + spikeWidth, y: baseY + graphH * 0.15 });
        // Recovery
        points.push({ x: x + spikeWidth * 2, y: baseY - 2 });
      }
    });

    if (points.length < 2) return "";

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      // Sharp lines for EKG effect
      const cpx1 = prev.x + (curr.x - prev.x) * 0.3;
      const cpx2 = prev.x + (curr.x - prev.x) * 0.7;
      d += ` C ${cpx1} ${prev.y}, ${cpx2} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    return d;
  };

  const doneValues = weeklyData.map((d) => d.done);
  const overdueValues = weeklyData.map((d) => d.overdue);

  const pulsePath = generatePulsePath(doneValues, maxVal);
  const overduePath = generatePulsePath(overdueValues, maxVal);

  // Stats
  const totalDone = weeklyData.reduce((s, d) => s + d.done, 0);
  const totalOverdue = weeklyData.reduce((s, d) => s + d.overdue, 0);
  const recentWeeks = weeklyData.slice(-4);
  const recentDone = recentWeeks.reduce((s, d) => s + d.done, 0);
  const prevWeeks = weeklyData.slice(-8, -4);
  const prevDone = prevWeeks.reduce((s, d) => s + d.done, 0);

  const trend = prevDone > 0 ? ((recentDone - prevDone) / prevDone) * 100 : recentDone > 0 ? 100 : 0;
  const bpm = Math.round((totalDone / WEEKS) * 7); // "beats" per week avg, displayed as BPM metaphor

  const heartColor = totalOverdue > totalDone * 0.3
    ? "hsl(0 84% 60%)"
    : trend >= 0
    ? "hsl(262 83% 58%)"
    : "hsl(45 100% 55%)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="rounded-2xl border border-white/[0.06] p-6 transition-all hover:border-white/[0.10] flex flex-col"
      style={{ background: "linear-gradient(145deg, hsl(270 50% 14% / 0.8), hsl(234 45% 10% / 0.6))" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <motion.div
            className="relative flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: `${heartColor.replace(")", " / 0.15)")}` }}
            animate={{
              scale: [1, 1.1, 1],
              boxShadow: [
                `0 0 0px ${heartColor.replace(")", " / 0)")}`,
                `0 0 14px ${heartColor.replace(")", " / 0.4)")}`,
                `0 0 0px ${heartColor.replace(")", " / 0)")}`,
              ],
            }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
            >
              <Activity className="h-4 w-4" style={{ color: heartColor }} />
            </motion.div>
            {/* Pulse ring */}
            <motion.div
              className="absolute inset-0 rounded-lg"
              style={{ border: `1px solid ${heartColor}` }}
              animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
            />
          </motion.div>
          <div>
            <h3 className="text-sm font-bold text-white/90">Pulso de Produtividade</h3>
            <p className="text-[10px] text-white/30">Ritmo de entregas · {WEEKS} semanas</p>
          </div>
        </div>

        {/* BPM Display */}
        <div className="flex items-baseline gap-1">
          <motion.span
            className="text-2xl font-black tabular-nums"
            style={{ color: heartColor }}
            animate={{ opacity: [1, 0.6, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          >
            {bpm}
          </motion.span>
          <span className="text-[10px] text-white/30 font-medium">t/sem</span>
        </div>
      </div>

      {/* EKG Chart */}
      <div className="relative flex-1">
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="overflow-visible">
          <defs>
            {/* Main pulse glow */}
            <filter id="pulseGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Overdue glow */}
            <filter id="overdueGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Gradient under main line */}
            <linearGradient id="pulseAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(262 83% 58% / 0.2)" />
              <stop offset="100%" stopColor="hsl(262 83% 58% / 0)" />
            </linearGradient>
            {/* Scan line gradient */}
            <linearGradient id="scanGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="50%" stopColor="hsl(262 83% 58% / 0.15)" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>

          {/* Horizontal grid lines */}
          {[0.25, 0.5, 0.75].map((pct) => (
            <line
              key={pct}
              x1={padX}
              y1={padY + graphH * pct}
              x2={padX + graphW}
              y2={padY + graphH * pct}
              stroke="hsl(262 30% 25% / 0.2)"
              strokeWidth={0.5}
              strokeDasharray="4 4"
            />
          ))}

          {/* Baseline */}
          <line
            x1={padX}
            y1={padY + graphH * 0.75}
            x2={padX + graphW}
            y2={padY + graphH * 0.75}
            stroke="hsl(262 30% 30% / 0.3)"
            strokeWidth={0.5}
          />

          {/* Scanning line animation */}
          <motion.rect
            x={padX}
            y={padY}
            width={40}
            height={graphH}
            fill="url(#scanGrad)"
            animate={{ x: [padX, padX + graphW] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />

          {/* Overdue pulse (behind) */}
          {overduePath && (
            <motion.path
              d={overduePath}
              fill="none"
              stroke="hsl(0 84% 60% / 0.4)"
              strokeWidth={1.5}
              filter="url(#overdueGlow)"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 2, delay: 0.8, ease: "easeOut" }}
            />
          )}

          {/* Main done pulse */}
          {pulsePath && (
            <>
              <motion.path
                d={pulsePath}
                fill="none"
                stroke={heartColor}
                strokeWidth={2.5}
                strokeLinecap="round"
                filter="url(#pulseGlow)"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 2, delay: 0.3, ease: "easeOut" }}
              />
            </>
          )}

          {/* Data points — show ALL weeks as interactive dots */}
          {weeklyData.map((d, i) => {
            const x = padX + (i / (WEEKS - 1)) * graphW;
            const hasDone = d.done > 0;
            const hasOverdue = d.overdue > 0;
            const normalizedVal = hasDone ? d.done / maxVal : 0;
            const y = hasDone ? padY + graphH * (1 - normalizedVal) * 0.7 : padY + graphH * 0.75;
            const isRecent = i >= WEEKS - 2;
            const dotR = isRecent ? 4.5 : hasDone ? 3.5 : 2.5;
            const dotColor = hasOverdue && !hasDone ? "hsl(0 84% 60%)" : heartColor;

            return (
              <g key={i} className="cursor-pointer">
                {/* Invisible hover target */}
                <rect x={x - 18} y={padY - 5} width={36} height={graphH + 10} fill="transparent">
                  <title>{`${d.label}\n✅ ${d.done} concluída${d.done !== 1 ? "s" : ""}\n⚠️ ${d.overdue} atrasada${d.overdue !== 1 ? "s" : ""}\n⏳ ${d.pending} pendente${d.pending !== 1 ? "s" : ""}`}</title>
                </rect>
                {/* Pulse ring on recent */}
                {isRecent && hasDone && (
                  <motion.circle
                    cx={x}
                    cy={y}
                    r={8}
                    fill="none"
                    stroke={heartColor}
                    strokeWidth={1}
                    animate={{ r: [4, 14], opacity: [0.6, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                  />
                )}
                {/* Dot */}
                <motion.circle
                  cx={x}
                  cy={y}
                  r={dotR}
                  fill={dotColor}
                  stroke="hsl(270 50% 12%)"
                  strokeWidth={isRecent ? 2 : 1.5}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5 + i * 0.04 }}
                  className="hover:brightness-150 transition-all"
                />
                {/* Overdue secondary dot below */}
                {hasOverdue && hasDone && (
                  <motion.circle
                    cx={x}
                    cy={padY + graphH * 0.85}
                    r={2}
                    fill="hsl(0 84% 60% / 0.6)"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.6 + i * 0.04 }}
                  />
                )}
              </g>
            );
          })}

          {/* Week labels — every 2nd */}
          {weeklyData.map((d, i) => {
            if (i % 2 !== 0 && i !== WEEKS - 1) return null;
            const x = padX + (i / (WEEKS - 1)) * graphW;
            return (
              <text
                key={`label-${i}`}
                x={x}
                y={H - 2}
                textAnchor="middle"
                className="text-[9px] fill-white/40 font-medium"
              >
                {d.label}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Footer stats */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full" style={{ background: "hsl(262 83% 58%)" }} />
            <span className="text-[10px] text-white/40">Concluídas</span>
            <span className="text-xs font-bold text-white/70">{totalDone}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full" style={{ background: "hsl(0 84% 60% / 0.6)" }} />
            <span className="text-[10px] text-white/40">Atrasadas</span>
            <span className="text-xs font-bold text-white/70">{totalOverdue}</span>
          </div>
        </div>

        {/* Trend */}
        <div className="flex items-center gap-1">
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold"
            style={{
              color: trend >= 10 ? "hsl(160 84% 39%)" : trend <= -10 ? "hsl(0 84% 60%)" : "hsl(45 100% 55%)",
              background: trend >= 10 ? "hsl(160 84% 39% / 0.12)" : trend <= -10 ? "hsl(0 84% 60% / 0.12)" : "hsl(45 100% 55% / 0.12)",
            }}
          >
            {trend >= 0 ? "▲" : "▼"} {Math.abs(Math.round(trend))}%
          </span>
          <span className="text-[9px] text-white/25">vs anterior</span>
        </div>
      </div>
    </motion.div>
  );
}
