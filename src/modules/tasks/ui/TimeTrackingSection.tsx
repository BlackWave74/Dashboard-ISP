import { useMemo } from "react";
import { Timer, Play, User, Clock, BarChart3 } from "lucide-react";
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
    <div className="rounded-lg border border-[hsl(var(--task-border))] bg-[hsl(var(--task-surface))] p-3 mb-4">
      <div className="flex items-center gap-1.5 mb-3">
        <BarChart3 className="h-3 w-3 text-[hsl(var(--task-purple))]" />
        <span className="text-[9px] uppercase tracking-wider text-[hsl(var(--task-text-muted))]">
          Atividade dos Últimos 7 Dias
        </span>
      </div>
      <div className="flex items-end gap-1.5 h-12">
        {dailyData.map((day, i) => {
          const pct = day.seconds > 0 ? Math.max(8, (day.seconds / maxSec) * 100) : 0;
          const hours = day.seconds / 3600;
          const color = durationColorClass(day.seconds);
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full relative" style={{ height: 36 }}>
                {day.seconds > 0 ? (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${pct}%` }}
                    transition={{ duration: 0.6, delay: i * 0.05, ease: "easeOut" }}
                    className="absolute bottom-0 left-0 right-0 rounded-sm"
                    style={{ background: day.isToday ? "hsl(160 84% 39%)" : color.accent }}
                    title={`${formatDurationHHMM(day.seconds)}`}
                  />
                ) : (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] rounded-sm bg-[hsl(var(--task-border))]" />
                )}
              </div>
              <span className={`text-[8px] font-medium ${day.isToday ? "text-emerald-400" : "text-[hsl(var(--task-text-muted))]"}`}>
                {day.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TimeTrackingSection({ entries, totalSeconds }: TimeTrackingSectionProps) {
  // Sort entries by date_start descending (most recent first)
  const sorted = [...entries].sort((a, b) => {
    const da = a.date_start ? new Date(String(a.date_start)).getTime() : 0;
    const db = b.date_start ? new Date(String(b.date_start)).getTime() : 0;
    return db - da;
  });

  // Collect unique user_ids
  const uniqueUsers = new Set(entries.map((e) => e.user_id).filter(Boolean));
  const totalColor = durationColorClass(totalSeconds);

  return (
    <div className="space-y-0">
      {/* Daily activity sparkline */}
      <DailyActivityBars entries={entries} />

      {/* Time entries */}
      <div className="rounded-lg border border-[hsl(var(--task-border))] bg-[hsl(var(--task-surface))] p-3 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Timer className="h-3 w-3 text-[hsl(var(--task-purple))]" />
            <span className="text-[9px] uppercase tracking-wider text-[hsl(var(--task-text-muted))]">
              Rastreamento de Tempo
            </span>
            <span className="text-[9px] text-[hsl(var(--task-text-muted))] ml-1">
              ({entries.length} {entries.length === 1 ? "registro" : "registros"})
            </span>
          </div>
          <div className="flex items-center gap-3">
            {uniqueUsers.size > 0 && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3 text-[hsl(var(--task-text-muted))]" />
                <span className="text-[10px] text-[hsl(var(--task-text-muted))]">
                  {uniqueUsers.size} {uniqueUsers.size === 1 ? "participante" : "participantes"}
                </span>
              </div>
            )}
            {totalSeconds != null && totalSeconds > 0 && (
              <div className={`flex items-center gap-1 rounded-md ${totalColor.bg} px-2 py-0.5 border ${totalColor.border}`}>
                <Clock className={`h-3 w-3 ${totalColor.text}`} />
                <span className={`text-[10px] font-bold font-mono ${totalColor.text}`}>
                  {formatDurationHHMM(totalSeconds)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Time entries list */}
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {sorted.map((entry, i) => {
            const seconds = typeof entry.seconds === "number" ? entry.seconds : Number(entry.seconds ?? 0);
            const entryDuration = formatDurationHHMM(seconds);
            const entryColor = durationColorClass(seconds);

            return (
              <div
                key={entry.task_id ? `${entry.task_id}-${i}` : i}
                className="flex items-center gap-3 rounded-lg bg-[hsl(var(--task-bg))] px-3 py-2 border border-[hsl(var(--task-border)/0.3)]"
              >
                <Play className="h-3 w-3 shrink-0 text-emerald-400" />

                {/* Start date */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] text-[hsl(var(--task-text-muted))]">
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
                    <p className="text-[10px] text-[hsl(var(--task-text-muted))] truncate mt-0.5 italic">
                      {String(entry.comment_text)}
                    </p>
                  )}
                </div>

                {/* User */}
                {entry.user_id && (
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--task-purple)/0.15)] text-[8px] font-bold text-[hsl(var(--task-purple))]">
                    U{String(entry.user_id).slice(-1)}
                  </div>
                )}

                {/* Duration - color coded */}
                {entryDuration && (
                  <span className={`text-[11px] font-bold font-mono whitespace-nowrap ${entryColor.text}`}>
                    {entryDuration}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
