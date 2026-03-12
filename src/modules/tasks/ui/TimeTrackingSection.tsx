import { useMemo } from "react";
import { Timer, Play, User, Clock, BarChart3, CircleDot } from "lucide-react";
import { motion } from "framer-motion";
import type { ElapsedTimeRecord } from "@/modules/tasks/types";
import { formatDurationHHMM, durationColorClass, getElapsedEffectiveDate } from "@/modules/tasks/utils";

type TimeTrackingSectionProps = {
  entries: ElapsedTimeRecord[];
  totalSeconds?: number;
};

const formatDateTime = (raw?: string | Date | null): string => {
  if (!raw) return "—";
  const d = new Date(String(raw));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** Generates a consistent color from user_id for avatar */
const userColor = (userId?: string | number | null): string => {
  if (!userId) return "hsl(var(--task-purple))";
  const colors = [
    "hsl(160 84% 39%)",   // emerald
    "hsl(var(--task-purple))",
    "hsl(var(--task-yellow))",
    "hsl(210 80% 55%)",   // blue
    "hsl(330 70% 55%)",   // pink
    "hsl(25 90% 55%)",    // orange
  ];
  const hash = String(userId).split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

/** Mini daily activity sparkline for the last 7 days */
function DailyActivityBars({ entries }: { entries: ElapsedTimeRecord[] }) {
  const dailyData = useMemo(() => {
    const now = new Date();
    const days: { label: string; seconds: number; isToday: boolean }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

      let totalSec = 0;
      entries.forEach((entry) => {
        const effective = getElapsedEffectiveDate(entry);
        if (!effective) return;
        if (effective >= dayStart && effective <= dayEnd) {
          totalSec += typeof entry.seconds === "number" ? entry.seconds : Number(entry.seconds ?? 0);
        }
      });

      days.push({
        label: WEEKDAYS_SHORT[d.getDay()],
        seconds: totalSec,
        isToday: i === 0,
      });
    }
    return days;
  }, [entries]);

  const maxSec = Math.max(1, ...dailyData.map((d) => d.seconds));
  const hasActivity = dailyData.some((d) => d.seconds > 0);

  if (!hasActivity) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-xl border border-[hsl(var(--task-border))] bg-gradient-to-br from-[hsl(var(--task-surface))] to-[hsl(var(--task-bg))] p-4 mb-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center justify-center h-5 w-5 rounded-md bg-[hsl(var(--task-purple)/0.15)]">
          <BarChart3 className="h-3 w-3 text-[hsl(var(--task-purple))]" />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--task-text-muted))]">
          Atividade dos Últimos 7 Dias
        </span>
      </div>
      <div className="flex items-end gap-2 h-14">
        {dailyData.map((day, i) => {
          const pct = day.seconds > 0 ? Math.max(10, (day.seconds / maxSec) * 100) : 0;
          const color = durationColorClass(day.seconds);
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <div className="w-full relative" style={{ height: 40 }}>
                {day.seconds > 0 ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: `${pct}%`, opacity: 1 }}
                    transition={{ duration: 0.6, delay: i * 0.07, ease: "easeOut" }}
                    className="absolute bottom-0 left-[15%] right-[15%] rounded-md"
                    style={{
                      background: day.isToday
                        ? "linear-gradient(to top, hsl(160 84% 32%), hsl(160 84% 45%))"
                        : `linear-gradient(to top, ${color.accent}cc, ${color.accent})`,
                      boxShadow: day.isToday ? "0 0 8px hsl(160 84% 39% / 0.4)" : undefined,
                    }}
                    title={formatDurationHHMM(day.seconds)}
                  />
                ) : (
                  <div className="absolute bottom-0 left-[25%] right-[25%] h-[3px] rounded-full bg-[hsl(var(--task-border)/0.5)]" />
                )}
              </div>
              <span className={`text-[9px] font-semibold ${day.isToday ? "text-emerald-400" : "text-[hsl(var(--task-text-muted))]"}`}>
                {day.label}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

export function TimeTrackingSection({ entries, totalSeconds }: TimeTrackingSectionProps) {
  const sorted = [...entries].sort((a, b) => {
    const da = a.date_start ? new Date(String(a.date_start)).getTime() : 0;
    const db = b.date_start ? new Date(String(b.date_start)).getTime() : 0;
    return db - da;
  });

  const uniqueUsers = new Set(entries.map((e) => e.user_id).filter(Boolean));
  const totalColor = durationColorClass(totalSeconds);

  return (
    <div className="space-y-0">
      <DailyActivityBars entries={entries} />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="rounded-xl border border-[hsl(var(--task-border))] bg-gradient-to-br from-[hsl(var(--task-surface))] to-[hsl(var(--task-bg))] p-4 mb-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center h-5 w-5 rounded-md bg-[hsl(var(--task-purple)/0.15)]">
              <Timer className="h-3 w-3 text-[hsl(var(--task-purple))]" />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--task-text-muted))]">
              Rastreamento de Tempo
            </span>
            <span className="text-[9px] text-[hsl(var(--task-text-muted))] bg-[hsl(var(--task-bg))] rounded-full px-2 py-0.5 border border-[hsl(var(--task-border))]">
              {entries.length} {entries.length === 1 ? "registro" : "registros"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {uniqueUsers.size > 0 && (
              <div className="flex items-center gap-1.5 bg-[hsl(var(--task-bg))] rounded-full px-2 py-0.5 border border-[hsl(var(--task-border))]">
                <User className="h-3 w-3 text-[hsl(var(--task-text-muted))]" />
                <span className="text-[10px] text-[hsl(var(--task-text-muted))]">
                  {uniqueUsers.size} {uniqueUsers.size === 1 ? "participante" : "participantes"}
                </span>
              </div>
            )}
            {totalSeconds != null && totalSeconds > 0 && (
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className={`flex items-center gap-1.5 rounded-lg ${totalColor.bg} px-2.5 py-1 border ${totalColor.border}`}
                style={{ boxShadow: `0 0 12px ${totalColor.accent}33` }}
              >
                <Clock className={`h-3.5 w-3.5 ${totalColor.text}`} />
                <span className={`text-[11px] font-bold font-mono ${totalColor.text}`}>
                  {formatDurationHHMM(totalSeconds)}
                </span>
              </motion.div>
            )}
          </div>
        </div>

        {/* Time entries list */}
        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
          {sorted.map((entry, i) => {
            const seconds = typeof entry.seconds === "number" ? entry.seconds : Number(entry.seconds ?? 0);
            const entryDuration = formatDurationHHMM(seconds);
            const entryColor = durationColorClass(seconds);
            const avatarColor = userColor(entry.user_id);

            return (
              <motion.div
                key={entry.task_id ? `${entry.task_id}-${i}` : i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.3) }}
                className="group flex items-center gap-3 rounded-lg bg-[hsl(var(--task-bg))] px-3 py-2.5 border border-[hsl(var(--task-border)/0.3)] hover:border-[hsl(var(--task-border))] transition-colors"
              >
                {/* Timeline dot */}
                <div className="flex flex-col items-center gap-0.5">
                  <CircleDot className="h-3.5 w-3.5 text-emerald-400" />
                  {i < sorted.length - 1 && (
                    <div className="w-[1px] h-2 bg-[hsl(var(--task-border)/0.3)]" />
                  )}
                </div>

                {/* Date info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-medium text-[hsl(var(--task-text))]">
                      {formatDateTime(entry.date_start)}
                    </span>
                    {entry.date_stop && (
                      <>
                        <span className="text-[10px] text-[hsl(var(--task-text-muted))]">→</span>
                        <span className="text-[11px] text-[hsl(var(--task-text-muted))]">
                          {formatDateTime(entry.date_stop as string | null)}
                        </span>
                      </>
                    )}
                  </div>
                  {typeof entry.comment_text === "string" && entry.comment_text.trim() && (
                    <p className="text-[10px] text-[hsl(var(--task-text-muted))] truncate mt-0.5 italic max-w-[300px]">
                      {String(entry.comment_text)}
                    </p>
                  )}
                </div>

                {/* User avatar - colored circle without fake name */}
                {entry.user_id && (
                  <div
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
                    style={{
                      backgroundColor: `${avatarColor}22`,
                      color: avatarColor,
                      border: `1px solid ${avatarColor}44`,
                    }}
                    title={`ID: ${entry.user_id}`}
                  >
                    <User className="h-3 w-3" />
                  </div>
                )}

                {/* Duration badge */}
                {entryDuration ? (
                  <div className={`flex items-center gap-1 rounded-md ${entryColor.bg} px-2 py-0.5 border ${entryColor.border}`}>
                    <span className={`text-[11px] font-bold font-mono whitespace-nowrap ${entryColor.text}`}>
                      {entryDuration}
                    </span>
                  </div>
                ) : (
                  <span className="text-[10px] text-[hsl(var(--task-text-muted))] italic">Sem registro</span>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}