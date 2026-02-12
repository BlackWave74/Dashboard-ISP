import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { ProjectPerformanceGauge } from "@/modules/tasks/ui/TaskCharts";
import { TaskFilters } from "@/modules/tasks/ui/TaskFilters";
import { TaskListTable } from "@/modules/tasks/ui/TaskListTable";
import { TaskCharts } from "@/modules/tasks/ui/TaskCharts";
import { useElapsedTimes } from "@/modules/tasks/api/useElapsedTimes";
import { useTasks } from "@/modules/tasks/api/useTasks";
import { type TaskRecord, type TaskView } from "@/modules/tasks/types";
import {
  RefreshCw,
  Clock,
  AlertTriangle,
  Layers,
  ChevronLeft,
  ChevronRight,
  X,
  Users,
  FolderKanban,
  Timer,
  CheckCircle2,
  Hourglass,
  TrendingUp,
  BarChart3,
  ChevronDown,
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

/* ─── Helpers (business logic preserved) ─── */

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

/* ─── Animations ─── */
const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

/* ─── Page ─── */

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
  const [chartSlide, setChartSlide] = useState(0);
  const [showCharts, setShowCharts] = useState(true);
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

  const scrollToFilters = useCallback(() => {
    filtersBoxRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const hasActiveFilters =
    !!search || status !== "all" || deadline !== "all" || period !== "all" || consultant !== "all" || project !== "all" || !!dateFrom || !!dateTo || !!deadlineTo;

  const resetFilters = useCallback(() => {
    setSearch(""); setDebouncedSearch(""); setStatus("all"); setDeadline("all");
    setPeriod("all"); setConsultant("all"); setProject("all");
    setDateFrom(""); setDateTo(""); setDeadlineTo(""); setPage(1);
    requestAnimationFrame(() => { scrollToFilters(); searchInputRef.current?.focus(); });
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

  // Duration map
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

  // Scope by company
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
    return { total: totalOverall, done, overdue, pending, totalSeconds: totalSeconds || 0 };
  }, [filteredTasks, totalOverall]);

  // Unique clients & projects
  const uniqueClients = useMemo(() => {
    const set = new Set<string>();
    filteredTasks.forEach((t) => {
      const clientName = t.raw.projects && typeof t.raw.projects === "object"
        ? String((t.raw.projects as any)?.name ?? "").trim()
        : "";
      const projectName = (t.project || "").trim();
      const name = clientName || projectName;
      if (name && name.toLowerCase() !== "projeto indefinido") set.add(name);
    });
    return set;
  }, [filteredTasks]);

  const uniqueProjects = useMemo(() => {
    const set = new Set<string>();
    filteredTasks.forEach((t) => {
      const name = (t.project || "").trim();
      if (name && name.toLowerCase() !== "projeto indefinido") set.add(name);
    });
    return set;
  }, [filteredTasks]);

  const pendingHighlights = useMemo(() => {
    return filteredTasks
      .filter((t) => t.statusKey === "pending" || t.statusKey === "overdue" || t.statusKey === "unknown")
      .sort((a, b) => {
        const aDate = (a.deadlineDate ?? parseDateValue(a.raw["created_at"]))?.getTime() ?? Infinity;
        const bDate = (b.deadlineDate ?? parseDateValue(b.raw["created_at"]))?.getTime() ?? Infinity;
        return aDate - bDate;
      })
      .slice(0, 8);
  }, [filteredTasks]);

  // Activity bars
  const activityBars = useMemo(() => {
    const monthMap = new Map<string, { done: number; pending: number }>();
    filteredTasks.forEach((t) => {
      const d = t.deadlineDate || parseDateValue(t.raw["created_at"]) || parseDateValue(t.raw["createdAt"]);
      if (!d) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const cur = monthMap.get(key) ?? { done: 0, pending: 0 };
      if (t.statusKey === "done") cur.done += 1;
      else cur.pending += 1;
      monthMap.set(key, cur);
    });
    return [...monthMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, val]) => {
        const [, m] = key.split("-");
        const monthLabel = new Date(2024, Number(m) - 1).toLocaleString("pt-BR", { month: "short" }).replace(".", "");
        return { month: monthLabel, done: val.done, pending: val.pending, total: val.done + val.pending };
      });
  }, [filteredTasks]);

  const maxBarValue = Math.max(1, ...activityBars.map((b) => b.total));

  // Project hours for bar chart
  const projectHoursData = useMemo(() => {
    const map = new Map<string, { seconds: number; count: number }>();
    filteredTasks.forEach((t) => {
      const name = (t.project || "").trim();
      if (!name || name.toLowerCase() === "projeto indefinido") return;
      const cur = map.get(name) ?? { seconds: 0, count: 0 };
      cur.seconds += t.durationSeconds ?? 0;
      cur.count += 1;
      map.set(name, cur);
    });
    return [...map.entries()]
      .map(([name, { seconds, count }]) => ({ name, hours: seconds / 3600, count }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 8);
  }, [filteredTasks]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [debouncedSearch, status, deadline, period, dateFrom, dateTo, deadlineTo, consultant]);

  const totalHours = stats.totalSeconds / 3600;
  const totalHoursLabel = totalHours >= 10 ? `${Math.round(totalHours)}` : totalHours >= 1 ? totalHours.toFixed(1) : totalHours > 0 ? `${Math.round(totalHours * 60)}m` : "0";
  const pctDone = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  const chartSlides = [
    { id: "overview", label: "Visão Geral" },
    { id: "charts", label: "Gráficos Detalhados" },
  ];

  return (
    <div className="task-page min-h-screen bg-[hsl(var(--task-bg))]">
      {/* Background blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-[hsl(var(--task-yellow)/0.04)] blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-[hsl(var(--task-purple)/0.05)] blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1800px] px-4 py-5 sm:px-6 lg:px-8">

        {/* ═══ HEADER ═══ */}
        <motion.div {...fadeUp} className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[hsl(var(--task-text))] tracking-tight">
              Visão Geral de Atividades
            </h1>
            <p className="mt-0.5 text-sm text-[hsl(var(--task-text-muted))]">
              Gerencie suas tarefas, acompanhe prazos e monitore o progresso dos projetos.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[10px] text-[hsl(var(--task-text-muted))]">
              <span className={`h-1.5 w-1.5 rounded-full ${refreshing ? "bg-[hsl(var(--task-yellow))] animate-pulse" : "bg-emerald-400"}`} />
              {formatLastUpdated(combinedLastUpdated)}
            </div>
            <button
              type="button"
              onClick={() => { reload(); reloadTimes(); }}
              disabled={refreshing}
              className="flex items-center gap-1.5 rounded-xl border border-[hsl(var(--task-border))] bg-[hsl(var(--task-surface))] px-3.5 py-2 text-xs font-medium text-[hsl(var(--task-text-muted))] transition hover:border-[hsl(var(--task-yellow)/0.4)] hover:text-[hsl(var(--task-yellow))] disabled:opacity-40"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Atualizar
            </button>
          </div>
        </motion.div>

        {/* ═══ KPI CARDS ═══ */}
        <motion.div variants={stagger} initial="initial" animate="animate" className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <KpiCard icon={Users} label="Clientes Atendidos" value={uniqueClients.size} color="yellow" delay={0} />
          <KpiCard icon={FolderKanban} label="Projetos Ativos" value={uniqueProjects.size} color="purple" delay={0.05} />
          <KpiCard icon={Timer} label="Horas Alocadas" value={`${totalHoursLabel}h`} color="blue" delay={0.1} />
          <KpiCard icon={Hourglass} label="Em Andamento" value={stats.pending} color="yellow" delay={0.15} />
          <KpiCard icon={CheckCircle2} label="Concluídas" value={stats.done} color="green" delay={0.2} />
          <KpiCard icon={AlertTriangle} label="Atrasadas" value={stats.overdue} color="red" delay={0.25} />
        </motion.div>

        {/* ═══ MAIN DASHBOARD: 3-column ═══ */}
        <div className="mb-6 grid gap-4 xl:grid-cols-[1fr_280px_320px]">

          {/* LEFT: Project Overview + Activity */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="task-card flex flex-col"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[hsl(var(--task-yellow))]">
                Resumo do Projeto
              </p>
              <h2 className="mt-1 text-2xl font-extrabold text-[hsl(var(--task-text))] tracking-tight">
                Atividade Mensal
              </h2>
              </div>
              <div className="flex items-center gap-3 text-[9px] text-[hsl(var(--task-text-muted))]">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[hsl(var(--task-yellow))]" />Concluídas</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[hsl(var(--task-purple))]" />Pendentes</span>
              </div>
            </div>

            {/* 3 Hero Stats */}
            <div className="flex items-end gap-8 mb-6">
              <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-[hsl(var(--task-text-muted))]">Horas</p>
                <p className="text-4xl font-extrabold text-[hsl(var(--task-text))] leading-none">
                  {totalHoursLabel}<span className="text-base font-medium text-[hsl(var(--task-text-muted))] ml-1">h</span>
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.15em] text-[hsl(var(--task-text-muted))]">Tarefas</p>
                <p className="text-4xl font-extrabold text-[hsl(var(--task-text))] leading-none">{stats.total}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.15em] text-[hsl(var(--task-text-muted))]">Concluídas</p>
                <p className="text-4xl font-extrabold text-emerald-400 leading-none">{stats.done}</p>
              </div>
            </div>

            {/* Activity Bar Chart */}
            <div className="flex-1 min-h-[200px]">
              <div className="flex items-end gap-3 h-[180px]">
                {activityBars.map((bar, i) => {
                  const doneH = maxBarValue > 0 ? (bar.done / maxBarValue) * 100 : 0;
                  const pendH = maxBarValue > 0 ? (bar.pending / maxBarValue) * 100 : 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                      <span className="text-[9px] font-bold text-[hsl(var(--task-text-muted))]">
                        {bar.total > 0 ? `${Math.round((bar.done / bar.total) * 100)}%` : ""}
                      </span>
                      <div className="w-full flex items-end gap-[3px] h-[140px]">
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.max(doneH, 6)}%` }}
                          transition={{ delay: i * 0.06 + 0.4, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                          className="flex-1 rounded-t-md bg-gradient-to-t from-[hsl(var(--task-yellow))] to-[hsl(var(--task-yellow)/0.7)]"
                        />
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.max(pendH, 6)}%` }}
                          transition={{ delay: i * 0.06 + 0.5, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                          className="flex-1 rounded-t-md bg-gradient-to-t from-[hsl(var(--task-purple))] to-[hsl(var(--task-purple)/0.6)]"
                        />
                      </div>
                      <span className="text-[10px] font-medium text-[hsl(var(--task-text-muted))] capitalize">{bar.month}</span>
                    </div>
                  );
                })}
                {activityBars.length === 0 && (
                  <div className="flex w-full items-center justify-center text-xs text-[hsl(var(--task-text-muted))]">
                    Sem dados de atividade
                  </div>
                )}
              </div>

              {/* Progress bar */}
              {stats.total > 0 && (
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-[hsl(var(--task-border))] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pctDone}%` }}
                      transition={{ duration: 1, delay: 0.6 }}
                      className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--task-yellow))] via-emerald-400 to-emerald-500"
                    />
                  </div>
                  <span className="text-xs font-bold text-emerald-400">{pctDone}%</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* CENTER: Performance Gauge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="task-card flex flex-col items-center justify-center"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[hsl(var(--task-yellow))] mb-2">
              Progresso das Tarefas
            </p>
            <div className="flex-1 flex items-center justify-center w-full">
              <ProjectPerformanceGauge tasks={filteredTasks ?? []} footerHint="" />
            </div>

            {/* Mini stats */}
            <div className="grid grid-cols-2 gap-2 w-full mt-3">
              <div className="rounded-xl bg-[hsl(var(--task-bg))] border border-[hsl(var(--task-border))] px-3 py-2.5 text-center">
                <p className="text-[9px] uppercase tracking-wider text-[hsl(var(--task-text-muted))]">Pendentes</p>
                <p className="text-xl font-extrabold text-[hsl(var(--task-yellow))]">{stats.pending}</p>
              </div>
              <div className="rounded-xl bg-[hsl(var(--task-bg))] border border-[hsl(var(--task-border))] px-3 py-2.5 text-center">
                <p className="text-[9px] uppercase tracking-wider text-[hsl(var(--task-text-muted))]">Feitas</p>
                <p className="text-xl font-extrabold text-emerald-400">{stats.done}</p>
              </div>
            </div>
          </motion.div>

          {/* RIGHT: Deadlines */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="task-card flex flex-col"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[hsl(var(--task-yellow)/0.15)]">
                <Clock className="h-3.5 w-3.5 text-[hsl(var(--task-yellow))]" />
              </div>
              <div>
                <p className="text-sm font-bold text-[hsl(var(--task-text))]">Prazos</p>
                <p className="text-[10px] text-[hsl(var(--task-text-muted))]">Próximas entregas pendentes</p>
              </div>
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto max-h-[360px] pr-1 custom-scrollbar">
              {pendingHighlights.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400/20 mb-2" />
                  <p className="text-xs text-[hsl(var(--task-text-muted))]">Tudo em dia!</p>
                </div>
              ) : (
                pendingHighlights.map((task, idx) => (
                  <motion.div
                    key={`${task.title}-${idx}`}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + idx * 0.04 }}
                    className="group rounded-xl border border-[hsl(var(--task-border))] bg-[hsl(var(--task-bg))] p-3 transition-all hover:border-[hsl(var(--task-yellow)/0.3)] hover:bg-[hsl(var(--task-surface-hover))]"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className={`mt-1.5 shrink-0 h-2 w-2 rounded-full ${
                        task.statusKey === "overdue" ? "bg-rose-400 animate-pulse" : "bg-[hsl(var(--task-yellow))]"
                      }`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-[hsl(var(--task-text))] leading-snug truncate">{task.title}</p>
                        <p className="text-[10px] text-[hsl(var(--task-text-muted))] mt-0.5 truncate">{task.project}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[9px]">
                      <span className={`font-semibold ${task.statusKey === "overdue" ? "text-rose-400" : "text-[hsl(var(--task-text-muted))]"}`}>
                        {task.deadlineLabel || "Sem prazo"}
                      </span>
                      <span className="text-[hsl(var(--task-text-muted))]">{task.consultant}</span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {stats.overdue > 0 && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                <span className="text-[10px] font-bold text-rose-400">
                  {stats.overdue} tarefa{stats.overdue > 1 ? "s" : ""} atrasada{stats.overdue > 1 ? "s" : ""}
                </span>
              </div>
            )}
          </motion.div>
        </div>

        {/* ═══ CHARTS SECTION (Collapsible + Slides) ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="mb-6"
        >
          <button
            type="button"
            onClick={() => setShowCharts((v) => !v)}
            className="flex items-center gap-2 mb-3 text-sm font-semibold text-[hsl(var(--task-text))] hover:text-[hsl(var(--task-yellow))] transition"
          >
            <BarChart3 className="h-4 w-4" />
            Análise Detalhada
            <ChevronDown className={`h-4 w-4 transition-transform ${showCharts ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence>
            {showCharts && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <TaskCharts
                  tasks={filteredTasks}
                  barProjectsOverride={projectHoursData}
                  onPickConsultant={(name) => setConsultant(name)}
                  onPickProject={(name) => setProject(name)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ═══ FILTERS ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          ref={filtersBoxRef}
          className="mb-5"
        >
          <TaskFilters
            search={search} setSearch={setSearch}
            status={status} setStatus={setStatus}
            deadline={deadline} setDeadline={setDeadline}
            period={period} setPeriod={setPeriod}
            dateFrom={dateFrom} setDateFrom={setDateFrom}
            dateTo={dateTo} setDateTo={setDateTo}
            deadlineTo={deadlineTo} setDeadlineTo={setDeadlineTo}
            consultant={consultant} setConsultant={setConsultant}
            consultantOptions={consultantOptions}
            searchRef={searchInputRef}
            project={effectiveProjectFilter} setProject={setProject}
            projectOptions={projectOptions}
            projectDisabled={Boolean(lockedProject)}
          />
          {hasActiveFilters && (
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={resetFilters}
                className="flex items-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/5 px-3 py-1.5 text-[10px] font-medium text-rose-400 transition hover:bg-rose-500/10"
              >
                <X className="h-3 w-3" />
                Limpar filtros
              </button>
            </div>
          )}
        </motion.div>

        {/* ═══ TASK LIST ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.45 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-[hsl(var(--task-text))]">
              Lista de Atividades
              <span className="ml-2 text-xs font-normal text-[hsl(var(--task-text-muted))]">
                {filteredTasks.length} {filteredTasks.length === 1 ? "tarefa encontrada" : "tarefas encontradas"}
              </span>
            </h3>
          </div>

          {(error || timesError) && (
            <div className="mb-3 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-2.5 text-xs text-rose-400">
              {String(error || timesError)}
            </div>
          )}

          {loading || loadingTimes ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="task-shimmer h-14 rounded-xl" />
              ))}
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[hsl(var(--task-border))] bg-[hsl(var(--task-surface))] px-6 py-16 text-center">
              <Layers className="h-10 w-10 text-[hsl(var(--task-text-muted)/0.15)] mb-3" />
              <p className="text-sm font-medium text-[hsl(var(--task-text-muted))]">Nenhuma atividade encontrada</p>
              <p className="text-xs text-[hsl(var(--task-text-muted)/0.5)] mt-1">Tente ajustar os filtros ou atualizar os dados.</p>
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
        </motion.div>
      </div>
    </div>
  );
}

/* ─── KPI Card Component ─── */

type KpiCardProps = {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: "yellow" | "purple" | "blue" | "green" | "red";
  delay?: number;
};

const colorMap = {
  yellow: { icon: "bg-[hsl(var(--task-yellow)/0.15)] text-[hsl(var(--task-yellow))]", glow: "hover:border-[hsl(var(--task-yellow)/0.3)] hover:shadow-[0_0_20px_hsl(var(--task-yellow)/0.08)]" },
  purple: { icon: "bg-[hsl(var(--task-purple)/0.15)] text-[hsl(var(--task-purple))]", glow: "hover:border-[hsl(var(--task-purple)/0.3)] hover:shadow-[0_0_20px_hsl(var(--task-purple)/0.08)]" },
  blue: { icon: "bg-[hsl(220_90%_56%/0.15)] text-[hsl(220_90%_56%)]", glow: "hover:border-[hsl(220_90%_56%/0.3)] hover:shadow-[0_0_20px_hsl(220_90%_56%/0.08)]" },
  green: { icon: "bg-emerald-500/15 text-emerald-400", glow: "hover:border-emerald-500/30 hover:shadow-[0_0_20px_rgba(16,185,129,0.08)]" },
  red: { icon: "bg-rose-500/15 text-rose-400", glow: "hover:border-rose-500/30 hover:shadow-[0_0_20px_rgba(244,63,94,0.08)]" },
};

function KpiCard({ icon: Icon, label, value, color, delay = 0 }: KpiCardProps) {
  const c = colorMap[color];
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`task-card group flex items-center gap-3 transition-all ${c.glow}`}
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${c.icon}`}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.15em] text-[hsl(var(--task-text-muted))] truncate">{label}</p>
        <p className="text-xl font-extrabold text-[hsl(var(--task-text))] leading-tight">{value}</p>
      </div>
    </motion.div>
  );
}
