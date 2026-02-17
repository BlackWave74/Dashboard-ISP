export type TaskStatusKey = "done" | "pending" | "overdue" | "unknown";

export const DEFAULT_DEADLINE_SOON_DAYS = 3;

/**
 * Returns today's date as "YYYY-MM-DD" in the user's local timezone.
 * Avoids the UTC offset bug from `new Date().toISOString().slice(0,10)`.
 */
export const todayLocalIso = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

/**
 * Converts a Date object to "YYYY-MM-DD" using local timezone.
 * Avoids the UTC offset bug from `.toISOString().slice(0,10)`.
 */
export const dateToLocalIso = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Formats an ISO date string "YYYY-MM-DD" to "DD/MM" or "DD/MM/YYYY"
 * by parsing the string directly (no Date constructor = no timezone shift).
 */
export const formatIsoToPtBr = (iso: string, includeYear = false): string => {
  const parts = String(iso).split("-");
  if (parts.length < 3) return iso;
  return includeYear ? `${parts[2]}/${parts[1]}/${parts[0]}` : `${parts[2]}/${parts[1]}`;
};

/**
 * Safely formats a date-only ISO string or timestamp for display.
 * Uses toLocaleDateString only on full timestamps (with time), avoiding
 * the off-by-one bug that occurs with date-only strings like "2026-02-16".
 */
export const formatTimestampPtBr = (
  raw: string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string => {
  if (!raw) return "—";
  // If it's a date-only string (YYYY-MM-DD), parse directly
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split("-");
    const defaults = options ?? { day: "2-digit", month: "short" };
    // Create at noon local to avoid any shift
    return new Date(Number(y), Number(m) - 1, Number(d), 12).toLocaleDateString("pt-BR", defaults);
  }
  // Full timestamp — safe to use directly
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR", options ?? { day: "2-digit", month: "short" });
};

export const parseDateValue = (value?: unknown): Date | null => {
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatDatePtBR = (value: Date | null) => {
  if (!value) return "Sem prazo";
  return value.toLocaleDateString("pt-BR");
};

export const formatDurationHHMM = (seconds?: number) => {
  if (seconds === undefined || seconds === null || Number.isNaN(seconds)) return "Sem registro";
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const hh = String(hours).padStart(2, "0");
  const mm = String(mins).padStart(2, "0");
  return `${hh}:${mm}`;
};

export const normalizeTaskTitle = (value?: string) => {
  if (!value) return "";
  const cleaned = value
    .replace(/^[\s\u2500-\u257F\u2502\u2514\u251C\u2510\u2518\u250C\u2570\u2571\u2572\u2573\-–—•·]+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return cleaned || value.trim();
};

export const isDeadlineSoon = (
  deadline: Date | null,
  now: Date,
  daysThreshold = DEFAULT_DEADLINE_SOON_DAYS
) => {
  if (!deadline) return false;
  const diff = deadline.getTime() - now.getTime();
  const thresholdMs = daysThreshold * 24 * 60 * 60 * 1000;
  return diff > 0 && diff <= thresholdMs;
};

export const deadlineColor = (status: TaskStatusKey, isOverdue: boolean) => {
  if (status === "done") return "text-emerald-200";
  if (isOverdue) return "text-rose-200";
  return "text-slate-200";
};

const plural = (value: number, singular: string, pluralText: string) =>
  value === 1 ? singular : pluralText;

export const formatDeadlineRelative = (deadline: Date | null, now: Date) => {
  if (!deadline) return "Sem prazo";
  const diffMs = deadline.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return "Hoje";
  if (diffDays > 0) {
    if (diffDays === 1) return "Amanha";
    if (diffDays < 7) return `${diffDays} dias`;
    const weeks = Math.round(diffDays / 7);
    if (diffDays < 30) return `${weeks} ${plural(weeks, "semana", "semanas")}`;
    const months = Math.round(diffDays / 30);
    return `${months} ${plural(months, "mes", "meses")}`;
  }

  const absDays = Math.abs(diffDays);
  if (absDays === 1) return "Ontem";
  if (absDays < 7) return `- ${absDays} dias`;
  const weeks = Math.round(absDays / 7);
  if (absDays < 30) return `- ${weeks} ${plural(weeks, "semana", "semanas")}`;
  const months = Math.round(absDays / 30);
  return `- ${months} ${plural(months, "mes", "meses")}`;
};
