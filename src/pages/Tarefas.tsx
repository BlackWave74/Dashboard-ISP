import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { TaskCharts, ProjectPerformanceGauge } from "@/modules/tasks/ui/TaskCharts";
import { TaskFilters } from "@/modules/tasks/ui/TaskFilters";
import { TaskListTable } from "@/modules/tasks/ui/TaskListTable";
import { useElapsedTimes } from "@/modules/tasks/api/useElapsedTimes";
import { useTasks } from "@/modules/tasks/api/useTasks";
import { STATUS_LABELS, type TaskRecord, type TaskView } from "@/modules/tasks/types";
import {
  RefreshCw,
  BarChart3,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Layers,
  ChevronLeft,
  ChevronRight,
  Zap,
  Target,
  X,
} from "lucide-react";
import {
  deadlineColor,
  formatDatePtBR,
  formatDurationHHMM,
  isDeadlineSoon,
  parseDateValue,
  normalizeTaskTitle,
  type TaskStatusKey,
} from "@/modules/tasks/utils";

/* ─── Helpers ─── */

const isCompletedStatus = (value?: string) => {
  const n = (value ?? "").toLowerCase();
  return ["done", "concluido", "concluído", "completed", "finalizado"].includes(n);
};

const mapStatusKey = (statusRaw: string | number | undefined, deadline: Date | null): TaskStatusKey => {
  if (statusRaw === undefined || statusRaw === null) return "unknown";
  const asNumber = typeof statusRaw === "number" ? statusRaw : Number(statusRaw);
  if (!Number.isNaN(asNumber)) {
    if (asNumber === 5) return "done";
    if (deadline && deadline < new Date()) return "overdue";
    if ([2, 3, 4, 6].includes(asNumber)) return "pending";
  }
  const asString = String(statusRaw).toLowerCase();
  if (isCompletedStatus(asString)) return "done";
  if (deadline && deadline < new Date()) return "overdue";
  if (["em andamento", "in progress", "pendente", "pending"].includes(asString)) return "pending";
  return "unknown";
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

const pickField = (task: TaskRecord, keys: string[], fallback = ""): string => {
  for (const key of keys) {
    if (task[key]) return String(task[key]);
  }
  return fallback;
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

const formatHoursLabel = (seconds?: number) => {
  if (!seconds || seconds <= 0) return "Sem dados";
  const hours = seconds / 3600;
  if (hours >= 10) return `${Math.round(hours)} h`;
  if (hours >= 1) return `${hours.toFixed(1)} h`;
  return `${Math.max(1, Math.round(hours * 60))} min`;
};

const STATUS_ORDER: TaskStatusKey[] = ["done", "pending", "overdue", "unknown"];

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
  const consultant = pickField(task, ["responsible_name", "consultant", "owner", "responsavel"], "Sem consultor");
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
  const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
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

const aggregateProjectHours = (tasks: TaskView[]) => {
  const map = new Map<string, { hours: number; seconds: number; count: number }>();
  tasks.forEach((task) => {
    const name = (task.project || "").trim() || "Projeto indefinido";
    const seconds = typeof task.durationSeconds === "number" ? Math.max(0, task.durationSeconds) : 0;
    const current = map.get(name) ?? { hours: 0, seconds: 0, count: 0 };
    current.seconds += seconds;
    current.hours = current.seconds / 3600;
    current.count += 1;
    map.set(name, current);
  });
  return [...map.entries()]
    .map(([projectName, data]) => ({ projectName, ...data }))
    .sort((a, b) => b.hours - a.hours || b.count - a.count);
};

/* ─── Sub-components ─── */

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const } }),
};

function StatCard({
  label,
  value,
  icon: Icon,
  accent = "default",
  onClick,
}: {
  label: string;
  value: number | string;
  icon?: React.ElementType;
  accent?: "yellow" | "green" | "red" | "purple" | "default";
  onClick?: () => void;
}) {
  const accents = {
    yellow: { border: "border-[hsl(var(--task-yellow)/0.25)]", glow: "bg-[hsl(var(--task-yellow)/0.08)]", icon: "text-[hsl(var(--task-yellow))]", value: "text-[hsl(var(--task-yellow))]" },
    green: { border: "border-emerald-500/25", glow: "bg-emerald-500/8", icon: "text-emerald-400", value: "text-emerald-400" },
    red: { border: "border-rose-500/25", glow: "bg-rose-500/8", icon: "text-rose-400", value: "text-rose-400" },
    purple: { border: "border-[hsl(var(--task-purple)/0.25)]", glow: "bg-[hsl(var(--task-purple)/0.08)]", icon: "text-[hsl(var(--task-purple))]", value: "text-[hsl(var(--task-purple))]" },
    default: { border: "border-[hsl(var(--task-border))]", glow: "", icon: "text-[hsl(var(--task-text-muted))]", value: "text-[hsl(var(--task-text))]" },
  };
  const a = accents[accent];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex flex-col gap-1 rounded-xl border ${a.border} bg-[hsl(var(--task-surface))] p-4 text-left transition hover:bg-[hsl(var(--task-surface-hover))] hover:shadow-lg`}
    >
      {a.glow && <div className={`absolute inset-0 rounded-xl ${a.glow} opacity-0 group-hover:opacity-100 transition`} />}
      <div className="relative flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--task-text-muted))]">{label}</p>
        {Icon && <Icon className={`h-4 w-4 ${a.icon}`} />}
      </div>
      <p className={`relative text-2xl font-bold ${a.value}`}>{value}</p>
    </button>
  );
}

/* ─── Page ─── */

const GRAPH_AUTOPLAY_MS = 30000;

export default function TarefasPage() {
  const { session } = useAuth();
  const [nowTs] = useState(() => Date.now());

  // Filter state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [deadline, setDeadline] = useState("all");
  const [period, setPeriod] = useState("30d");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [deadlineTo, setDeadlineTo] = useState("");
  const [consultant, setConsultant] = useState("all");
  const [project, setProject] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const searchInputRef = useRef<HTMLInputElement>(null!);
  const filtersBoxRef = useRef<HTMLDivElement>(null);

  // Data hooks
  const { tasks, loading, error, reload, lastUpdated, totalCount } = useTasks({
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
  } = useElapsedTimes({
    accessToken: session?.accessToken,
    period,
    dateFrom,
    dateTo,
  });

  // Carousel state
  const [graphSlideIndex, setGraphSlideIndex] = useState(0);
  const [graphAutoPlay, setGraphAutoPlay] = useState(true);
  const [showProjectsPanel, setShowProjectsPanel] = useState(false);
  const [showPendingPanel, setShowPendingPanel] = useState(false);

  const scrollToFilters = useCallback(() => {
    filtersBoxRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const hasActiveFilters =
    !!search || status !== "all" || deadline !== "all" || period !== "all" || consultant !== "all" || project !== "all" || !!dateFrom || !!dateTo || !!deadlineTo;

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
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const refreshing = loading || loadingTimes;
  const combinedLastUpdated =
    lastUpdated && lastUpdatedTimes
      ? Math.min(lastUpdated, lastUpdatedTimes)
      : lastUpdated ?? lastUpdatedTimes ?? null;

  // Duration map from elapsed_times
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

  // Normalize tasks
  const normalizedTasks = useMemo(() => {
    return tasks.map((task) => {
      const rawId = task["id"] ?? task["task_id"];
      const taskId = rawId === undefined || rawId === null ? undefined : String(rawId);
      const seconds = taskId ? durationByTaskId[taskId] : undefined;
      return normalizeTask(task, seconds);
    });
  }, [tasks, durationByTaskId]);

  // Scope tasks by company for cliente role
  const companyName = session?.company?.trim();
  const scopedTasks = useMemo(() => {
    if (!companyName || session?.role !== "cliente") return normalizedTasks;
    const needle = companyName.toLowerCase();
    return normalizedTasks.filter((task) => {
      const projectName = (task.project || "").toLowerCase();
      const joinedProject =
        typeof task.raw.projects === "object" && task.raw.projects !== null
          ? String((task.raw.projects as TaskRecord)["name"] ?? "").toLowerCase()
          : "";
      return projectName.includes(needle) || joinedProject.includes(needle);
    });
  }, [normalizedTasks, companyName, session?.role]);

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
    return scopedTasks.filter((t) => matchesSearchTerm(t, searchTerm));
  }, [scopedTasks, searchTerm, matchesSearchTerm]);

  // Filter options
  const projectOptions = useMemo(() => {
    const set = new Set<string>();
    searchScopedTasks.forEach((task) => {
      const name = (task.project || "").trim();
      if (!name || name.toLowerCase() === "projeto indefinido") return;
      set.add(name);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [searchScopedTasks]);

  const consultantOptions = useMemo(() => {
    const set = new Set<string>();
    searchScopedTasks.forEach((task) => {
      const name = (task.consultant || "").trim();
      if (!name) return;
      set.add(name);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [searchScopedTasks]);

  const lockedProject = session?.role === "cliente" && session.company?.trim();
  const effectiveProjectFilter = lockedProject ? session.company?.trim() ?? "all" : project;

  // Filtered tasks
  const filteredTasks = useMemo(() => {
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

      const matchesConsultant = consultant === "all" || task.consultant.toLowerCase() === consultant.toLowerCase();
      const matchesProject = effectiveProjectFilter === "all" || task.project.toLowerCase().includes(String(effectiveProjectFilter).toLowerCase());
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
      const deadlineDate = parseDateValue(task.raw["due_date"]) || parseDateValue(task.raw["dueDate"]) || parseDateValue(task.raw["deadline"]);
      const deadlineLimit = deadlineTo ? parseDateValue(deadlineTo) : null;
      const matchesDeadlineDate = !deadlineLimit || (deadlineDate ? deadlineDate <= deadlineLimit : false);

      return matchesSearchTerm(task, searchTerm) && matchesConsultant && matchesProject && matchesStatus && matchesDeadline && matchesDeadlineDate;
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

    return [...visible].sort((a, b) => {
      const diff = score(a) - score(b);
      if (diff !== 0) return diff;
      return a.title.localeCompare(b.title);
    });
  }, [scopedTasks, period, searchTerm, status, deadline, dateFrom, dateTo, deadlineTo, consultant, effectiveProjectFilter, nowTs, matchesSearchTerm]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / pageSize));
  const paginatedTasks = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTasks.slice(start, start + pageSize);
  }, [filteredTasks, page]);

  // Stats
  const totalOverall = totalCount ?? filteredTasks.length;
  const stats = useMemo(() => {
    const done = filteredTasks.filter((t) => t.statusKey === "done").length;
    const overdue = filteredTasks.filter((t) => t.statusKey === "overdue").length;
    const pending = filteredTasks.filter((t) => t.statusKey === "pending" || t.statusKey === "unknown").length;
    const durations = filteredTasks.map((t) => t.durationSeconds).filter((v): v is number => typeof v === "number");
    const totalSeconds = durations.reduce((acc, curr) => acc + curr, 0);
    const avgSeconds = durations.length ? Math.round(totalSeconds / durations.length) : undefined;
    return { total: totalOverall, done, overdue, pending, avgSeconds, totalSeconds: totalSeconds || undefined };
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
    return { total: sumFrom(null), month: sumFrom(monthStart), quarter: sumFrom(quarterStart) };
  }, [filteredTasks]);

  const projectsOverview = useMemo(() => {
    const map = new Map<string, { total: number; pending: number; overdue: number; done: number; duration: number }>();
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
    return filteredTasks
      .filter((t) => t.statusKey === "pending" || t.statusKey === "overdue" || t.statusKey === "unknown")
      .sort((a, b) => {
        const aDate = (a.deadlineDate ?? parseDateValue(a.raw["created_at"]))?.getTime() ?? Infinity;
        const bDate = (b.deadlineDate ?? parseDateValue(b.raw["created_at"]))?.getTime() ?? Infinity;
        return aDate - bDate;
      })
      .slice(0, 10);
  }, [filteredTasks]);

  // Chart data
  const barProjectsFromTasks = useMemo(() => {
    return aggregateProjectHours(filteredTasks)
      .slice(0, 8)
      .map((row) => ({
        name: row.projectName || "Projeto",
        hours: Math.max(0, row.hours),
        count: row.count,
      }));
  }, [filteredTasks]);

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

  // Autoplay carousel
  useEffect(() => {
    if (!graphAutoPlay) return;
    const id = setInterval(() => {
      setGraphSlideIndex((prev) => (prev + 1) % 2);
    }, GRAPH_AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [graphAutoPlay]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, deadline, period, dateFrom, dateTo, deadlineTo, consultant]);

  return (
    <div className="task-page min-h-screen bg-[hsl(var(--task-bg))] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1800px] space-y-6">

        {/* ── HEADER ── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-wrap items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-[hsl(var(--task-text))]">
              Central de Tarefas
            </h1>
            <p className="mt-1 text-sm text-[hsl(var(--task-text-muted))]">
              Visão geral do progresso e atividades do projeto
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => { reload(); reloadTimes(); }}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-lg border border-[hsl(var(--task-border))] bg-[hsl(var(--task-surface))] px-4 py-2 text-xs font-medium text-[hsl(var(--task-text))] transition hover:border-[hsl(var(--task-yellow)/0.4)] hover:text-[hsl(var(--task-yellow))] disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Atualizando..." : "Atualizar"}
            </button>
            <div className="flex items-center gap-2 rounded-lg border border-[hsl(var(--task-border))] bg-[hsl(var(--task-surface))] px-3 py-2 text-[10px] text-[hsl(var(--task-text-muted))]">
              <span className={`h-1.5 w-1.5 rounded-full ${refreshing ? "bg-[hsl(var(--task-yellow))] animate-pulse" : "bg-emerald-400"}`} />
              {formatLastUpdated(combinedLastUpdated)}
            </div>
          </div>
        </motion.div>

        {/* ── STAT CARDS ROW ── */}
        <motion.div
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
        >
          <motion.div custom={0} variants={fadeUp}>
            <StatCard label="Total" value={stats.total} icon={Layers} onClick={() => { setStatus("all"); setDeadline("all"); }} />
          </motion.div>
          <motion.div custom={1} variants={fadeUp}>
            <StatCard label="Concluídas" value={stats.done} icon={CheckCircle2} accent="green" onClick={() => { setStatus("done"); setDeadline("all"); }} />
          </motion.div>
          <motion.div custom={2} variants={fadeUp}>
            <StatCard label="Em andamento" value={stats.pending} icon={Clock} accent="yellow" onClick={() => { setStatus("pending"); setDeadline("all"); }} />
          </motion.div>
          <motion.div custom={3} variants={fadeUp}>
            <StatCard label="Atrasadas" value={stats.overdue} icon={AlertTriangle} accent="red" onClick={() => { setStatus("all"); setDeadline("overdue"); }} />
          </motion.div>
          <motion.div custom={4} variants={fadeUp}>
            <StatCard label="Média de tempo" value={stats.avgSeconds ? formatDurationHHMM(stats.avgSeconds) : "—"} icon={TrendingUp} accent="purple" />
          </motion.div>
          <motion.div custom={5} variants={fadeUp}>
            <StatCard label="Tempo total" value={stats.totalSeconds ? formatDurationHHMM(stats.totalSeconds) : "—"} icon={Zap} accent="purple" />
          </motion.div>
        </motion.div>

        {/* ── MAIN GRID: Charts + Sidebar ── */}
        <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
          {/* LEFT: Charts & content */}
          <div className="space-y-6">
            {/* Performance + Hours row */}
            <div className="grid gap-4 md:grid-cols-[1fr_280px]">
              {/* Performance Gauge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="rounded-xl border border-[hsl(var(--task-border))] bg-[hsl(var(--task-surface))] p-5"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-4 w-4 text-[hsl(var(--task-yellow))]" />
                  <p className="text-sm font-semibold text-[hsl(var(--task-text))]">Progresso do Projeto</p>
                </div>
                <ProjectPerformanceGauge tasks={filteredTasks ?? tasks ?? []} />
              </motion.div>

              {/* Hours summary */}
              <div className="flex flex-col gap-3">
                {[
                  { label: "Horas no mês", value: formatHoursLabel(hoursSummary.month), accent: "yellow" as const },
                  { label: "Horas no trimestre", value: formatHoursLabel(hoursSummary.quarter), accent: "purple" as const },
                  { label: "Horas totais", value: formatHoursLabel(hoursSummary.total), accent: "green" as const },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-xl border border-[hsl(var(--task-border))] bg-[hsl(var(--task-surface))] px-4 py-3"
                  >
                    <span className="text-xs text-[hsl(var(--task-text-muted))]">{item.label}</span>
                    <span className={`text-lg font-bold ${
                      item.accent === "yellow" ? "text-[hsl(var(--task-yellow))]" :
                      item.accent === "purple" ? "text-[hsl(var(--task-purple))]" :
                      "text-emerald-400"
                    }`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Charts */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="rounded-xl border border-[hsl(var(--task-border))] bg-[hsl(var(--task-surface))] p-5"
            >
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-4 w-4 text-[hsl(var(--task-purple))]" />
                <p className="text-sm font-semibold text-[hsl(var(--task-text))]">Atividade</p>
              </div>
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
            </motion.div>

            {/* Filters */}
            <div ref={filtersBoxRef}>
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

              {hasActiveFilters && (
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="flex items-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-1.5 text-[10px] font-medium text-rose-400 transition hover:bg-rose-500/10"
                  >
                    <X className="h-3 w-3" />
                    Limpar filtros
                  </button>
                </div>
              )}
            </div>

            {/* Task List Table */}
            <div>
              {(error || timesError) && (
                <div className="mb-4 rounded-lg border border-rose-500/20 bg-rose-500/5 px-4 py-2 text-xs text-rose-400">
                  {String(error || timesError)}
                </div>
              )}

              {loading || loadingTimes ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="task-shimmer h-12 rounded-xl" />
                  ))}
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[hsl(var(--task-border))] bg-[hsl(var(--task-surface))] px-6 py-16 text-center">
                  <Layers className="h-10 w-10 text-[hsl(var(--task-text-muted)/0.3)] mb-3" />
                  <p className="text-sm text-[hsl(var(--task-text-muted))]">Nenhuma tarefa encontrada</p>
                  <p className="text-xs text-[hsl(var(--task-text-muted)/0.6)] mt-1">Tente ajustar os filtros</p>
                </div>
              ) : (
                <>
                  <TaskListTable tasks={paginatedTasks} />

                  {filteredTasks.length > pageSize && (
                    <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[hsl(var(--task-text-muted))]">
                      <span>
                        {Math.min((page - 1) * pageSize + 1, filteredTasks.length)}–{Math.min(page * pageSize, filteredTasks.length)} de {filteredTasks.length}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="rounded-lg border border-[hsl(var(--task-border))] p-1.5 transition hover:border-[hsl(var(--task-yellow)/0.4)] disabled:opacity-30"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="px-3 text-xs font-medium text-[hsl(var(--task-text))]">
                          {page} / {totalPages}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                          className="rounded-lg border border-[hsl(var(--task-border))] p-1.5 transition hover:border-[hsl(var(--task-yellow)/0.4)] disabled:opacity-30"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="space-y-4">
            {/* Projects summary */}
            <div className="rounded-xl border border-[hsl(var(--task-border))] bg-[hsl(var(--task-surface))] p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[hsl(var(--task-yellow))]">Projetos</p>
                <span className="text-[10px] text-[hsl(var(--task-text-muted))]">{projectsOverview.activeCount} ativos</span>
              </div>
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {projectsOverview.groups.length === 0 ? (
                  <p className="text-xs text-[hsl(var(--task-text-muted))] text-center py-4">Nenhum projeto</p>
                ) : (
                  projectsOverview.groups.slice(0, 8).map((group) => (
                    <button
                      key={group.name}
                      type="button"
                      onClick={() => handleProjectSelect(group.name)}
                      className="w-full rounded-lg border border-[hsl(var(--task-border))] bg-[hsl(var(--task-bg))] p-3 text-left transition hover:border-[hsl(var(--task-yellow)/0.3)] hover:bg-[hsl(var(--task-surface-hover))]"
                    >
                      <p className="text-xs font-semibold text-[hsl(var(--task-text))] truncate">{group.name}</p>
                      <div className="mt-1.5 flex items-center gap-3 text-[10px] text-[hsl(var(--task-text-muted))]">
                        <span>{formatHoursLabel(group.duration)}</span>
                        <span>•</span>
                        <span className="text-emerald-400">{group.done} feitas</span>
                        {(group.pending + group.overdue) > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-[hsl(var(--task-yellow))]">{group.pending + group.overdue} pendentes</span>
                          </>
                        )}
                      </div>
                      {/* Mini progress bar */}
                      <div className="mt-2 h-1 w-full rounded-full bg-[hsl(var(--task-border))] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--task-yellow))] to-emerald-400 transition-all"
                          style={{ width: `${group.total > 0 ? (group.done / group.total) * 100 : 0}%` }}
                        />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Pending tasks */}
            <div className="rounded-xl border border-[hsl(var(--task-border))] bg-[hsl(var(--task-surface))] p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-rose-400">Pendências</p>
                <span className="text-[10px] text-[hsl(var(--task-text-muted))]">{pendingHighlights.length} tarefas</span>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {pendingHighlights.length === 0 ? (
                  <p className="text-xs text-[hsl(var(--task-text-muted))] text-center py-4">Nenhuma pendência</p>
                ) : (
                  pendingHighlights.map((task, idx) => (
                    <div
                      key={`${task.title}-${idx}`}
                      className="rounded-lg border border-[hsl(var(--task-border))] bg-[hsl(var(--task-bg))] p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium text-[hsl(var(--task-text))] leading-tight">{task.title}</p>
                        {task.statusKey === "overdue" && (
                          <span className="shrink-0 flex h-2 w-2 rounded-full bg-rose-400 animate-pulse" />
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="rounded-md bg-[hsl(var(--task-border)/0.5)] px-2 py-0.5 text-[9px] text-[hsl(var(--task-text-muted))]">
                          {task.deadlineLabel || "Sem prazo"}
                        </span>
                        <span className="rounded-md bg-[hsl(var(--task-border)/0.5)] px-2 py-0.5 text-[9px] text-[hsl(var(--task-text-muted))]">
                          {task.consultant}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
