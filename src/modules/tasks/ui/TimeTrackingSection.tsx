import { Timer, Play, User, Clock } from "lucide-react";
import type { ElapsedTimeRecord } from "@/modules/tasks/types";
import { formatDurationHHMM } from "@/modules/tasks/utils";

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

const formatDate = (raw?: string | Date | null): string => {
  if (!raw) return "—";
  const d = new Date(String(raw));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
};

export function TimeTrackingSection({ entries, totalSeconds }: TimeTrackingSectionProps) {
  // Sort entries by date_start descending (most recent first)
  const sorted = [...entries].sort((a, b) => {
    const da = a.date_start ? new Date(String(a.date_start)).getTime() : 0;
    const db = b.date_start ? new Date(String(b.date_start)).getTime() : 0;
    return db - da;
  });

  // Collect unique user_ids
  const uniqueUsers = new Set(entries.map((e) => e.user_id).filter(Boolean));

  return (
    <div className="rounded-lg border border-[hsl(var(--task-border))] bg-[hsl(var(--task-surface))] p-3 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Timer className="h-3 w-3 text-[hsl(var(--task-purple))]" />
          <span className="text-[9px] uppercase tracking-wider text-[hsl(var(--task-text-muted))]">
            Rastreamento de Tempo
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
            <div className="flex items-center gap-1 rounded-md bg-[hsl(var(--task-purple)/0.1)] px-2 py-0.5 border border-[hsl(var(--task-purple)/0.2)]">
              <Clock className="h-3 w-3 text-[hsl(var(--task-purple))]" />
              <span className="text-[10px] font-bold text-[hsl(var(--task-purple))] font-mono">
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
                        {formatDateTime(entry.date_stop)}
                      </span>
                    </>
                  )}
                </div>
                {entry.comment_text && entry.comment_text.trim() && (
                  <p className="text-[10px] text-[hsl(var(--task-text-muted))] truncate mt-0.5 italic">
                    {entry.comment_text}
                  </p>
                )}
              </div>

              {/* User */}
              {entry.user_id && (
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--task-purple)/0.15)] text-[8px] font-bold text-[hsl(var(--task-purple))]">
                  U{String(entry.user_id).slice(-1)}
                </div>
              )}

              {/* Duration */}
              {entryDuration && (
                <span className="text-[11px] font-bold text-[hsl(var(--task-text))] font-mono whitespace-nowrap">
                  {entryDuration}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
