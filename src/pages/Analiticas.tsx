import { useMemo, useState } from "react";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useTasks } from "@/modules/tasks/api/useTasks";
import { useElapsedTimes } from "@/modules/tasks/api/useElapsedTimes";
import { useProjectHours } from "@/modules/tasks/api/useProjectHours";
import { useAnalyticsData } from "@/modules/analytics/hooks/useAnalyticsData";
import { Loader2, AlertCircle, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import AnalyticsKpiCards from "@/modules/analytics/components/AnalyticsKpiCards";
import AnalyticsPerformanceChart from "@/modules/analytics/components/AnalyticsPerformanceChart";
import AnalyticsTaskSummary from "@/modules/analytics/components/AnalyticsTaskSummary";
import AnalyticsProjectList from "@/modules/analytics/components/AnalyticsProjectList";
import AnalyticsSearch from "@/modules/analytics/components/AnalyticsSearch";
import type { ProjectAnalytics } from "@/modules/analytics/types";

export default function AnaliticasPage() {
  const { session } = useAuth();
  const accessToken = session?.accessToken;
  const userName = session?.name;
  const now = new Date();

  const { tasks, loading: loadingTasks, error: errorTasks } = useTasks({ accessToken, period: "all" });
  const { times, loading: loadingTimes } = useElapsedTimes({ accessToken, period: "all" });

  const startIso = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d.toISOString();
  }, []);

  const { data: projectHours, loading: loadingHours } = useProjectHours({
    startIso,
    endIso: now.toISOString(),
  });

  const loading = loadingTasks || loadingTimes || loadingHours;

  const {
    projects,
    uniqueClients,
    totalDone,
    totalPending,
    totalOverdue,
    totalHours,
    toggleFavorite,
    userTaskCount,
  } = useAnalyticsData(tasks, projectHours, userName);

  const activeProjects = useMemo(() => projects.filter((p) => p.isActive).length, [projects]);

  const [selectedProject, setSelectedProject] = useState<ProjectAnalytics | null>(null);

  if (loading && tasks.length === 0) {
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
      <div className="mx-auto w-full max-w-[1900px] space-y-6 p-5 md:p-8">
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
                {userName ? `Projetos de ${userName}` : "Visão geral de clientes, projetos, horas e desempenho."}
              </p>
            </div>
          </div>
          <AnalyticsSearch
            projects={projects}
            onSelect={setSelectedProject}
            selected={selectedProject}
          />
        </motion.div>

        {/* KPI Cards */}
        <AnalyticsKpiCards
          clients={uniqueClients}
          activeProjects={activeProjects}
          totalHours={totalHours}
          totalTasks={userTaskCount}
          doneCount={totalDone}
          overdueCount={totalOverdue}
        />

        {/* Charts */}
        <div className="grid gap-5 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <AnalyticsPerformanceChart times={times} />
          </div>
          <div className="lg:col-span-2">
            <AnalyticsTaskSummary done={totalDone} pending={totalPending} overdue={totalOverdue} />
          </div>
        </div>

        {/* Projects */}
        <AnalyticsProjectList
          projects={projects}
          onToggleFavorite={toggleFavorite}
          selectedProject={selectedProject}
        />
      </div>
    </div>
  );
}
