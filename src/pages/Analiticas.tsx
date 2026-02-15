import { useMemo, useState, useCallback } from "react";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useTasks } from "@/modules/tasks/api/useTasks";
import { useElapsedTimes } from "@/modules/tasks/api/useElapsedTimes";
import { useProjectHours } from "@/modules/tasks/api/useProjectHours";
import { useAnalyticsData } from "@/modules/analytics/hooks/useAnalyticsData";
import { classifyTask } from "@/modules/analytics/hooks/useAnalyticsData";
import { Loader2, AlertCircle, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import AnalyticsKpiCards from "@/modules/analytics/components/AnalyticsKpiCards";
import AnalyticsActivityHeatmap from "@/modules/analytics/components/AnalyticsActivityHeatmap";
import AnalyticsProductivityPulse from "@/modules/analytics/components/AnalyticsProductivityPulse";
import AnalyticsVelocityChart from "@/modules/analytics/components/AnalyticsVelocityChart";
import AnalyticsProjectList from "@/modules/analytics/components/AnalyticsProjectList";
import AnalyticsSearch from "@/modules/analytics/components/AnalyticsSearch";
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
  });

  const periodDays = PERIOD_DAYS[filters.period];

  const { tasks: allTasks, loading: loadingTasks, error: errorTasks } = useTasks({ accessToken, period: filters.period === "all" ? "180d" : filters.period });
  const { times, loading: loadingTimes } = useElapsedTimes({ accessToken, period: filters.period === "all" ? "180d" : filters.period });

  const { startIso, endIso } = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - periodDays);
    return { startIso: start.toISOString(), endIso: end.toISOString() };
  }, [periodDays]);

  const { data: projectHours, loading: loadingHours } = useProjectHours({ startIso, endIso });

  const loading = loadingTasks || loadingTimes || loadingHours;

  // Admin sees all tasks; consultor sees only their own
  const isAdmin = session?.role === "admin" || session?.role === "gerente" || session?.role === "coordenador";
  const effectiveUser = isAdmin ? undefined : userName;

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
  } = useAnalyticsData(allTasks, projectHours, times, effectiveUser);

  // Extract unique project options for the filter dropdown
  const projectOptions = useMemo(() => {
    const map = new Map<number, string>();
    (isAdmin ? allTasks : userTasks).forEach((t) => {
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

  // Period-aware hours: compute hours within selected period from elapsed times
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

  const [selectedProject, setSelectedProject] = useState<ProjectAnalytics | null>(null);
  const [drawerProject, setDrawerProject] = useState<ProjectAnalytics | null>(null);

  const handleProjectClick = useCallback((project: ProjectAnalytics) => {
    setDrawerProject(project);
  }, []);

  if (loading && allTasks.length === 0) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-3 text-sm text-muted-foreground">Carregando análises...</span>
      </div>
    );
  }

  if (errorTasks) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-8">
        <div className="flex items-center gap-3 rounded-2xl bg-destructive/10 p-6">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <p className="text-sm text-destructive">{errorTasks}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] w-full" style={{ background: "linear-gradient(165deg, hsl(270 60% 10%), hsl(234 45% 6%))" }}>
      <div className="mx-auto w-full max-w-[1900px] space-y-5 p-5 md:p-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-wrap items-end justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(262_83%_58%)] to-[hsl(234_89%_64%)] shadow-lg shadow-[hsl(262_83%_58%/0.25)]">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Analíticas</h1>
              <p className="text-sm text-white/35">
                {effectiveUser ? `Projetos de ${effectiveUser}` : "Visão geral de desempenho dos projetos."}
                {filters.period !== "180d" && ` · Últimos ${periodDays} dias`}
              </p>
            </div>
          </div>
          <AnalyticsSearch
            projects={projects}
            onSelect={setSelectedProject}
            selected={selectedProject}
          />
        </motion.div>

        {/* Filters */}
        <AnalyticsFilters
          filters={filters}
          onChange={setFilters}
          projects={projectOptions}
        />

        {/* KPI Cards */}
        <AnalyticsKpiCards
          clients={uniqueClients}
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
        />
      </div>

      {/* Project drill-down drawer */}
      <AnalyticsProjectDrawer
        project={drawerProject}
        tasks={allTasks}
        classifyTask={classifyTask}
        onClose={() => setDrawerProject(null)}
      />
    </div>
  );
}
