import { CheckCircle2, Clock, AlertTriangle, Zap } from "lucide-react";
import { motion } from "framer-motion";

type Props = {
  done: number;
  pending: number;
  overdue: number;
};

export default function AnalyticsTaskSummary({ done, pending, overdue }: Props) {
  const total = done + pending + overdue;
  const donePct = total ? Math.round((done / total) * 100) : 0;
  const pendingPct = total ? Math.round((pending / total) * 100) : 0;
  const overduePct = total ? Math.round((overdue / total) * 100) : 0;

  const segments = [
    {
      icon: CheckCircle2,
      label: "Concluídas",
      value: done,
      pct: donePct,
      color: "hsl(160 84% 39%)",
      bgClass: "bg-emerald-500/10",
    },
    {
      icon: Clock,
      label: "Em andamento",
      value: pending,
      pct: pendingPct,
      color: "hsl(262 83% 58%)",
      bgClass: "bg-[hsl(262_83%_58%/0.1)]",
    },
    {
      icon: AlertTriangle,
      label: "Atrasadas",
      value: overdue,
      pct: overduePct,
      color: "hsl(0 84% 60%)",
      bgClass: "bg-[hsl(0_84%_60%/0.1)]",
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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[hsl(262_83%_58%)] to-[hsl(234_89%_64%)]">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <h3 className="text-lg font-bold text-white/90">Resumo de Tarefas</h3>
        </div>
        <span className="rounded-full bg-white/[0.05] px-3 py-1 text-xs font-bold text-white/40 border border-white/[0.06]">
          {total} total
        </span>
      </div>

      {/* Central metric */}
      <div className="flex items-center justify-center mb-6">
        <div className="relative">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
            className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03] px-8 py-5"
          >
            <span className="text-4xl font-black bg-gradient-to-r from-[hsl(262_83%_65%)] to-[hsl(160_84%_45%)] bg-clip-text text-transparent">
              {donePct}%
            </span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-semibold mt-1">Taxa de conclusão</span>
          </motion.div>
        </div>
      </div>

      {/* Horizontal stacked bar */}
      <div className="mb-5">
        <div className="h-3 w-full overflow-hidden rounded-full bg-white/[0.04] flex">
          {segments.map((seg, i) => (
            <motion.div
              key={seg.label}
              initial={{ width: 0 }}
              animate={{ width: `${seg.pct}%` }}
              transition={{ duration: 0.8, delay: 0.5 + i * 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{ background: seg.color, minWidth: seg.pct > 0 ? 4 : 0 }}
            />
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-2 flex-1">
        {segments.map((seg, i) => {
          const Icon = seg.icon;
          return (
            <motion.div
              key={seg.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.1 }}
              className={`rounded-xl ${seg.bgClass} border border-white/[0.04] p-3 flex flex-col items-center text-center`}
            >
              <Icon className="h-4 w-4 mb-2" style={{ color: seg.color }} />
              <p className="text-2xl font-bold text-white/85">{seg.value}</p>
              <p className="text-[10px] text-white/35 mt-0.5">{seg.label}</p>
              <span
                className="rounded-full px-1.5 py-0.5 text-[9px] font-bold mt-1.5"
                style={{
                  color: seg.color,
                  background: `${seg.color.replace(")", " / 0.15)")}`,
                }}
              >
                {seg.pct}%
              </span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
