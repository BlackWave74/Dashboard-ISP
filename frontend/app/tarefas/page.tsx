// app/tarefas/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { Sidebar } from "@/modules/layout/components/Sidebar";
import "../../styles/pages/tarefas.css";
import { ProjectPerformanceGauge, TaskCharts } from "@/modules/tasks/ui/TaskCharts";
import { TaskFilters } from "@/modules/tasks/ui/TaskFilters";
import { TaskListTable } from "@/modules/tasks/ui/TaskListTable";
import { useElapsedTimes } from "@/modules/tasks/api/useElapsedTimes";
import { useTasks } from "@/modules/tasks/api/useTasks";
import { STATUS_LABELS, type TaskRecord, type TaskView } from "@/modules/tasks/types";
import {
  deadlineColor,
  formatDatePtBR,
  formatDurationHHMM,
  isDeadlineSoon,
  parseDateValue,
  normalizeTaskTitle,
  type TaskStatusKey,
} from "@/modules/tasks/utils";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LabelList,
  Legend,
} from "recharts";

const isCompletedStatus = (value?: string) => {
  const normalized = (value ?? "").toLowerCase();
  return ["done", "concluido", "concluído", "completed", "finalizado"].includes(normalized);
};

const mapStatusKey = (
  statusRaw: string | number | undefined,
  deadline: Date | null
): TaskStatusKey => {
  if (statusRaw === undefined || statusRaw === null) return "unknown" as const;

  const asNumber = typeof statusRaw === "number" ? statusRaw : Number(statusRaw);
  if (!Number.isNaN(asNumber)) {
    if (asNumber === 5) return "done" as const;
    if (deadline && deadline < new Date()) return "overdue" as const;
    if (asNumber === 6) return "pending" as const;
    if (asNumber === 2 || asNumber === 3 || asNumber === 4) return "pending" as const;
  }

  const asString = String(statusRaw).toLowerCase();
  if (isCompletedStatus(asString)) return "done" as const;

  if (deadline && deadline < new Date()) return "overdue" as const;
  if (["em andamento", "in progress", "pendente", "pending"].includes(asString)) {
    return "pending" as const;
  }

  return "unknown" as const;
};

const getNumeric = (task: TaskRecord, keys: string[]): number | undefined => {
  for (const key of keys) {
    const value = task[key];
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) return parsed;
    }
  }
  return undefined;
};

const formatLastUpdated = (timestamp: number | null) => {
  if (!timestamp) return "Nunca atualizado";
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return "Atualizado agora";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `Atualizado há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `Atualizado há ${hours}h${rest ? ` ${rest} min` : ""}`;
};

const pickField = (task: TaskRecord, keys: string[], fallback = ""): string => {
  for (const key of keys) {
    if (task[key]) return String(task[key]);
  }
  return fallback;
};

const formatHoursLabel = (seconds?: number) => {
  if (!seconds || seconds <= 0) return "Sem dados";
  const hours = seconds / 3600;
  if (hours >= 10) return `${Math.round(hours)} h`;
  if (hours >= 1) return `${hours.toFixed(1)} h`;
  return `${Math.max(1, Math.round(hours * 60))} min`;
};

const CHART_COLORS = ["#6366f1", "#22c55e", "#f97316", "#e11d48", "#06b6d4", "#a855f7", "#facc15", "#14b8a6"];
const STATUS_ORDER: TaskStatusKey[] = ["done", "pending", "overdue", "unknown"];

const formatDayLabel = (date: Date) => `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;

const extractTaskDate = (task: TaskView, keys: string[]) => {
  for (const key of keys) {
    const parsed = parseDateValue(task.raw[key]);
    if (parsed) return parsed;
  }
  return null;
};

const getWeekStart = (date: Date) => {
  const copy = new Date(date);
  const diff = (copy.getDay() + 6) % 7; // Monday as start
  copy.setDate(copy.getDate() - diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const buildDailyHours = (tasks: TaskView[], days = 30) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const series: { iso: string; label: string; hours: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(now);
    day.setDate(now.getDate() - i);
    const iso = day.toISOString().slice(0, 10);
    series.push({ iso, label: formatDayLabel(day), hours: 0 });
  }
  const lookup = new Map(series.map((entry) => [entry.iso, entry]));

  tasks.forEach((task) => {
    const created = extractTaskDate(task, ["inserted_at", "updated_at", "created_at", "createdAt", "created"]);
    if (!created) return;
    const iso = created.toISOString().slice(0, 10);
    const bucket = lookup.get(iso);
    if (!bucket) return;
    bucket.hours += typeof task.durationSeconds === "number" ? Math.max(0, task.durationSeconds / 3600) : 0;
  });

  return series;
};

const buildWeeklyTrend = (tasks: TaskView[], weeks = 8) => {
  const currentWeek = getWeekStart(new Date());
  const weekMap = new Map<string, { label: string; iso: string; created: number; done: number }>();

  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(currentWeek);
    weekStart.setDate(currentWeek.getDate() - 7 * i);
    const iso = weekStart.toISOString().slice(0, 10);
    weekMap.set(iso, { label: formatDayLabel(weekStart), iso, created: 0, done: 0 });
  }

  tasks.forEach((task) => {
    const created = extractTaskDate(task, ["inserted_at", "updated_at", "created_at", "createdAt", "created"]);
    if (!created) return;
    const weekStart = getWeekStart(created);
    const iso = weekStart.toISOString().slice(0, 10);
    const bucket = weekMap.get(iso);
    if (!bucket) return;
    bucket.created += 1;
    if (task.statusKey === "done") {
      bucket.done += 1;
    }
  });

  return Array.from(weekMap.values());
};

const buildStatusHourSeries = (tasks: TaskView[]) => {
  const totals: Record<TaskStatusKey, number> = {
    done: 0,
    pending: 0,
    overdue: 0,
    unknown: 0,
  };
  tasks.forEach((task) => {
    const hours = typeof task.durationSeconds === "number" ? Math.max(0, task.durationSeconds / 3600) : 0;
    totals[task.statusKey] += hours;
  });
  return STATUS_ORDER.map((key, index) => ({
    key,
    label: STATUS_LABELS[key]?.label ?? key,
    hours: totals[key],
    color: CHART_COLORS[index % CHART_COLORS.length],
  }));
};

const buildStatusCounts = (tasks: TaskView[]) => {
  const counts: Record<TaskStatusKey, number> = {
    done: 0,
    pending: 0,
    overdue: 0,
    unknown: 0,
  };
  tasks.forEach((task) => {
    counts[task.statusKey] += 1;
  });
  return STATUS_ORDER.map((status, index) => ({
    status,
    label: STATUS_LABELS[status]?.label ?? status,
    count: counts[status],
    color: CHART_COLORS[(index + 1) % CHART_COLORS.length],
  }));
};

const buildConsultantLoad = (tasks: TaskView[], topN = 10) => {
  const map = new Map<string, { total: number; overdue: number; pending: number; done: number }>();
  tasks.forEach((task) => {
    const label = (task.consultant || "Sem consultor").trim() || "Sem consultor";
    const bucket = map.get(label) ?? { total: 0, overdue: 0, pending: 0, done: 0 };
    bucket.total += 1;
    if (task.statusKey === "done") bucket.done += 1;
    else if (task.statusKey === "overdue") bucket.overdue += 1;
    else bucket.pending += 1;
    map.set(label, bucket);
  });

  return [...map.entries()]
    .map(([name, stats]) => ({
      name,
      total: stats.total,
      overdue: stats.overdue,
      pending: stats.pending,
      done: stats.done,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, topN)
    .map((entry, index) => ({
      ...entry,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));
};

const EMPTY_CHART_MESSAGE = "Nenhum lançamento no período (ajuste filtros ou datas).";

const EmptyChartScene = () => (
  <div className="relative h-full w-full overflow-hidden rounded-xl border border-dashed border-slate-800/60 bg-gradient-to-b from-slate-950/40 to-slate-950/90">
    <div
      className="absolute inset-0 opacity-60"
      style={{ backgroundImage: "repeating-linear-gradient(transparent, transparent 32px, rgba(148,163,184,0.08) 32px, rgba(148,163,184,0.08) 33px)" }}
    />
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.2),transparent_40%)]" />
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-xs text-slate-400">
      <div className="h-1.5 w-16 animate-pulse rounded-full bg-slate-700" />
      <div className="h-1.5 w-10 animate-pulse rounded-full bg-slate-700" />
      <span className="px-4 text-center text-[0.7rem] text-slate-400">{EMPTY_CHART_MESSAGE}</span>
    </div>
  </div>
);

const tooltipStyles = {
  backgroundColor: "#0b1220",
  border: "1px solid rgba(148, 163, 184, 0.3)",
  color: "#e2e8f0",
};

const transparentCursor = { fill: "transparent", stroke: "transparent" } as const;
const GRAPH_AUTOPLAY_MS = 30000;

const STATUS_KEY_PT: Record<string, string> = {
  done: "Concluídas",
  pending: "Em andamento",
  overdue: "Atrasadas",
  unknown: "Sem status",
};

const formatStatusKeyPt = (key: unknown) => {
  const k = String(key ?? "").toLowerCase();
  return STATUS_KEY_PT[k] ?? String(key ?? "");
};

const TREND_KEY_PT: Record<string, string> = {
  created: "Criadas",
  done: "Concluídas",
};

const formatTrendKeyPt = (key: unknown) => {
  const k = String(key ?? "").toLowerCase();
  return TREND_KEY_PT[k] ?? String(key ?? "");
};

const formatStatusTooltipLabel = (name?: string) => {
  if (!name) return "Tarefas";
  const statusKey = name as TaskStatusKey;
  return STATUS_LABELS[statusKey]?.label ?? formatStatusKeyPt(name);
};
const aggregateProjectHours = (tasks: TaskView[]) => {
  const map = new Map<
    string,
    { hours: number; seconds: number; count: number; projectId?: string | number | null }
  >();

  tasks.forEach((task) => {
    const name = (task.project || "").trim() || "Projeto indefinido";
    const rawProjectId = task.raw["project_id"] ?? task.raw["projectId"];
    const projectId =
      typeof rawProjectId === "string" || typeof rawProjectId === "number" ? rawProjectId : null;
    const seconds = typeof task.durationSeconds === "number" ? Math.max(0, task.durationSeconds) : 0;
    const current = map.get(name) ?? { hours: 0, seconds: 0, count: 0, projectId };
    current.seconds += seconds;
    current.hours = current.seconds / 3600;
    current.count += 1;
    map.set(name, current);
  });

  return [...map.entries()]
    .map(([projectName, data]) => ({ projectName, ...data }))
    .sort((a, b) => b.hours - a.hours || b.count - a.count);
};

const normalizeTask = (task: TaskRecord, durationSeconds?: number): TaskView => {
  const title = normalizeTaskTitle(pickField(task, ["title", "nome", "name"], "Tarefa sem título"));
  const projectId = pickField(task, ["project_id", "projectId"], "").trim();
  const projectFromJoin =
    task.projects && typeof task.projects === "object"
      ? pickField(task.projects as TaskRecord, ["name"], "")
      : "";
  const project =
    pickField(task, ["project", "projeto", "project_name", "group_name", "group"], "") ||
    projectFromJoin ||
    (projectId ? `Projeto #${projectId}` : "Projeto indefinido");
  const consultant = pickField(
    task,
    ["responsible_name", "consultant", "owner", "responsavel"],
    "Sem consultor"
  );
  const description = pickField(task, ["description", "descricao"], "Sem descrição");

  const statusRaw = pickField(task, ["status", "situacao", "estado"], "").toLowerCase();

  const deadline =
    parseDateValue(task["due_date"]) ||
    parseDateValue(task["dueDate"]) ||
    parseDateValue(task["deadline"]) ||
    parseDateValue(task["data"]);

  const statusKey = mapStatusKey(statusRaw, deadline);
  const isDone = statusKey === "done";
  const isOverdue = statusKey === "overdue" || (!isDone && deadline !== null && deadline < new Date());
  const deadlineIsSoon = !isDone && !isOverdue && isDeadlineSoon(deadline, new Date());

  const durationFromTask = getNumeric(task, ["duration_minutes", "duration", "tempo_total", "minutes"]);
  const seconds = durationSeconds ?? (durationFromTask ? durationFromTask * 60 : undefined);

  return {
    title,
    description,
    project,
    consultant,
    statusKey,
    durationSeconds: seconds,
    durationLabel: formatDurationHHMM(seconds),
    deadlineDate: deadline,
    deadlineLabel: formatDatePtBR(deadline),
    deadlineColor: deadlineColor(statusKey, isOverdue),
    deadlineIsSoon,
    userId: task["user_id"] ?? null,
    raw: task,
  };
};

const filterByPeriod = (tasks: TaskView[], period: string) => {
  if (period === "all") return tasks;
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const now = new Date();
  const threshold = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  return tasks.filter((task) => {
    const created =
      parseDateValue(task.raw["inserted_at"]) ||
      parseDateValue(task.raw["updated_at"]) ||
      parseDateValue(task.raw["created_at"]) ||
      parseDateValue(task.raw["createdAt"]) ||
      parseDateValue(task.raw["due_date"]) ||
      parseDateValue(task.raw["dueDate"]) ||
      parseDateValue(task.raw["deadline"]);

    return created ? created >= threshold : false;
  });
};

export default function TarefasPage() {
  const router = useRouter();
  const { session, loadingSession, logout } = useAuth();
  const [nowTs] = useState(() => Date.now());
  const renderStartRef = useRef<number>(typeof performance !== "undefined" ? performance.now() : Date.now());

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [deadline, setDeadline] = useState("all");
  const [period, setPeriod] = useState("30d");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [deadlineTo, setDeadlineTo] = useState("");
  const { tasks, loading, error, reload, lastUpdated, reloadCooldownMsLeft: tasksCooldownMs, noChanges: tasksNoChanges, totalCount } = useTasks({
    accessToken: session?.accessToken,
    period,
    dateFrom,
    dateTo,
  });
  const {
    times,
    loading: loadingTimes,
    error: timesError,
    reload: reloadTimes,
    lastUpdated: lastUpdatedTimes,
    reloadCooldownMsLeft: timesCooldownMs,
    noChanges: timesNoChanges,
  } = useElapsedTimes({
    accessToken: session?.accessToken,
    period,
    dateFrom,
    dateTo,
  });
  const [consultant, setConsultant] = useState("all");
  const [project, setProject] = useState("all");
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [showAllPending, setShowAllPending] = useState(false);
  const [showProjectsPanel, setShowProjectsPanel] = useState(false);
  const [showPendingPanel, setShowPendingPanel] = useState(false);
  const [graphSlideIndex, setGraphSlideIndex] = useState(0);
  const [graphAutoPlay, setGraphAutoPlay] = useState(true);
  const [graphAnimationNonce, setGraphAnimationNonce] = useState(0);
  const [reloadBlockedUntil, setReloadBlockedUntil] = useState(0);
  const [reloadSpamCount, setReloadSpamCount] = useState(0);
  const [reloadWarning, setReloadWarning] = useState<string | null>(null);
  const [reloadCooldownLeft, setReloadCooldownLeft] = useState(0);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "running" | "success" | "error" | "nochange">("idle");
  const [syncCooldownUntil, setSyncCooldownUntil] = useState(0);
  const [syncPendingRefresh, setSyncPendingRefresh] = useState(false);
  const autoplayRef = useRef<number | null>(null);
  const autoplayLastTickRef = useRef<number | null>(null);

  const [page, setPage] = useState(1);
  const pageSize = 10;

  const searchInputRef = useRef<HTMLInputElement>(null!);

const filtersBoxRef = useRef<HTMLDivElement>(null);

const scrollToFilters = useCallback(() => {
  filtersBoxRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
}, []);


const hasActiveFilters =
  !!search ||
  status !== "all" ||
  deadline !== "all" ||
  period !== "all" ||
  consultant !== "all" ||
  project !== "all" ||
  !!dateFrom ||
  !!dateTo ||
  !!deadlineTo;

const resetFilters = useCallback(() => {
  setSearch("");
  setDebouncedSearch("");
  setStatus("all");
  setDeadline("all");
  setPeriod("all");
  setConsultant("all");
  setProject("all");
  setDateFrom("");
  setDateTo("");
  setDeadlineTo("");
  setPage(1);

  requestAnimationFrame(() => {
    scrollToFilters();
    searchInputRef.current?.focus();
  });
}, [scrollToFilters]);

useEffect(() => {
  if (!loadingSession && !session) router.replace("/auth");
}, [loadingSession, session, router]);

useEffect(() => {
  if (!session?.company) return;
  if (session.role !== "cliente") return;
  // Se o usuário é cliente, aplicamos como filtro padrão.
  setProject((prev) => (prev === "all" ? session.company!.trim() : prev));
  setSearch((prev) => (prev.trim().length === 0 ? session.company!.trim() : prev));
}, [session?.company, session?.role]);

  const handleProjectSelect = useCallback(
    (name: string) => {
      if (!name || name === "Outros") return;
      setStatus("all");
      setSearch(name);
      scrollToFilters();
      requestAnimationFrame(() => searchInputRef.current?.focus());
    },
    [scrollToFilters]
  );

  const handlePendingHighlight = useCallback(
    (task: TaskView) => {
      if (!task.title) return;
      setStatus("pending");
      setSearch(task.title);
      scrollToFilters();
      requestAnimationFrame(() => searchInputRef.current?.focus());
    },
    [scrollToFilters]
  );

const refreshing = loading || loadingTimes;

const combinedLastUpdated =
  lastUpdated && lastUpdatedTimes
    ? Math.min(lastUpdated, lastUpdatedTimes)
    : lastUpdated ?? lastUpdatedTimes ?? null;

const hookCooldownLeft = Math.max(
  Math.ceil(tasksCooldownMs / 1000),
  Math.ceil(timesCooldownMs / 1000)
);

useEffect(() => {
  const timer = setTimeout(() => setDebouncedSearch(search), 250);
  return () => clearTimeout(timer);
}, [search]);

useEffect(() => {
  const handler = (event: KeyboardEvent) => {
    if (event.key === "/") {
      event.preventDefault();
      searchInputRef.current?.focus();
      return;
    }

    if (event.key === "Escape") {
      if (hasActiveFilters) resetFilters();
    }
  };

  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}, [hasActiveFilters, resetFilters]);

useEffect(() => {
  if (!reloadWarning) return;
  const id = window.setTimeout(() => setReloadWarning(null), 3000);
  return () => window.clearTimeout(id);
}, [reloadWarning]);

  useEffect(() => {
    if (syncStatus === "success" || syncStatus === "error" || syncStatus === "nochange") {
      const id = window.setTimeout(() => setSyncStatus("idle"), 5000);
      return () => window.clearTimeout(id);
    }
  }, [syncStatus]);

  useEffect(() => {
    if (!syncPendingRefresh) return;
    if (loading || loadingTimes) return;
    const noChanges = tasksNoChanges && timesNoChanges;
    setSyncStatus(noChanges ? "nochange" : "success");
    setSyncPendingRefresh(false);
    setSyncCooldownUntil(Date.now() + 5000);
  }, [syncPendingRefresh, loading, loadingTimes, tasksNoChanges, timesNoChanges]);

useEffect(() => {
  const tick = () => {
    const now = Date.now();
    const left = Math.max(0, Math.ceil((reloadBlockedUntil - now) / 1000));
    setReloadCooldownLeft(left);
  };
  tick();
  const id = window.setInterval(tick, 250);
  return () => window.clearInterval(id);
}, [reloadBlockedUntil]);

  const handleLogout = () => {
    logout();
    router.replace("/home");
  };

  const durationByTaskId = useMemo(() => {
    const map: Record<string, number> = {};
    times.forEach((entry) => {
      if (entry.task_id === undefined || entry.task_id === null) return;
      const key = String(entry.task_id);
      const seconds = typeof entry.seconds === "number" ? entry.seconds : Number(entry.seconds);
      if (Number.isNaN(seconds)) return;
      map[key] = (map[key] ?? 0) + seconds;
    });
    return map;
  }, [times]);

  const normalizedTasks = useMemo(() => {
    const shouldMeasure = process.env.NODE_ENV === "development";
    if (shouldMeasure) performance.mark("tarefas:normalize:start");
    const result = tasks.map((task) => {
      const rawId = task["id"] ?? task["task_id"];
      const taskId = rawId === undefined || rawId === null ? undefined : String(rawId);
      const seconds = taskId ? durationByTaskId[taskId] : undefined;
      return normalizeTask(task, seconds);
    });
    if (shouldMeasure) {
      performance.mark("tarefas:normalize:end");
      const measure = performance.measure("tarefas:normalize", "tarefas:normalize:start", "tarefas:normalize:end");
      console.debug("[tarefas] normalize", { ms: Math.round(measure.duration), count: tasks.length });
    }
    return result;
  }, [tasks, durationByTaskId]);

  const companyName = session?.company?.trim();
  const scopedTasks = useMemo(() => {
    if (!companyName || session?.role !== "cliente") return normalizedTasks;
    const needle = companyName.toLowerCase();
    const matchesCompany = (task: TaskView) => {
      const projectName = (task.project || "").toLowerCase();
      const joinedProject =
        typeof task.raw.projects === "object" &&
        task.raw.projects !== null &&
        typeof (task.raw.projects as TaskRecord)["name"] === "string"
          ? String((task.raw.projects as TaskRecord)["name"]).toLowerCase()
          : "";
      const joinedClientId =
        typeof task.raw.projects === "object" && task.raw.projects !== null
          ? (task.raw.projects as TaskRecord)["cliente_id"]
          : null;
      const clientIdStr =
        joinedClientId !== null && joinedClientId !== undefined ? String(joinedClientId).toLowerCase() : "";
      return (
        projectName.includes(needle) ||
        joinedProject.includes(needle) ||
        (!!clientIdStr && (clientIdStr === needle || clientIdStr === companyName.toLowerCase()))
      );
    };
    return normalizedTasks.filter(matchesCompany);
  }, [normalizedTasks, companyName]);

  const searchTerm = debouncedSearch.trim().toLowerCase();

  const matchesSearchTerm = useCallback(
    (task: TaskView, term: string) =>
      !term ||
      task.title.toLowerCase().includes(term) ||
      task.consultant.toLowerCase().includes(term) ||
      task.project.toLowerCase().includes(term) ||
      task.description.toLowerCase().includes(term),
    []
  );

  const searchScopedTasks = useMemo(() => {
    if (!searchTerm) return scopedTasks;
    return scopedTasks.filter((task) => matchesSearchTerm(task, searchTerm));
  }, [scopedTasks, searchTerm, matchesSearchTerm]);

  const projectOptions = useMemo(() => {
    const set = new Set<string>();
    const term = searchTerm;
    searchScopedTasks.forEach((task) => {
      const name = (task.project || "").trim();
      if (!name) return;
      const normalized = name.toLowerCase();
      if (normalized === "projeto indefinido") return;
      if (term && !normalized.includes(term)) return;
      set.add(name);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [searchScopedTasks, searchTerm]);

  const consultantOptions = useMemo(() => {
    const set = new Set<string>();
    const term = searchTerm;
    searchScopedTasks.forEach((task) => {
      const projectName = (task.project || "").trim().toLowerCase();
      const name = (task.consultant || "").trim();
      if (!name) return;
      if (projectName === "projeto indefinido") return;
      const normalizedConsultant = name.toLowerCase();
      if (term && !(projectName.includes(term) || normalizedConsultant.includes(term))) return;
      set.add(name);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [searchScopedTasks, searchTerm]);

  const lockedProject = session?.role === "cliente" && session.company?.trim();
  const effectiveProjectFilter = lockedProject ? session.company?.trim() ?? "all" : project;

  const filteredTasks = useMemo(() => {
    const shouldMeasure = process.env.NODE_ENV === "development";
    if (shouldMeasure) performance.mark("tarefas:filter:start");
    const byPeriod =
      period === "custom"
        ? scopedTasks.filter((task) => {
          const created =
              parseDateValue(task.raw["inserted_at"]) ||
              parseDateValue(task.raw["updated_at"]) ||
              parseDateValue(task.raw["created_at"]) ||
              parseDateValue(task.raw["createdAt"]) ||
              parseDateValue(task.raw["due_date"]) ||
              parseDateValue(task.raw["dueDate"]) ||
              parseDateValue(task.raw["deadline"]);

            const from = dateFrom ? parseDateValue(dateFrom) : null;
            const to = dateTo ? parseDateValue(dateTo) : null;

            if (!created) return false;
            if (from && created < from) return false;
            if (to) {
              const endOfDay = new Date(to);
              endOfDay.setHours(23, 59, 59, 999);
              if (created > endOfDay) return false;
            }
            return true;
          })
        : filterByPeriod(scopedTasks, period);

    const visible = byPeriod.filter((task) => {
      const projectNormalized = (task.project || "").trim().toLowerCase();
      if (projectNormalized === "projeto indefinido") return false;
      const matchesConsultant =
        consultant === "all" ? true : task.consultant.toLowerCase() === consultant.toLowerCase();

      const matchesProject =
        effectiveProjectFilter === "all"
          ? true
          : task.project.toLowerCase().includes(String(effectiveProjectFilter).toLowerCase());

      const matchesStatus =
        status === "all"
          ? true
          : status === "done"
            ? task.statusKey === "done"
            : status === "overdue"
              ? task.statusKey === "overdue"
              : task.statusKey === "pending" || task.statusKey === "unknown";

      const matchesDeadline =
        deadline === "all"
          ? true
          : deadline === "overdue"
            ? task.statusKey === "overdue"
            : deadline === "done"
              ? task.statusKey === "done"
              : task.statusKey === "pending" || task.statusKey === "unknown";

      const deadlineDate =
        parseDateValue(task.raw["due_date"]) ||
        parseDateValue(task.raw["dueDate"]) ||
        parseDateValue(task.raw["deadline"]);

      const deadlineLimit = deadlineTo ? parseDateValue(deadlineTo) : null;
      const matchesDeadlineDate =
        !deadlineLimit || (deadlineDate ? deadlineDate <= deadlineLimit : false);

      return (
        matchesSearchTerm(task, searchTerm) &&
        matchesConsultant &&
        matchesProject &&
        matchesStatus &&
        matchesDeadline &&
        matchesDeadlineDate
      );
    });

    const score = (task: TaskView) => {
      if (task.statusKey === "overdue") return -100;
      if (task.statusKey === "pending" || task.statusKey === "unknown") {
        if (task.deadlineDate) {
          const days = (task.deadlineDate.getTime() - nowTs) / (24 * 60 * 60 * 1000);
          return Math.max(days, 0);
        }
        return 50;
      }
      if (task.statusKey === "done") return 100;
      return 75;
    };

    const result = [...visible].sort((a, b) => {
      const diff = score(a) - score(b);
      if (diff !== 0) return diff;
      return a.title.localeCompare(b.title);
    });
    if (shouldMeasure) {
      performance.mark("tarefas:filter:end");
      const measure = performance.measure("tarefas:filter", "tarefas:filter:start", "tarefas:filter:end");
      console.debug("[tarefas] filter:compute", { ms: Math.round(measure.duration), before: scopedTasks.length, after: result.length });
    }
    return result;
  }, [
    scopedTasks,
    period,
    searchTerm,
    status,
    deadline,
    dateFrom,
    dateTo,
    deadlineTo,
    consultant,
    effectiveProjectFilter,
    nowTs,
    matchesSearchTerm,
  ]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const pickDate = (task: TaskRecord) =>
      parseDateValue(task["inserted_at"]) ||
      parseDateValue(task["updated_at"]) ||
      parseDateValue(task["deadline"]) ||
      null;
    const dates = tasks.map(pickDate).filter(Boolean) as Date[];
    const min = dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : null;
    const max = dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null;
    console.debug("[tarefas] data:loaded", {
      tasksTotal: tasks.length,
      minDate: min ? min.toISOString() : null,
      maxDate: max ? max.toISOString() : null,
    });
  }, [tasks]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const pickDate = (task: TaskView) =>
      parseDateValue(task.raw["inserted_at"]) ||
      parseDateValue(task.raw["updated_at"]) ||
      parseDateValue(task.raw["deadline"]) ||
      null;
    const dates = filteredTasks.map(pickDate).filter(Boolean) as Date[];
    const min = dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : null;
    const max = dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null;
    console.debug("[tarefas] filter", {
      before: scopedTasks.length,
      after: filteredTasks.length,
      period,
      dateFrom,
      dateTo,
      deadlineTo,
      status,
      consultant,
      project: effectiveProjectFilter,
      searchTerm,
      minDate: min ? min.toISOString() : null,
      maxDate: max ? max.toISOString() : null,
    });
  }, [
    filteredTasks,
    scopedTasks.length,
    period,
    dateFrom,
    dateTo,
    deadlineTo,
    status,
    consultant,
    effectiveProjectFilter,
    searchTerm,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / pageSize));

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const elapsed = (typeof performance !== "undefined" ? performance.now() : Date.now()) - renderStartRef.current;
    console.debug("[tarefas] first-render", { ms: Math.round(elapsed) });
  }, []);

  const paginatedTasks = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filteredTasks.slice(start, end);
  }, [filteredTasks, page, pageSize]);

  const projectHours = useMemo(() => aggregateProjectHours(filteredTasks), [filteredTasks]);

  const barProjectsFromTasks = useMemo(
    () =>
      projectHours.map((row) => ({
        name: row.projectName || `Projeto #${row.projectId ?? ""}`.trim() || "Projeto",
        hours: Math.max(0, Number(row.hours) || 0),
        count: row.count ?? undefined,
      })),
    [projectHours]
  );

  const totalOverall = totalCount ?? filteredTasks.length;
  const stats = useMemo(() => {
    const total = totalOverall;
    const done = filteredTasks.filter((t) => t.statusKey === "done").length;
    const overdue = filteredTasks.filter((t) => t.statusKey === "overdue").length;
    const pending = filteredTasks.filter((t) => t.statusKey === "pending" || t.statusKey === "unknown").length;

    const durations = filteredTasks
      .map((t) => t.durationSeconds)
      .filter((v): v is number => typeof v === "number");

    const totalSeconds = durations.reduce((acc, curr) => acc + curr, 0);
    const avgSeconds = durations.length ? Math.round(totalSeconds / durations.length) : undefined;

    return {
      total,
      done,
      overdue,
      pending,
      avgSeconds,
      totalSeconds: totalSeconds || undefined,
    };
  }, [filteredTasks, totalOverall]);

  const hoursSummary = useMemo(() => {
    const pickDate = (task: TaskView) =>
      task.deadlineDate ||
      parseDateValue(task.raw["created_at"]) ||
      parseDateValue(task.raw["createdAt"]) ||
      parseDateValue(task.raw["due_date"]) ||
      parseDateValue(task.raw["dueDate"]) ||
      parseDateValue(task.raw["deadline"]);

    const sumFrom = (start: Date | null) =>
      filteredTasks.reduce((acc, task) => {
        if (typeof task.durationSeconds !== "number") return acc;
        const d = pickDate(task);
        if (start && (!d || d < start)) return acc;
        return acc + task.durationSeconds;
      }, 0);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);

    return {
      total: sumFrom(null),
      month: sumFrom(monthStart),
      quarter: sumFrom(quarterStart),
    };
  }, [filteredTasks]);

  const projectsOverview = useMemo(() => {
    const map = new Map<
      string,
      { total: number; pending: number; overdue: number; done: number; duration: number }
    >();

    filteredTasks.forEach((task) => {
      const key = task.project || "Sem projeto";
      const current = map.get(key) ?? { total: 0, pending: 0, overdue: 0, done: 0, duration: 0 };
      current.total += 1;
      if (task.statusKey === "done") current.done += 1;
      else if (task.statusKey === "overdue") current.overdue += 1;
      else current.pending += 1;
      current.duration += task.durationSeconds ?? 0;
      map.set(key, current);
    });

    const groups = [...map.entries()].map(([name, data]) => ({ name, ...data }));

    return {
      groups: groups.sort((a, b) => b.duration - a.duration),
      activeCount: groups.filter((g) => g.pending + g.overdue > 0).length,
      pendingTotal: groups.reduce((acc, g) => acc + g.pending + g.overdue, 0),
    };
  }, [filteredTasks]);

  const pendingHighlights = useMemo(() => {
    const parseDate = (task: TaskView) =>
      task.deadlineDate ||
      parseDateValue(task.raw["created_at"]) ||
      parseDateValue(task.raw["createdAt"]) ||
      null;

    return filteredTasks
      .filter((t) => t.statusKey === "pending" || t.statusKey === "overdue" || t.statusKey === "unknown")
      .sort((a, b) => {
        const aDate = parseDate(a)?.getTime() ?? Number.POSITIVE_INFINITY;
        const bDate = parseDate(b)?.getTime() ?? Number.POSITIVE_INFINITY;
        return aDate - bDate;
      });
  }, [filteredTasks]);

  const projectsList = useMemo(
    () => (showAllProjects ? projectsOverview.groups : projectsOverview.groups.slice(0, 10)),
    [projectsOverview, showAllProjects]
  );

  const pendingList = useMemo(
    () => (showAllPending ? pendingHighlights : pendingHighlights.slice(0, 10)),
    [pendingHighlights, showAllPending]
  );

  const hoursByDay = useMemo(() => buildDailyHours(filteredTasks), [filteredTasks]);
  const projectHoursForChart = useMemo(() => {
    const aggregated = aggregateProjectHours(filteredTasks).slice(0, 8);
    return aggregated.map((project, index) => ({
      name: project.projectName,
      hours: Math.max(0, project.hours),
      tasks: project.count,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));
  }, [filteredTasks]);
  const consultantLoad = useMemo(() => buildConsultantLoad(filteredTasks), [filteredTasks]);
  const formatConsultantAxisLabel = useCallback((value: string | number) => String(value ?? ""), []);

  const graphSlides = useMemo(() => {
    const slideFrameClass =
      "relative flex h-full min-h-[460px] w-full flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/45 p-4 shadow-[0_20px_60px_-45px_rgba(0,0,0,0.9)]";
    const chartCardClass =
      "relative flex h-full flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 shadow-[0_18px_60px_-45px_rgba(0,0,0,0.9)]";
    const chartContentClass = "mt-3 flex flex-1 min-h-[320px] w-full overflow-visible pr-4";
    const topConsultants = consultantLoad.slice(0, 5);
    const consultantHeatmap = consultantLoad
      .map((entry, index) => ({
        ...entry,
        severity: entry.overdue / Math.max(entry.total, 1),
        sortKey: index,
      }))
      .map((entry) => ({
        ...entry,
        color: `rgba(${Math.round(255 - entry.severity * 120)},${Math.round(153 - entry.severity * 120)},${Math.round(
          51 + entry.severity * 120
        )},${Math.max(0.6, entry.severity + 0.3)})`,
      }))
      .slice(0, 5);

    return [
      {
        id: "overview",
        title: "Visão geral",
        description: "Distribuição por responsáveis, top projetos e linha do tempo",
        content: (
          <div className={slideFrameClass}>
            <TaskCharts
              tasks={filteredTasks}
              barProjectsOverride={barProjectsFromTasks}
              onPickConsultant={(name) => {
                if (!name || name === "Outros") return;
                setSearch(name);
                scrollToFilters();
                requestAnimationFrame(() => searchInputRef.current?.focus());
              }}
              onPickProject={handleProjectSelect}
              onPickDeadlineIso={(iso) => {
                if (!iso) return;
                setDeadlineTo(iso);
                scrollToFilters();
              }}
            />
          </div>
        ),
      },
      {
        id: "focus",
        title: "Acompanhamento",
        description: "Responsáveis ativos e heatmap em um unico painel",
        content: (
          <div className={slideFrameClass}>
            <div className="grid h-full grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
              {/* RESPONSAVEIS ATIVOS */}
              <div className={chartCardClass}>
                <div className="text-center">
                  <p className="text-xs uppercase tracking-[0.2em] text-indigo-300">Responsáveis ativos</p>
                  <p className="mt-1 text-sm text-slate-400">Ranking dos responsáveis com mais tarefas.</p>
                </div>
                <div className={chartContentClass}>
                  {topConsultants.length ? (
                    <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={240}>
                        <BarChart
                          data={topConsultants}
                          layout="vertical"
                        margin={{ top: 6, right: 72, bottom: 12, left: 8 }}
                        barCategoryGap="30%"
                        barGap={6}
                      >
                        <defs>
                          <linearGradient id="consultantGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#a855f7" stopOpacity={0.85} />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.85} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                        <XAxis
                          type="number"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "rgba(226,232,240,0.7)", fontSize: 10 }}
                          domain={[0, "dataMax + 10"]}
                        />
                        <YAxis
                          dataKey="name"
                          type="category"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "rgba(226,232,240,0.9)", fontSize: 12, fontWeight: 500 }}
                          tickFormatter={formatConsultantAxisLabel}
                          width={200}
                        />
                        <Tooltip
                          cursor={transparentCursor}
                          contentStyle={tooltipStyles}
                          labelStyle={{ color: "#e2e8f0" }}
                          itemStyle={{ color: "#e2e8f0" }}
                          labelFormatter={() => ""}
                          formatter={(value, _name, props) => {
                            const label = String(props?.payload?.name ?? "Responsáveis");
                            return [`${value} tarefas`, label];
                          }}
                        />
                        <Bar
                          dataKey="total"
                          barSize={16}
                          fill="url(#consultantGradient)"
                          radius={[0, 8, 8, 0]}
                          cursor="pointer"
                        >
                          <LabelList dataKey="total" position="right" offset={10} formatter={(value) => value} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyChartScene />
                  )}
                </div>
              </div>

              {/* RESPONSAVEIS EM FOCO (HEATMAP) */}
              <div className={chartCardClass}>
                <div className="text-center">
                  <p className="text-xs uppercase tracking-[0.2em] text-indigo-300">Responsáveis em foco</p>
                  <p className="mt-1 text-sm text-slate-400">Heatmap com ranking das pendencias.</p>
                </div>
                <div className={chartContentClass}>
                  {consultantHeatmap.length ? (
                    <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={240}>
                        <BarChart
                          data={consultantHeatmap}
                          layout="vertical"
                        margin={{ top: 6, right: 56, bottom: 12, left: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                        <XAxis
                          type="number"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "rgba(226,232,240,0.7)", fontSize: 10 }}
                        />
                        <YAxis
                          dataKey="name"
                          type="category"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "rgba(226,232,240,0.9)", fontSize: 12, fontWeight: 500 }}
                          tickFormatter={formatConsultantAxisLabel}
                          width={200}
                        />
                        <Tooltip
                          cursor={transparentCursor}
                          contentStyle={tooltipStyles}
                          labelStyle={{ color: "#e2e8f0" }}
                          itemStyle={{ color: "#e2e8f0" }}
                          formatter={(value, _, data) => {
                            const payload = data?.payload as { severity?: number };
                            const percent = payload?.severity ? `${Math.round(payload.severity * 100)}% atrasos` : "";
                            return [`${value} tarefas`, percent];
                          }}
                        />
                        <Bar dataKey="total" barSize={14} radius={[0, 8, 8, 0]}>
                          {consultantHeatmap.map((entry) => (
                            <Cell key={`consultant-${entry.name}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyChartScene />
                  )}
                </div>
              </div>
            </div>
          </div>
        ),
      },
    ];

  }, [
    barProjectsFromTasks,
    consultantLoad,
    filteredTasks,
    formatConsultantAxisLabel,
    handlePendingHighlight,
    handleProjectSelect,
    hoursByDay,
    projectHoursForChart,
    scrollToFilters,
    setSearch,
    setDeadlineTo,
  ]);

  useEffect(() => {
    if (!graphSlides.length) return;
    if (graphSlideIndex >= graphSlides.length) {
      setGraphSlideIndex(0);
    }
  }, [graphSlides.length, graphSlideIndex]);

  useEffect(() => {
    setGraphAnimationNonce((prev) => prev + 1);
  }, [graphSlideIndex]);

  useEffect(() => {
    // debug: confirmar criação/limpeza do timer de autoplay do carrossel
    console.debug("[tarefas] autoplay effect", { graphAutoPlay, graphSlidesLength: graphSlides.length });

    // Se autoplay estiver desativado ou não houver slides suficientes, garanta que qualquer intervalo pré-existente seja limpo
    if (!graphAutoPlay || graphSlides.length <= 1) {
      if (autoplayRef.current !== null) {
        clearInterval(autoplayRef.current);
        autoplayRef.current = null;
        console.debug("[tarefas] autoplay prevented - cleared existing interval", { graphSlidesLength: graphSlides.length });
      }
      autoplayLastTickRef.current = null;
      return;
    }

    // limpa intervalo antigo caso exista (defesa extra)
    if (autoplayRef.current !== null) {
      clearInterval(autoplayRef.current);
      autoplayRef.current = null;
      console.debug("[tarefas] clearing stale interval before starting new one");
    }
    autoplayLastTickRef.current = null;

    console.debug("[tarefas] starting autoplay interval", { length: graphSlides.length, intervalMs: GRAPH_AUTOPLAY_MS });
    autoplayRef.current = window.setInterval(() => {
      const now = Date.now();
      const deltaMs = autoplayLastTickRef.current === null ? null : now - autoplayLastTickRef.current;
      autoplayLastTickRef.current = now;

      setGraphSlideIndex((prev) => {
        const next = (prev + 1) % graphSlides.length;
        console.debug("[tarefas] autoplay tick", {
          prevIndex: prev,
          nextIndex: next,
          graphSlidesLength: graphSlides.length,
          deltaMs,
          intervalMs: GRAPH_AUTOPLAY_MS,
        });
        return next;
      });
    }, GRAPH_AUTOPLAY_MS);

    return () => {
      if (autoplayRef.current !== null) {
        clearInterval(autoplayRef.current);
        autoplayRef.current = null;
        console.debug("[tarefas] clearing autoplay interval");
      }
      autoplayLastTickRef.current = null;
    };
  }, [graphAutoPlay, graphSlides.length]);

  useEffect(() => {
    setPage(1);
    setShowAllProjects(false);
    setShowAllPending(false);
  }, [debouncedSearch, status, deadline, period, dateFrom, dateTo, deadlineTo, consultant]);

  if (loadingSession || (!session && !loadingSession)) {
    return (
      <div className="page page--tarefas flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/50 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="page page--tarefas">
      <main className="flex min-h-screen w-full">
        <Sidebar
          userName={session?.name ?? "Usuário"}
          userRole={session?.role ?? "consultor"}
          onLogout={handleLogout}
          current="tarefas"
        />

        <div className="flex-1 min-h-screen px-4 py-8 sm:pl-72 sm:pr-8 sm:py-10">
        <section className="mx-auto flex w-full max-w-[1900px] flex-col gap-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.8)] sm:p-8">
            <div className="flex w-full flex-col items-center gap-2 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
              <h1 className="text-2xl font-semibold text-white">Central de Tarefas</h1>
              <div className="flex items-center justify-center sm:justify-end">
                <div className="flex items-center gap-2 rounded-full border border-slate-800 px-3 py-1 text-xs text-slate-400">
                  {refreshing ? (
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-indigo-300 border-t-transparent" />
                  ) : (
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                  )}
                  <span>{formatLastUpdated(combinedLastUpdated)}</span>
                </div>
              </div>
            </div>

            <div ref={filtersBoxRef} className="space-y-3">
            <div className="flex flex-col gap-3">
              <TaskFilters
                search={search}
                setSearch={setSearch}
                status={status}
                  setStatus={setStatus}
                  deadline={deadline}
                  setDeadline={setDeadline}
                  period={period}
                  setPeriod={setPeriod}
                  dateFrom={dateFrom}
                  setDateFrom={setDateFrom}
                  dateTo={dateTo}
                  setDateTo={setDateTo}
                  deadlineTo={deadlineTo}
                  setDeadlineTo={setDeadlineTo}
                  consultant={consultant}
                  setConsultant={setConsultant}
                  consultantOptions={consultantOptions}
                  searchRef={searchInputRef}
                  project={effectiveProjectFilter}
                  setProject={setProject}
                  projectOptions={projectOptions}
                  projectDisabled={Boolean(lockedProject)}
                />

                <div className="flex flex-wrap items-center justify-center gap-3 pt-1 text-xs text-slate-400">
                  <button
                    type="button"
                    onClick={async () => {
                      const now = Date.now();
                      if (syncLoading || now < syncCooldownUntil) return;
                      if (refreshing) {
                        return;
                      }

                      setSyncLoading(true);
                      setSyncStatus("running");

                      const correlationId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                      const startedAt = Date.now();
                      if (process.env.NODE_ENV === "development") {
                        console.debug("[sync] start", { correlationId });
                      }

                      try {
                        const response = await fetch("/api/bitrix/sync", {
                          method: "GET",
                          headers: { "Content-Type": "application/json" },
                        });
                        if (!response.ok) {
                          const text = await response.text();
                          throw new Error(text || `Erro ${response.status}`);
                        }
                        setSyncPendingRefresh(true);
                        reload();
                        reloadTimes();
                      } catch (error) {
                        const msg = error instanceof Error ? error.message : "Falha ao sincronizar.";
                        if (process.env.NODE_ENV === "development") {
                          const elapsed = Date.now() - startedAt;
                          console.debug("[sync] error", { correlationId, elapsed, message: msg });
                        }
                        setSyncStatus("error");
                        setSyncCooldownUntil(Date.now() + 5000);
                      } finally {
                        if (process.env.NODE_ENV === "development") {
                          const elapsed = Date.now() - startedAt;
                          console.debug("[sync] end", { correlationId, elapsed });
                        }
                        setSyncLoading(false);
                      }
                    }}
                    className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:border-indigo-400 hover:text-indigo-200"
                  >
                    {syncStatus === "running"
                      ? "Sincronizando..."
                      : syncStatus === "success"
                        ? "Dados sincronizados"
                        : syncStatus === "nochange"
                          ? "Sem novidades"
                          : syncStatus === "error"
                            ? "Falha ao sincronizar"
                            : "Recarregar dados"}
                  </button>
                  <button
                    type="button"
                    onClick={resetFilters}
                    disabled={!hasActiveFilters}
                className="rounded-lg border border-rose-500/60 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:border-rose-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                title="Limpar filtros (Esc)"
              >
                Limpar filtros
              </button>
            </div>
            {reloadWarning ? (
              <div className="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                {reloadWarning}
              </div>
            ) : null}
          </div>

          {/* Gauge fixo do desempenho do projeto */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 shadow-[0_18px_60px_-45px_rgba(0,0,0,0.9)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">Desempenho do projeto</p>
                <p className="text-xs text-slate-400">Percentual que falta para concluir</p>
              </div>
            </div>
            <div className="mt-3 tc-card__body tc-card__body--kpi">
              <ProjectPerformanceGauge tasks={filteredTasks ?? tasks ?? []} />
            </div>
          </div>
        </div>

        {graphSlides.length > 0 && (
          <div className="space-y-2">
            <div className="relative">
                  <div
                    className="relative isolate overflow-hidden rounded-2xl bg-transparent"
                    data-testid="tarefas-carousel-wrapper"
                  >
                    <div
                      className="flex h-full flex-nowrap items-stretch gap-0 transition-transform duration-700 ease-in-out"
                      style={{ transform: `translateX(-${graphSlideIndex * 100}%)`, minHeight: "460px" }}
                    >
                      {graphSlides.map((slide, index) => (
                        <div
                          key={`${slide.id}-${index === graphSlideIndex ? graphAnimationNonce : 0}`}
                          className="flex h-full flex-shrink-0"
                          style={{ flex: "0 0 100%", minWidth: "100%", width: "100%" }}
                        >
                          <div className="flex h-full w-full px-4 py-2">
                            <div className="flex-1">{slide.content}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex w-full items-center justify-between py-2 text-xs text-slate-400">
                  <div className="flex flex-1 justify-center gap-1">
                    {graphSlides.map((slide, index) => (
                      <button
                        key={slide.id}
                        type="button"
                        aria-label={`Slide ${index + 1}`}
                        onClick={() => setGraphSlideIndex(index)}
                        className={`h-2 w-8 rounded-full transition ${
                          index === graphSlideIndex ? "bg-emerald-400" : "bg-slate-700 hover:bg-slate-600"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      data-testid="tarefas-autoplay-toggle"
                      onClick={() => {
                        setGraphAutoPlay((playing) => {
                          const next = !playing;
                          console.debug("[tarefas] autoplay toggle", { from: playing, to: next });
                          return next;
                        });
                      }}
                      className="rounded-full border border-indigo-500/40 bg-indigo-600/80 px-3 py-1 text-xs font-semibold text-white transition hover:border-indigo-400 disabled:opacity-50"
                    >
                      {graphAutoPlay ? "Pausar slides" : "Retomar slides"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 grid gap-3 lg:grid-cols-6 md:grid-cols-3 sm:grid-cols-2">
              <StatCard
                label="Total"
                value={stats.total}
                onClick={() => {
                  setStatus("all");
                  setDeadline("all");
                }}
              />
              <StatCard
                label="Concluídas"
                value={stats.done}
                accent="emerald"
                onClick={() => {
                  setStatus("done");
                  setDeadline("all");
                }}
              />
              <StatCard
                label="Em andamento"
                value={stats.pending}
                accent="amber"
                onClick={() => {
                  setStatus("pending");
                  setDeadline("all");
                }}
              />
              <StatCard
                label="Atrasadas"
                value={stats.overdue}
                accent="rose"
                onClick={() => {
                  setStatus("all");
                  setDeadline("overdue");
                }}
              />
              <StatCard
                label="Média de tempo"
                value={stats.avgSeconds ? formatDurationHHMM(stats.avgSeconds) : "Sem dados"}
                accent="indigo"
              />
              <StatCard
                label="Tempo total"
                value={stats.totalSeconds ? formatDurationHHMM(stats.totalSeconds) : "Sem dados"}
                accent="indigo"
              />
            </div>

            <div className="grid gap-3 xl:grid-cols-3">
              <InfoCard
                title="Horas consumidas (ms)"
                value={formatHoursLabel(hoursSummary.month)}
                subtitle="Usamos as durações registradas nas tarefas."
              />
              <InfoCard
                title="Horas consumidas (trimestre)"
                value={formatHoursLabel(hoursSummary.quarter)}
                subtitle="Período do trimestre corrente."
              />
              <InfoCard
                title="Horas consumidas (total)"
                value={formatHoursLabel(hoursSummary.total)}
                subtitle="Somatório geral no recorte atual."
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <InfoCard
                title="Horas contratadas"
                value="Aguardando base"
                subtitle="Mensal e trimestral (ativar ao receber contratos)"
              />
              <InfoCard
                title="Projetos ativos"
                value={projectsOverview.activeCount}
                subtitle="Projetos com tarefas pendentes ou atrasadas"
              />
              <InfoCard
                title="Tarefas pendentes"
                value={projectsOverview.pendingTotal}
                subtitle="Inclui atrasadas e sem status"
              />
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/45 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-indigo-300">Projetos e horas</p>
                    <p className="text-sm text-slate-400">Horas consumidas e status por projeto (clique para filtrar).</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowProjectsPanel((open) => !open)}
                    className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 transition hover:border-indigo-400 hover:text-indigo-100"
                  >
                    {showProjectsPanel ? "Recolher" : "Expandir"} ({projectsOverview.groups.length})
                  </button>
                </div>

                {showProjectsPanel && (
                  <div className="mt-4 space-y-3">
                    {projectsOverview.groups.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/40 px-4 py-6 text-center text-slate-400">
                        Nenhum projeto no recorte atual.
                      </div>
                    ) : (
                      projectsList.map((group) => (
                        <button
                          key={group.name}
                          type="button"
                          onClick={() => handleProjectSelect(group.name)}
                          className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-left transition hover:border-indigo-400/60 hover:shadow-[0_10px_40px_-30px_rgba(99,102,241,0.6)]"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-white">{group.name}</p>
                              <p className="text-xs text-slate-400">
                                Horas consumidas: {formatHoursLabel(group.duration)}
                              </p>
                            </div>
                            <div className="text-right text-xs text-slate-400">
                              <p>Pendentes/atr: {group.pending + group.overdue}</p>
                              <p>Concluídas: {group.done}</p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                    {projectsOverview.groups.length > projectsList.length && (
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={() => setShowAllProjects(true)}
                          className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:border-indigo-400 hover:text-indigo-200"
                        >
                          Ver mais projetos
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/45 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-indigo-300">Tarefas pendentes</p>
                    <p className="text-sm text-slate-400">Top pendências por prazo ou criação.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPendingPanel((open) => !open)}
                    className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200 transition hover:border-indigo-400 hover:text-indigo-100"
                  >
                    {showPendingPanel ? "Recolher" : "Expandir"} ({pendingHighlights.length})
                  </button>
                </div>

                {showPendingPanel && (
                  <div className="mt-4 space-y-3">
                    {pendingHighlights.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/40 px-4 py-6 text-center text-slate-400">
                        Nenhuma pendência no recorte atual.
                      </div>
                    ) : (
                      pendingList.map((task, index) => (
                        <div
                          key={`${task.title}-${index}`}
                          className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 shadow-[0_10px_40px_-35px_rgba(0,0,0,0.6)]"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-white">{task.title}</p>
                            <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
                              {STATUS_LABELS[task.statusKey]?.label ?? "Sem status"}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                            <span className="rounded-full border border-slate-700 px-3 py-1">
                              {task.deadlineLabel || "Sem prazo"}
                            </span>
                            <span className="rounded-full border border-slate-700 px-3 py-1">
                              {task.project || "Sem projeto"}
                            </span>
                            <span className="rounded-full border border-slate-700 px-3 py-1">
                              {task.consultant || "Sem consultor"}
                            </span>
                            <span className="rounded-full border border-slate-700 px-3 py-1">
                              {formatDurationHHMM(task.durationSeconds)}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                    {pendingHighlights.length > pendingList.length && (
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={() => setShowAllPending(true)}
                          className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:border-indigo-400 hover:text-indigo-200"
                        >
                          Ver mais pendências
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6">
              {(error || timesError) && (
                <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
                  {String(error || timesError)}
                </div>
              )}

              {loading || loadingTimes ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-28 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/60"
                    />
                  ))}
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/40 px-6 py-8 text-center text-slate-400">
                  Nenhuma tarefa encontrada para os filtros atuais.
                </div>
              ) : (
                <>
                  <TaskListTable tasks={paginatedTasks} />

                  {filteredTasks.length > pageSize && (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
                      <span>
                        Mostrando {Math.min((page - 1) * pageSize + 1, filteredTasks.length)}-
                        {Math.min(page * pageSize, filteredTasks.length)} de {filteredTasks.length}
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="rounded-lg border border-slate-800 px-3 py-1 transition hover:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Anterior
                        </button>

                        <span className="px-2">
                          Página {page} / {totalPages}
                        </span>

                        <button
                          type="button"
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                          className="rounded-lg border border-slate-800 px-3 py-1 transition hover:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Próxima
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

type StatCardProps = {
  label: string;
  value: number | string;
  accent?: "emerald" | "rose" | "indigo" | "amber";
  onClick?: () => void;
};

type InfoCardProps = {
  title: string;
  value: number | string;
  subtitle?: string;
};

function InfoCard({ title, value, subtitle }: InfoCardProps) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-4 shadow-[0_10px_40px_-35px_rgba(0,0,0,0.6)]">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      {subtitle ? <p className="mt-1 text-xs text-slate-400">{subtitle}</p> : null}
    </div>
  );
}

function StatCard({ label, value, accent, onClick }: StatCardProps) {
  const accentClasses =
    accent === "emerald"
      ? "from-emerald-500/20 via-transparent to-transparent border-emerald-500/30 text-emerald-100"
      : accent === "rose"
        ? "from-rose-500/20 via-transparent to-transparent border-rose-500/30 text-rose-100"
        : accent === "amber"
          ? "from-amber-500/20 via-transparent to-transparent border-amber-500/30 text-amber-100"
          : "from-indigo-500/20 via-transparent to-transparent border-indigo-500/30 text-indigo-100";

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-4 text-left transition hover:border-indigo-400/60 hover:shadow-[0_10px_40px_-30px_rgba(99,102,241,0.6)]"
    >
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accentClasses}`}
        aria-hidden="true"
      />
      <div className="relative">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
        <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      </div>
    </button>
  );
}








