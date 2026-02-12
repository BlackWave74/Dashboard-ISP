import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { TaskCharts, ProjectPerformanceGauge } from "@/modules/tasks/ui/TaskCharts";
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

function StatCard({
  label,
  value,
  accent,
  onClick,
}: {
  label: string;
  value: number | string;
  accent?: "emerald" | "rose" | "indigo" | "amber";
  onClick?: () => void;
}) {
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
      className="relative overflow-hidden rounded-2xl border border-border bg-card px-4 py-4 text-left transition hover:border-primary/60 hover:shadow-lg"
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accentClasses}`} aria-hidden />
      <div className="relative">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      </div>
    </button>
  );
}

function InfoCard({ title, value, subtitle }: { title: string; value: number | string; subtitle?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-4 shadow-md">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
    </div>
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
    <div className="min-h-screen px-4 py-8 sm:px-8 sm:py-10">
      <section className="mx-auto flex w-full max-w-[1900px] flex-col gap-6 rounded-2xl border border-border bg-card/70 p-5 shadow-xl sm:p-8">
        {/* Header */}
        <div className="flex w-full flex-col items-center gap-2 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <h1 className="text-2xl font-semibold text-foreground">Central de Tarefas</h1>
          <div className="flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
            {refreshing ? (
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
            )}
            <span>{formatLastUpdated(combinedLastUpdated)}</span>
          </div>
        </div>

        {/* Filters */}
        <div ref={filtersBoxRef} className="space-y-3">
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
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1 text-xs text-muted-foreground">
            <button
              type="button"
              onClick={() => {
                reload();
                reloadTimes();
              }}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary"
            >
              {refreshing ? "Atualizando..." : "Recarregar dados"}
            </button>
            <button
              type="button"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
              className="rounded-lg border border-destructive/60 bg-destructive/10 px-4 py-2 text-sm font-semibold text-destructive-foreground transition hover:border-destructive hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              Limpar filtros
            </button>
          </div>
        </div>

        {/* Performance Gauge */}
        <div className="rounded-2xl border border-border bg-card/50 p-4 shadow-md">
          <div>
            <p className="text-sm font-semibold text-foreground">Desempenho do projeto</p>
            <p className="text-xs text-muted-foreground">Percentual que falta para concluir</p>
          </div>
          <div className="mt-3">
            <ProjectPerformanceGauge tasks={filteredTasks ?? tasks ?? []} />
          </div>
        </div>

        {/* Charts carousel */}
        <div className="space-y-2">
          <div className="rounded-2xl border border-border bg-card/45 p-4 shadow-lg">
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
        </div>

        {/* Stat cards */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Total" value={stats.total} onClick={() => { setStatus("all"); setDeadline("all"); }} />
          <StatCard label="Concluídas" value={stats.done} accent="emerald" onClick={() => { setStatus("done"); setDeadline("all"); }} />
          <StatCard label="Em andamento" value={stats.pending} accent="amber" onClick={() => { setStatus("pending"); setDeadline("all"); }} />
          <StatCard label="Atrasadas" value={stats.overdue} accent="rose" onClick={() => { setStatus("all"); setDeadline("overdue"); }} />
          <StatCard label="Média de tempo" value={stats.avgSeconds ? formatDurationHHMM(stats.avgSeconds) : "Sem dados"} accent="indigo" />
          <StatCard label="Tempo total" value={stats.totalSeconds ? formatDurationHHMM(stats.totalSeconds) : "Sem dados"} accent="indigo" />
        </div>

        {/* Hours summary */}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <InfoCard title="Horas consumidas (mês)" value={formatHoursLabel(hoursSummary.month)} subtitle="Durações registradas nas tarefas." />
          <InfoCard title="Horas consumidas (trimestre)" value={formatHoursLabel(hoursSummary.quarter)} subtitle="Período do trimestre corrente." />
          <InfoCard title="Horas consumidas (total)" value={formatHoursLabel(hoursSummary.total)} subtitle="Somatório geral no recorte atual." />
        </div>

        {/* Projects & pending info */}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <InfoCard title="Projetos ativos" value={projectsOverview.activeCount} subtitle="Projetos com tarefas pendentes ou atrasadas" />
          <InfoCard title="Tarefas pendentes" value={projectsOverview.pendingTotal} subtitle="Inclui atrasadas e sem status" />
          <InfoCard title="Total filtrado" value={filteredTasks.length} subtitle="Tarefas no recorte atual" />
        </div>

        {/* Collapsible sections */}
        <div className="space-y-4">
          {/* Projects panel */}
          <div className="rounded-2xl border border-border bg-card/45 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-primary">Projetos e horas</p>
                <p className="text-sm text-muted-foreground">Horas consumidas e status por projeto.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowProjectsPanel((v) => !v)}
                className="rounded-full border border-border px-3 py-1 text-xs text-foreground transition hover:border-primary hover:text-primary"
              >
                {showProjectsPanel ? "Recolher" : "Expandir"} ({projectsOverview.groups.length})
              </button>
            </div>
            {showProjectsPanel && (
              <div className="mt-4 space-y-3">
                {projectsOverview.groups.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-muted px-4 py-6 text-center text-muted-foreground">
                    Nenhum projeto no recorte atual.
                  </div>
                ) : (
                  projectsOverview.groups.slice(0, 20).map((group) => (
                    <button
                      key={group.name}
                      type="button"
                      onClick={() => handleProjectSelect(group.name)}
                      className="w-full rounded-2xl border border-border bg-card px-4 py-4 text-left transition hover:border-primary/60 hover:shadow-lg"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{group.name}</p>
                          <p className="text-xs text-muted-foreground">Horas: {formatHoursLabel(group.duration)}</p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <p>Pendentes/atr: {group.pending + group.overdue}</p>
                          <p>Concluídas: {group.done}</p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Pending panel */}
          <div className="rounded-2xl border border-border bg-card/45 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-primary">Tarefas pendentes</p>
                <p className="text-sm text-muted-foreground">Top pendências por prazo ou criação.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPendingPanel((v) => !v)}
                className="rounded-full border border-border px-3 py-1 text-xs text-foreground transition hover:border-primary hover:text-primary"
              >
                {showPendingPanel ? "Recolher" : "Expandir"} ({pendingHighlights.length})
              </button>
            </div>
            {showPendingPanel && (
              <div className="mt-4 space-y-3">
                {pendingHighlights.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-muted px-4 py-6 text-center text-muted-foreground">
                    Nenhuma pendência no recorte atual.
                  </div>
                ) : (
                  pendingHighlights.map((task, index) => (
                    <div
                      key={`${task.title}-${index}`}
                      className="rounded-xl border border-border bg-card px-4 py-4 shadow-md"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">{task.title}</p>
                        <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                          {STATUS_LABELS[task.statusKey]?.label ?? "Sem status"}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="rounded-full border border-border px-3 py-1">{task.deadlineLabel || "Sem prazo"}</span>
                        <span className="rounded-full border border-border px-3 py-1">{task.project || "Sem projeto"}</span>
                        <span className="rounded-full border border-border px-3 py-1">{task.consultant || "Sem consultor"}</span>
                        <span className="rounded-full border border-border px-3 py-1">{formatDurationHHMM(task.durationSeconds)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Task list table */}
        <div className="mt-6">
          {(error || timesError) && (
            <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive-foreground">
              {String(error || timesError)}
            </div>
          )}

          {loading || loadingTimes ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl border border-border bg-muted" />
              ))}
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted px-6 py-8 text-center text-muted-foreground">
              Nenhuma tarefa encontrada para os filtros atuais.
            </div>
          ) : (
            <>
              <TaskListTable tasks={paginatedTasks} />

              {filteredTasks.length > pageSize && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                  <span>
                    Mostrando {Math.min((page - 1) * pageSize + 1, filteredTasks.length)}-
                    {Math.min(page * pageSize, filteredTasks.length)} de {filteredTasks.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="rounded-lg border border-border px-3 py-1 transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <span className="px-2">Página {page} / {totalPages}</span>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="rounded-lg border border-border px-3 py-1 transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
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
  );
}
