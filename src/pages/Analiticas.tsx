import { useMemo } from "react";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useTasks } from "@/modules/tasks/api/useTasks";
import { useElapsedTimes } from "@/modules/tasks/api/useElapsedTimes";
import { useProjectHours } from "@/modules/tasks/api/useProjectHours";
import type { TaskRecord } from "@/modules/tasks/types";
import { Loader2, AlertCircle, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

function classifyTask(task: TaskRecord): "done" | "overdue" | "pending" {
  const status = String(task.status ?? task.situacao ?? "").toLowerCase();
  if (["5", "done", "concluida", "concluído", "finalizada", "completed"].some((s) => status.includes(s)))
    return "done";
  const deadline = task.deadline ?? task.due_date ?? task.dueDate;
  if (deadline) {
    const d = new Date(String(deadline));
    if (!Number.isNaN(d.getTime()) && d < new Date()) return "overdue";
  }
  return "pending";
}

const statusConfig = {
  done: { label: "Concluídas", icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-400/10" },
  overdue: { label: "Atrasadas", icon: AlertTriangle, color: "text-rose-400", bg: "bg-rose-400/10" },
  pending: { label: "Em andamento", icon: Clock, color: "text-amber-400", bg: "bg-amber-400/10" },
};

const tooltipStyle = {
  background: "hsl(222 40% 8%)",
  border: "none",
  borderRadius: 10,
  fontSize: 12,
  color: "hsl(210 40% 96%)",
  boxShadow: "0 8px 30px -8px rgba(0,0,0,0.5)",
};

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

  const monthlyData = useMemo(() => {
    const months: Record<string, number> = {};
    times.forEach((t) => {
      const d = t.inserted_at ? new Date(String(t.inserted_at)) : null;
      if (!d || Number.isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months[key] = (months[key] ?? 0) + (t.seconds ?? 0) / 3600;
    });
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, hours]) => {
        const m = Number(key.split("-")[1]);
        return { month: monthNames[m - 1] ?? String(m), hours: Math.round(hours * 10) / 10 };
      });
  }, [times]);

  const statusData = useMemo(() => {
    const counts = { done: 0, overdue: 0, pending: 0 };
    tasks.forEach((t) => counts[classifyTask(t)]++);
    return [
      { name: "Concluídas", value: counts.done, color: "hsl(160 84% 39%)" },
      { name: "Atrasadas", value: counts.overdue, color: "hsl(0 84% 60%)" },
      { name: "Em andamento", value: counts.pending, color: "hsl(38 92% 50%)" },
    ].filter((d) => d.value > 0);
  }, [tasks]);

  const projectData = useMemo(() => {
    return projectHours
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 8)
      .map((p) => ({ name: p.projectName?.slice(0, 20) || "—", hours: Math.round(p.hours * 10) / 10 }));
  }, [projectHours]);

  const totalHours = useMemo(() => times.reduce((s, t) => s + (t.seconds ?? 0), 0) / 3600, [times]);
  const doneCount = useMemo(() => tasks.filter((t) => classifyTask(t) === "done").length, [tasks]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-3 text-sm text-muted-foreground">Carregando análises...</span>
      </div>
    );
  }

  if (errorTasks) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-destructive/5 p-6 m-8">
        <AlertCircle className="h-5 w-5 text-destructive" />
        <p className="text-sm text-destructive">{errorTasks}</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] w-full">
      <div className="mx-auto w-full max-w-[1900px] space-y-6 p-5 md:p-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analíticas</h1>
          <p className="mt-1 text-sm text-muted-foreground">Visão geral de horas, tarefas e desempenho por projeto.</p>
        </div>

        {/* Summary cards */}
        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryCard label="Total de Tarefas" value={tasks.length.toLocaleString("pt-BR")} />
          <SummaryCard label="Horas Registradas" value={`${Math.round(totalHours).toLocaleString("pt-BR")}h`} />
          <SummaryCard label="Taxa de Conclusão" value={`${tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0}%`} />
        </div>

        {/* Charts */}
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Monthly hours */}
          <div className="rounded-2xl bg-card/40 p-5">
            <h3 className="mb-4 text-sm font-semibold text-foreground">Horas por Mês</h3>
            {monthlyData.length > 0 ? (
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradH" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(234 89% 64%)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(234 89% 64%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 25% 14%)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: "hsl(215 20% 60%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "hsl(215 20% 60%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}h`, "Horas"]} />
                    <Area type="monotone" dataKey="hours" stroke="hsl(234 89% 64%)" strokeWidth={2} fill="url(#gradH)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">Sem dados disponíveis.</p>
            )}
          </div>

          {/* Status pie */}
          <div className="rounded-2xl bg-card/40 p-5">
            <h3 className="mb-4 text-sm font-semibold text-foreground">Distribuição de Status</h3>
            {statusData.length > 0 ? (
              <div className="flex items-center gap-6">
                <div className="h-[200px] w-[200px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value" stroke="none">
                        {statusData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  {statusData.map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-xs text-muted-foreground">{d.name}</span>
                      <span className="ml-auto text-xs font-semibold text-foreground">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">Sem dados disponíveis.</p>
            )}
          </div>
        </div>

        {/* Project hours bar */}
        {projectData.length > 0 && (
          <div className="rounded-2xl bg-card/40 p-5">
            <h3 className="mb-4 text-sm font-semibold text-foreground">Horas por Projeto</h3>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 25% 14%)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "hsl(215 20% 60%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fill: "hsl(215 20% 60%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}h`, "Horas"]} />
                  <Bar dataKey="hours" radius={[0, 6, 6, 0]} fill="hsl(234 89% 64%)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card/40 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}
