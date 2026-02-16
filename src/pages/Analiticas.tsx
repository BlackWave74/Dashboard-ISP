import { useMemo, useState, useCallback, useEffect } from "react";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useTasks } from "@/modules/tasks/api/useTasks";
import { useElapsedTimes } from "@/modules/tasks/api/useElapsedTimes";
import { useProjectHours } from "@/modules/tasks/api/useProjectHours";
import { useAnalyticsData } from "@/modules/analytics/hooks/useAnalyticsData";
import { classifyTask } from "@/modules/analytics/hooks/useAnalyticsData";
import { RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import PageSkeleton from "@/components/ui/PageSkeleton";
import DataErrorCard from "@/components/ui/DataErrorCard";
import AnalyticsKpiCards from "@/modules/analytics/components/AnalyticsKpiCards";
import AnalyticsProductivityPulse from "@/modules/analytics/components/AnalyticsProductivityPulse";
import AnalyticsVelocityChart from "@/modules/analytics/components/AnalyticsVelocityChart";
import AnalyticsProjectList from "@/modules/analytics/components/AnalyticsProjectList";
import AnalyticsFilters from "@/modules/analytics/components/AnalyticsFilters";
import AnalyticsPendingTasks from "@/modules/analytics/components/AnalyticsPendingTasks";
import AnalyticsProjectDrawer from "@/modules/analytics/components/AnalyticsProjectDrawer";
import type { AnalyticsFilterState } from "@/modules/analytics/components/AnalyticsFilters";
import type { ProjectAnalytics } from "@/modules/analytics/types";

const PERIOD_DAYS: Record<AnalyticsFilterState["period"], number> = {
  "30d": 30,
  "90d": 90,
  "180d": 180,
  all: 365,
};

export default function AnaliticasPage() {
  const { session } = useAuth();
  const accessToken = session?.accessToken;
  const userName = session?.name;

  // Filters state
  const [filters, setFilters] = useState<AnalyticsFilterState>({
    period: "180d",
    status: "all",
    projectId: null,
    consultant: "",
  });

  const periodDays = PERIOD_DAYS[filters.period];

  const { tasks: allTasks, loading: loadingTasks, error: errorTasks, reload: reloadTasks, lastUpdated } = useTasks({ accessToken, period: filters.period === "all" ? "180d" : filters.period });
  const { times, loading: loadingTimes, reload: reloadTimes, lastUpdated: lastUpdatedTimes } = useElapsedTimes({ accessToken, period: filters.period === "all" ? "180d" : filters.period });

  const refreshing = loadingTasks || loadingTimes;
  const combinedLastUpdated =
    lastUpdated && lastUpdatedTimes
      ? Math.min(lastUpdated, lastUpdatedTimes)
      : lastUpdated ?? lastUpdatedTimes ?? null;

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

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => { reloadTasks(); reloadTimes(); }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [reloadTasks, reloadTimes]);

  const { startIso, endIso } = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - periodDays);
    return { startIso: start.toISOString(), endIso: end.toISOString() };
  }, [periodDays]);

  const { data: projectHours, loading: loadingHours } = useProjectHours({ startIso, endIso });

  const loading = loadingTasks || loadingTimes || loadingHours;
  // Note: 'refreshing' is computed above after hooks, 'loading' includes hours for initial load

  const isAdmin = session?.role === "admin" || session?.role === "gerente" || session?.role === "coordenador";
  const accessibleProjectIds = session?.accessibleProjectIds;

  // Filter tasks by project access for non-admin users
  const companyName = session?.company?.trim()?.toLowerCase();
  const accessFilteredTasks = useMemo(() => {
    if (isAdmin) return allTasks;
    // Explicit project access first
    if (accessibleProjectIds && accessibleProjectIds.length > 0) {
      const allowedIds = new Set(accessibleProjectIds);
      return allTasks.filter((t) => {
        const pid = Number(t.project_id);
        return pid && allowedIds.has(pid);
      });
    }
    // Fallback: filter by company name prefix
    if (companyName) {
      return allTasks.filter((t) => {
        const name = String(t.projects?.name ?? t.project_name ?? t.project ?? t.projeto ?? "").toLowerCase();
        return name.includes(companyName);
      });
    }
    return allTasks;
  }, [allTasks, isAdmin, accessibleProjectIds, companyName]);

  const effectiveUser = isAdmin
    ? (filters.consultant || undefined)
    : userName;

  const {
    projects,
    uniqueClients,
    totalDone,
    totalPending,
    totalOverdue,
    totalHours,
    toggleFavorite,
    userTaskCount,
    userTimes,
    userTasks,
  } = useAnalyticsData(accessFilteredTasks, projectHours, times, effectiveUser);

  // Extract unique consultant names for admin filter
  const consultants = useMemo(() => {
    if (!isAdmin) return [];
    const set = new Set<string>();
    allTasks.forEach((t) => {
      const name = String(t.responsible_name ?? t.responsavel ?? t.consultant ?? "").trim();
      if (name) set.add(name);
    });
    return [...set].sort();
  }, [allTasks, isAdmin]);

  // Extract unique project options for the filter dropdown
  const projectOptions = useMemo(() => {
    const map = new Map<number, string>();
    const source = isAdmin ? allTasks : userTasks;
    source.forEach((t) => {
      const pid = Number(t.project_id);
      if (!pid) return;
      const name = String(t.projects?.name ?? t.project_name ?? t.project ?? t.projeto ?? `Projeto ${pid}`);
      if (!map.has(pid)) map.set(pid, name);
    });
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allTasks, userTasks, isAdmin]);

  // Apply status + project filter to user's tasks for display components
  const filteredTasks = useMemo(() => {
    let result = userTasks;
    if (filters.projectId !== null) {
      result = result.filter((t) => Number(t.project_id) === filters.projectId);
    }
    if (filters.status !== "all") {
      result = result.filter((t) => classifyTask(t) === filters.status);
    }
    return result;
  }, [userTasks, filters.status, filters.projectId]);

  // Period-aware hours
  const periodHours = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - periodDays);
    const cutoffMs = cutoff.getTime();

    let totalSecs = 0;
    userTimes.forEach((t) => {
      const ts = t.inserted_at ?? t.updated_at;
      if (ts) {
        const d = new Date(String(ts)).getTime();
        if (!Number.isNaN(d) && d >= cutoffMs) {
          totalSecs += (t.seconds ?? 0);
        }
      } else {
        totalSecs += (t.seconds ?? 0);
      }
    });
    return Math.round((totalSecs / 3600) * 10) / 10;
  }, [userTimes, periodDays]);

  const activeProjects = useMemo(() => projects.filter((p) => p.isActive).length, [projects]);

  // Compute which projects the current user participates in
  const myProjectIds = useMemo(() => {
    if (!userName) return new Set<number>();
    const ids = new Set<number>();
    allTasks.forEach((t) => {
      const responsible = String(t.responsible_name ?? t.responsavel ?? t.consultant ?? t.owner ?? "");
      const a = responsible.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      const b = userName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      if (a && b && (a.includes(b) || b.includes(a))) {
        const pid = Number(t.project_id);
        if (pid) ids.add(pid);
      }
    });
    return ids;
  }, [allTasks, userName]);

  const [selectedProject, setSelectedProject] = useState<ProjectAnalytics | null>(null);
  const [drawerProject, setDrawerProject] = useState<ProjectAnalytics | null>(null);

  const handleProjectClick = useCallback((project: ProjectAnalytics) => {
    setDrawerProject(project);
  }, []);

  if (loading && allTasks.length === 0) {
    return <PageSkeleton variant="analiticas" />;
  }

  if (errorTasks) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-8">
        <DataErrorCard
          message={errorTasks}
          onRetry={() => { reloadTasks(); reloadTimes(); }}
        />
      </div>
    );
  }

  return (
    <div className="page-gradient w-full">
      <div className="mx-auto w-full max-w-[1900px] space-y-5 p-5 md:p-8">
        {/* Header with Atualizar button top-right */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-start justify-between"
        >
          <div className="flex-1" />
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-2xl font-bold text-foreground">Analíticas</h1>
            <p className="text-sm text-white/35">
              {effectiveUser ? `Projetos de ${effectiveUser}` : "Visão geral de desempenho dos projetos."}
              {filters.period !== "180d" && ` · Últimos ${periodDays} dias`}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0 flex-1 justify-end">
            <div className="flex items-center gap-1.5 text-[10px] text-white/35">
              <span className={`h-1.5 w-1.5 rounded-full ${refreshing ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
              {formatLastUpdated(combinedLastUpdated)}
            </div>
            <button
              type="button"
              onClick={() => { reloadTasks(); reloadTimes(); }}
              disabled={refreshing}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-xs font-medium text-white/50 transition hover:border-white/[0.12] hover:text-white/70 disabled:opacity-40"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Atualizar
            </button>
          </div>
        </motion.div>

        {/* Search + Filters (same layout as Tarefas) */}
        <AnalyticsFilters
          filters={filters}
          onChange={setFilters}
          projects={projectOptions}
          consultants={consultants}
          isAdmin={isAdmin}
          myProjectIds={myProjectIds}
          hideFilters={false}
        />

        {/* KPI Cards */}
        <AnalyticsKpiCards
          clients={myProjectIds.size > 0 ? myProjectIds.size : projects.length}
          activeProjects={activeProjects}
          totalHours={periodHours > 0 ? periodHours : totalHours}
          totalTasks={userTaskCount}
          doneCount={totalDone}
          overdueCount={totalOverdue}
        />

        {/* Row 1: Client Radar + Velocity Chart */}
        <div className="grid gap-5 lg:grid-cols-2">
          <AnalyticsProductivityPulse tasks={userTasks} classifyTask={classifyTask} />
          <AnalyticsVelocityChart tasks={userTasks} classifyTask={classifyTask} />
        </div>

        {/* Pending tasks list */}
        <AnalyticsPendingTasks
          tasks={filteredTasks}
          classifyTask={classifyTask}
        />

        {/* Projects list */}
        <AnalyticsProjectList
          projects={projects}
          onToggleFavorite={toggleFavorite}
          onProjectClick={handleProjectClick}
          selectedProject={selectedProject}
          myProjectIds={myProjectIds}
        />
      </div>

      {/* Project drill-down drawer — scoped to accessible tasks only */}
      <AnalyticsProjectDrawer
        project={drawerProject}
        tasks={accessFilteredTasks}
        classifyTask={classifyTask}
        onClose={() => setDrawerProject(null)}
      />
    </div>
  );
}
