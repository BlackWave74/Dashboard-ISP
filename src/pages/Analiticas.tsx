import { useMemo } from "react";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useTasks } from "@/modules/tasks/api/useTasks";
import { useElapsedTimes } from "@/modules/tasks/api/useElapsedTimes";
import { useProjectHours } from "@/modules/tasks/api/useProjectHours";
import { useAnalyticsData } from "@/modules/analytics/hooks/useAnalyticsData";
import { Loader2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import AnalyticsKpiCards from "@/modules/analytics/components/AnalyticsKpiCards";
import AnalyticsPerformanceChart from "@/modules/analytics/components/AnalyticsPerformanceChart";
import AnalyticsTaskSummary from "@/modules/analytics/components/AnalyticsTaskSummary";
import AnalyticsProjectList from "@/modules/analytics/components/AnalyticsProjectList";

export default function AnaliticasPage() {
  const { session } = useAuth();
  const accessToken = session?.accessToken;
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
  } = useAnalyticsData(tasks, projectHours);

  const activeProjects = useMemo(() => projects.filter((p) => p.isActive).length, [projects]);

  if (loading && tasks.length === 0) {
    return (
      <div className="ana-page flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--ana-purple))]" />
        <span className="ml-3 text-sm text-[hsl(var(--ana-text-muted))]">Carregando análises...</span>
      </div>
    );
  }

  if (errorTasks) {
    return (
      <div className="ana-page flex items-center justify-center p-12">
        <div className="flex items-center gap-3 rounded-2xl bg-[hsl(var(--ana-red)/0.08)] border border-[hsl(var(--ana-red)/0.2)] p-6">
          <AlertCircle className="h-5 w-5 text-[hsl(var(--ana-red))]" />
          <p className="text-sm text-[hsl(var(--ana-red))]">{errorTasks}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ana-page w-full">
      <div className="mx-auto w-full max-w-[1900px] space-y-6 p-5 md:p-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-2xl font-bold text-[hsl(var(--ana-text))]">Analíticas</h1>
          <p className="mt-1 text-sm text-[hsl(var(--ana-text-muted))]">
            Visão geral de clientes, projetos, horas e desempenho.
          </p>
        </motion.div>

        {/* KPI Cards */}
        <AnalyticsKpiCards
          clients={uniqueClients}
          activeProjects={activeProjects}
          totalHours={totalHours}
          totalTasks={tasks.length}
        />

        {/* Charts row */}
        <div className="grid gap-5 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <AnalyticsPerformanceChart times={times} />
          </div>
          <div className="lg:col-span-2">
            <AnalyticsTaskSummary done={totalDone} pending={totalPending} overdue={totalOverdue} />
          </div>
        </div>

        {/* Project list */}
        <AnalyticsProjectList projects={projects} onToggleFavorite={toggleFavorite} />
      </div>
    </div>
  );
}
