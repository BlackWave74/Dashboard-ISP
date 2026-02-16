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
  const [showDashboard, setShowDashboard] = useState(true);
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

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => { reload(); reloadTimes(); }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [reload, reloadTimes]);

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

  // Compute user's project names for "mine first" sorting in filter dropdown
  const myProjectNames = useMemo(() => {
    const userName = session?.name;
    if (!userName) return new Set<string>();
    const names = new Set<string>();
    normalizedTasks.forEach((t) => {
      const responsible = (t.consultant || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      const me = userName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      if (responsible && me && (responsible.includes(me) || me.includes(responsible))) {
        const name = (t.project || "").trim();
        if (name && name.toLowerCase() !== "projeto indefinido") names.add(name);
      }
    });
    return names;
  }, [normalizedTasks, session?.name]);

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

  // Stats — always use filtered count so numbers match visible tasks
  const stats = useMemo(() => {
    const total = filteredTasks.length;
    const done = filteredTasks.filter((t) => t.statusKey === "done").length;
    const overdue = filteredTasks.filter((t) => t.statusKey === "overdue").length;
    const pending = filteredTasks.filter((t) => t.statusKey === "pending" || t.statusKey === "unknown").length;
    const durations = filteredTasks.map((t) => t.durationSeconds).filter((v): v is number => typeof v === "number");
    const totalSeconds = durations.reduce((acc, curr) => acc + curr, 0);
    return { total, done, overdue, pending, totalSeconds: totalSeconds || 0 };
  }, [filteredTasks]);

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
    <div className="task-page min-h-screen relative">
      
      {/* Background — matching home page purple gradient */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "linear-gradient(180deg, hsl(270 60% 10%) 0%, hsl(250 50% 8%) 25%, hsl(234 45% 7%) 50%, hsl(260 40% 9%) 75%, hsl(234 45% 6%) 100%)",
        }}
      />
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute top-[20%] left-[-10%] h-[600px] w-[600px] rounded-full opacity-20 blur-[160px]"
          style={{ background: "radial-gradient(circle, hsl(270 80% 50%), transparent 70%)" }}
        />
        <div
          className="absolute top-[60%] right-[-10%] h-[500px] w-[500px] rounded-full opacity-15 blur-[140px]"
          style={{ background: "radial-gradient(circle, hsl(234 89% 50%), transparent 70%)" }}
        />
      </div>

      <div className="relative z-10 w-full px-3 py-4 sm:px-5 lg:px-8 overflow-x-hidden">

        {/* ═══ HEADER ═══ */}
        <motion.div {...fadeUp} className="mb-5">
          <div className="flex items-start justify-between">
            <div className="flex-1" />
            <div className="text-center flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-[hsl(var(--task-text))] tracking-tight">
                Acompanhamento de Tarefas
              </h1>
              <p className="mt-0.5 text-xs sm:text-sm text-[hsl(var(--task-text-muted))]">
                Acompanhe o progresso, prazos e desempenho das atividades em tempo real.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0 flex-1 justify-end">
              <div className="flex items-center gap-1.5 text-[10px] text-[hsl(var(--task-text-muted))]">
                <span className={`h-1.5 w-1.5 rounded-full ${refreshing ? "bg-[hsl(var(--task-yellow))] animate-pulse" : "bg-emerald-400"}`} />
                {formatLastUpdated(combinedLastUpdated)}
              </div>
              <button
                type="button"
                onClick={() => { reload(); reloadTimes(); }}
                disabled={refreshing}
                className="flex items-center gap-1.5 rounded-xl border border-[hsl(var(--task-border))] bg-[hsl(var(--task-surface))] px-3 py-2 text-xs font-medium text-[hsl(var(--task-text-muted))] transition hover:border-[hsl(var(--task-yellow)/0.4)] hover:text-[hsl(var(--task-yellow))] disabled:opacity-40 whitespace-nowrap"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                Atualizar
              </button>
            </div>
          </div>
        </motion.div>

        {/* ═══ FILTERS (moved here, below header) ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
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
            hasActiveFilters={hasActiveFilters}
            onClearFilters={resetFilters}
            myProjectNames={myProjectNames}
          />
        </motion.div>

        {/* ═══ KPI CARDS ═══ */}
        <motion.div variants={stagger} initial="initial" animate="animate" className="mb-5 grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-5">
          <KpiCard icon={Layers} label="Total de Tarefas" value={stats.total} color="purple" delay={0} />
          <KpiCard icon={Timer} label="Horas Alocadas" value={`${totalHoursLabel}h`} color="blue" delay={0.05} />
          <KpiCard icon={Hourglass} label="Em Andamento" value={stats.pending} color="yellow" delay={0.1} />
          <KpiCard icon={CheckCircle2} label="Concluídas" value={stats.done} color="green" delay={0.15} />
          <KpiCard icon={AlertTriangle} label="Atrasadas" value={stats.overdue} color="red" delay={0.2} />
        </motion.div>

        {/* ═══ MAIN DASHBOARD: Collapsible 3-column ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="mb-5"
        >
          <button
            type="button"
            onClick={() => setShowDashboard((v) => !v)}
            className="flex items-center gap-2 mb-3 text-sm font-semibold text-[hsl(var(--task-text))] hover:text-[hsl(var(--task-yellow))] transition"
          >
            <Layers className="h-4 w-4" />
            Painel de Desempenho
            <ChevronDown className={`h-4 w-4 transition-transform ${showDashboard ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence>
            {showDashboard && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
        <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-[1fr_260px_320px]">

          {/* LEFT: Focus — Top performers */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="task-card flex flex-col max-h-[60vh] xl:max-h-[calc(100vh-340px)] min-h-[260px] overflow-hidden md:col-span-1"
          >
            <div className="flex items-center justify-between mb-4 sticky top-0 z-10 bg-[hsl(var(--task-surface))] pb-2">
              <div>
                <h2 className="text-lg font-extrabold text-[hsl(var(--task-text))] tracking-tight">
                  Desempenho da Equipe
                </h2>
              </div>
            </div>

            {/* Top performers list */}
            <div className="space-y-2 flex-1 overflow-y-auto styled-scrollbar">
              {(() => {
                const performerMap = new Map<string, { total: number; done: number; overdue: number; pending: number; hours: number }>();
                filteredTasks.forEach((t) => {
                  const name = (t.consultant || "").trim() || "Sem responsável";
                  const cur = performerMap.get(name) ?? { total: 0, done: 0, overdue: 0, pending: 0, hours: 0 };
                  cur.total += 1;
                  if (t.statusKey === "done") cur.done += 1;
                  else if (t.statusKey === "overdue") cur.overdue += 1;
                  else cur.pending += 1;
                  cur.hours += (t.durationSeconds ?? 0) / 3600;
                  performerMap.set(name, cur);
                });
                const performers = [...performerMap.entries()]
                  .sort((a, b) => b[1].done - a[1].done || b[1].total - a[1].total)
                  .slice(0, 6);
                const maxTotal = Math.max(1, ...performers.map(([, d]) => d.total));

                if (!performers.length) {
                  return (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <Users className="h-8 w-8 text-[hsl(var(--task-text-muted)/0.15)] mb-2" />
                      <p className="text-xs text-[hsl(var(--task-text-muted))]">Sem dados</p>
                    </div>
                  );
                }

                return performers.map(([name, data], idx) => {
                  const pctBar = data.total > 0 ? (data.done / data.total) * 100 : 0;
                  const pctDoneLocal = data.total > 0 ? Math.round((data.done / data.total) * 100) : 0;
                  // Cor única: verde para progresso concluído
                  const color = "hsl(142 71% 45%)";
                  return (
                    <motion.div
                      key={name}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + idx * 0.06 }}
                      className="rounded-xl border border-[hsl(var(--task-border))] bg-[hsl(var(--task-bg))] p-3 hover:border-[hsl(var(--task-border-light))] transition"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold bg-[hsl(var(--task-purple)/0.15)] text-[hsl(var(--task-purple))]"
                        >
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-[hsl(var(--task-text))] truncate">{name}</p>
                          <div className="flex items-center gap-2.5 text-[11px] flex-wrap mt-0.5">
                            <span className="text-emerald-400 font-medium">{data.done} feitas</span>
                            {data.pending > 0 && <span className="text-[hsl(var(--task-yellow))] font-medium">{data.pending} em andamento</span>}
                            {data.overdue > 0 && <span className="text-rose-400/80 font-medium">{data.overdue} atrasadas</span>}
                          </div>
                        </div>
                        <span className="text-sm font-extrabold text-emerald-400">{pctDoneLocal}%</span>
                      </div>
                      {/* Progress bar with loading shimmer */}
                      <div className="h-2 rounded-full bg-[hsl(var(--task-border))] overflow-hidden relative">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pctBar}%` }}
                          transition={{ duration: 1.2, delay: 0.4 + idx * 0.12, ease: [0.22, 1, 0.36, 1] }}
                          className="h-full rounded-full relative overflow-hidden"
                          style={{ background: `linear-gradient(90deg, hsl(142 71% 45%), hsl(142 71% 55%))` }}
                        >
                          <div
                            className="absolute inset-0 animate-[task-shimmer_2s_ease-in-out_infinite]"
                            style={{
                              background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)`,
                              backgroundSize: "200% 100%",
                            }}
                          />
                        </motion.div>
                      </div>
                    </motion.div>
                  );
                });
              })()}
            </div>
          </motion.div>

          {/* CENTER: Performance Gauge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="task-card flex flex-col items-center justify-center md:col-span-1"
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
            className="task-card flex flex-col max-h-[60vh] xl:max-h-[calc(100vh-340px)] min-h-[260px] overflow-hidden md:col-span-2 xl:col-span-1"
          >
            <div className="flex items-center gap-2 mb-4 sticky top-0 z-10 bg-[hsl(var(--task-surface))] pb-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[hsl(var(--task-yellow)/0.15)]">
                <Clock className="h-3.5 w-3.5 text-[hsl(var(--task-yellow))]" />
              </div>
              <div>
                <p className="text-sm font-bold text-[hsl(var(--task-text))]">Prazos</p>
                <p className="text-[10px] text-[hsl(var(--task-text-muted))]">Próximas entregas pendentes</p>
              </div>
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto pr-1 custom-scrollbar">
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
                    className={`group relative rounded-xl border border-[hsl(var(--task-border))] bg-[hsl(var(--task-bg))] p-3 transition-all hover:border-[hsl(var(--task-yellow)/0.3)] hover:bg-[hsl(var(--task-surface-hover))] ${task.statusKey === "overdue" ? "task-deadline-shake" : ""}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className={`mt-1.5 shrink-0 h-2 w-2 rounded-full ${
                        task.statusKey === "overdue" ? "bg-rose-400 animate-pulse" : "bg-[hsl(var(--task-yellow))]"
                      }`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-[hsl(var(--task-text))] leading-snug group-hover:whitespace-normal truncate group-hover:truncate-none">{task.title}</p>
                        <p className="text-[10px] text-[hsl(var(--task-text-muted))] mt-0.5 truncate group-hover:whitespace-normal">{task.project}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[9px]">
                      <span className={`font-semibold ${task.statusKey === "overdue" ? "text-rose-400" : "text-[hsl(var(--task-text-muted))]"}`}>
                        {task.deadlineLabel || "Sem prazo"}
                      </span>
                      <span className="text-[hsl(var(--task-text-muted))]">{task.consultant}</span>
                    </div>
                    {/* Expanded on hover */}
                    <div className="hidden group-hover:block mt-2 pt-2 border-t border-[hsl(var(--task-border)/0.3)]">
                      <p className="text-[10px] text-[hsl(var(--task-text-muted))] leading-relaxed">
                        {task.description || "Sem descrição"}
                      </p>
                      {task.durationSeconds != null && task.durationSeconds > 0 && (
                        <p className="text-[9px] text-[hsl(var(--task-text-muted))] mt-1">
                          Tempo: <span className="font-bold text-[hsl(var(--task-text))]">{task.durationLabel}</span>
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {stats.overdue > 0 && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-400 task-shake" />
                <span className="text-[10px] font-bold text-rose-400">
                  {stats.overdue} tarefa{stats.overdue > 1 ? "s" : ""} atrasada{stats.overdue > 1 ? "s" : ""}
                </span>
              </div>
            )}
          </motion.div>
        </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

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


        {/* ═══ TASK LIST ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.45 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-[hsl(var(--task-text))]">
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
      className={`task-card group flex items-center gap-2.5 p-3 sm:p-4 transition-all ${c.glow}`}
    >
      <div className={`flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl ${c.icon}`}>
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.15em] text-[hsl(var(--task-text-muted))] truncate">{label}</p>
        <p className="text-lg sm:text-xl font-extrabold text-[hsl(var(--task-text))] leading-tight">{value}</p>
      </div>
    </motion.div>
  );
}
