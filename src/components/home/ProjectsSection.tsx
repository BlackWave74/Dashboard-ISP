import { useState, useMemo } from "react";
import EmptyState from "@/components/ui/EmptyState";
import { ListTodo, BarChart3, Loader2, AlertCircle, Clock, CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";
import { useTasks } from "@/modules/tasks/api/useTasks";
import { useElapsedTimes } from "@/modules/tasks/api/useElapsedTimes";
import { useProjectHours } from "@/modules/tasks/api/useProjectHours";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import type { TaskRecord } from "@/modules/tasks/types";
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

type Tab = "tarefas" | "analises";

/* ─── Task status helpers ─── */
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

/* ─── Component ─── */
export default function ProjectsSection() {
  const [tab, setTab] = useState<Tab>("tarefas");
  const { session } = useAuth();
  const accessToken = session?.accessToken;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

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

  return (
    <div className="space-y-4">
      {/* Tab header */}
      <div className="flex items-center gap-1 rounded-xl bg-muted/30 p-1 w-fit">
        <TabButton active={tab === "tarefas"} onClick={() => setTab("tarefas")} icon={ListTodo} label="Tarefas" />
        <TabButton active={tab === "analises"} onClick={() => setTab("analises")} icon={BarChart3} label="Análises" />
      </div>

      {tab === "tarefas" ? (
        <TasksTab tasks={tasks} loading={loadingTasks} error={errorTasks} />
      ) : (
        <AnalyticsTab tasks={tasks} times={times} projectHours={projectHours} loading={loadingTasks || loadingTimes || loadingHours} />
      )}
    </div>
  );
}

/* ─── Tab Button ─── */
function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
        active
          ? "bg-primary/15 text-primary shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

/* ─── Tasks Tab ─── */
function TasksTab({ tasks, loading, error }: { tasks: TaskRecord[]; loading: boolean; error: string | null }) {
  const classified = useMemo(() => {
    const counts = { done: 0, overdue: 0, pending: 0 };
    tasks.forEach((t) => counts[classifyTask(t)]++);
    return counts;
  }, [tasks]);

  const recentTasks = useMemo(
    () =>
      [...tasks]
        .sort((a, b) => {
          const da = new Date(String(a.inserted_at ?? a.created_at ?? a.createdAt ?? 0)).getTime();
          const db = new Date(String(b.inserted_at ?? b.created_at ?? b.createdAt ?? 0)).getTime();
          return db - da;
        })
        .slice(0, 8),
    [tasks]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl bg-card/50 p-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-3 text-sm text-muted-foreground">Carregando tarefas...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-destructive/5 p-6">
        <AlertCircle className="h-5 w-5 text-destructive" />
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status summary cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        {(["done", "overdue", "pending"] as const).map((key) => {
          const cfg = statusConfig[key];
          const Icon = cfg.icon;
          return (
            <div key={key} className={`flex items-center gap-3 rounded-xl ${cfg.bg} p-4`}>
              <Icon className={`h-5 w-5 ${cfg.color}`} />
              <div>
                <p className="text-xl font-bold text-foreground">{classified[key].toLocaleString("pt-BR")}</p>
                <p className="text-xs text-muted-foreground">{cfg.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent tasks list */}
      <div className="rounded-2xl bg-card/40 p-5">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Tarefas Recentes</h3>
        {recentTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma tarefa encontrada.</p>
        ) : (
          <div className="space-y-2">
            {recentTasks.map((task, i) => {
              const st = classifyTask(task);
              const cfg = statusConfig[st];
              const title = task.title || task.nome || task.name || "Sem título";
              const project = task.projects?.name || task.project || task.project_name || "";
              return (
                <div key={task.task_id ?? task.id ?? i} className="flex items-center gap-3 rounded-lg bg-muted/20 px-4 py-3">
                  <cfg.icon className={`h-4 w-4 shrink-0 ${cfg.color}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{title}</p>
                    {project && <p className="truncate text-xs text-muted-foreground">{project}</p>}
                  </div>
                  <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Analytics Tab ─── */
function AnalyticsTab({
  tasks,
  times,
  projectHours,
  loading,
}: {
  tasks: TaskRecord[];
  times: { seconds?: number; task_id?: string | number; inserted_at?: string | Date | null }[];
  projectHours: { projectName: string; hours: number }[];
  loading: boolean;
}) {
  /* Monthly hours chart data */
  const monthlyData = useMemo(() => {
    const months: Record<string, number> = {};
    times.forEach((t) => {
      const d = t.inserted_at ? new Date(String(t.inserted_at)) : null;
      if (!d || Number.isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const hours = (t.seconds ?? 0) / 3600;
      months[key] = (months[key] ?? 0) + hours;
    });
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, hours]) => {
        const [y, m] = key.split("-");
        const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        return { month: monthNames[Number(m) - 1] ?? m, hours: Math.round(hours * 10) / 10 };
      });
  }, [times]);

  /* Status distribution for pie */
  const statusData = useMemo(() => {
    const counts = { done: 0, overdue: 0, pending: 0 };
    tasks.forEach((t) => counts[classifyTask(t)]++);
    return [
      { name: "Concluídas", value: counts.done, color: "hsl(160 84% 39%)" },
      { name: "Atrasadas", value: counts.overdue, color: "hsl(0 84% 60%)" },
      { name: "Em andamento", value: counts.pending, color: "hsl(38 92% 50%)" },
    ].filter((d) => d.value > 0);
  }, [tasks]);

  /* Hours by project bar chart */
  const projectData = useMemo(() => {
    return projectHours
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 8)
      .map((p) => ({ name: p.projectName?.slice(0, 20) || "—", hours: Math.round(p.hours * 10) / 10 }));
  }, [projectHours]);

  const totalHours = useMemo(() => times.reduce((s, t) => s + (t.seconds ?? 0), 0) / 3600, [times]);

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl bg-card/50 p-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-3 text-sm text-muted-foreground">Carregando análises...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Total de Tarefas" value={tasks.length.toLocaleString("pt-BR")} />
        <SummaryCard label="Horas Registradas" value={`${Math.round(totalHours).toLocaleString("pt-BR")}h`} />
        <SummaryCard
          label="Taxa de Conclusão"
          value={`${tasks.length ? Math.round((tasks.filter((t) => classifyTask(t) === "done").length / tasks.length) * 100) : 0}%`}
        />
      </div>

      {/* Charts grid */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Monthly Hours */}
        <div className="rounded-2xl bg-card/40 p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Horas por Mês</h3>
          {monthlyData.length > 0 ? (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradHours" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(234 89% 64%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(234 89% 64%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 25% 14%)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: "hsl(215 20% 60%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "hsl(215 20% 60%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(222 40% 8%)",
                      border: "none",
                      borderRadius: 10,
                      fontSize: 12,
                      color: "hsl(210 40% 96%)",
                      boxShadow: "0 8px 30px -8px rgba(0,0,0,0.5)",
                    }}
                    formatter={(value: number) => [`${value}h`, "Horas"]}
                  />
                  <Area type="monotone" dataKey="hours" stroke="hsl(234 89% 64%)" strokeWidth={2} fill="url(#gradHours)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState variant="chart" message="Nenhum dado de horas disponível." />
          )}
        </div>

        {/* Status Distribution */}
        <div className="rounded-2xl bg-card/40 p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Distribuição de Status</h3>
          {statusData.length > 0 ? (
            <div className="flex items-center gap-6">
              <div className="h-[200px] w-[200px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {statusData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "hsl(222 40% 8%)",
                        border: "none",
                        borderRadius: 10,
                        fontSize: 12,
                        color: "hsl(210 40% 96%)",
                        boxShadow: "0 8px 30px -8px rgba(0,0,0,0.5)",
                      }}
                    />
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
            <EmptyState variant="chart" message="Nenhum dado de status disponível." />
          )}
        </div>
      </div>

      {/* Hours by project */}
      {projectData.length > 0 && (
        <div className="rounded-2xl bg-card/40 p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Horas por Projeto</h3>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 25% 14%)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "hsl(215 20% 60%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fill: "hsl(215 20% 60%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(222 40% 8%)",
                    border: "none",
                    borderRadius: 10,
                    fontSize: 12,
                    color: "hsl(210 40% 96%)",
                    boxShadow: "0 8px 30px -8px rgba(0,0,0,0.5)",
                  }}
                  formatter={(value: number) => [`${value}h`, "Horas"]}
                />
                <Bar dataKey="hours" radius={[0, 6, 6, 0]} fill="hsl(234 89% 64%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
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
