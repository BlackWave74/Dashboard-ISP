import React, { useCallback, useMemo, useState } from "react";
import type { TooltipProps } from "recharts";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  LabelList,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  ReferenceLine,
  Dot,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  type DotProps,
} from "recharts";
import { Info, CheckCircle2, AlertTriangle, Hourglass } from "lucide-react";
import { type TaskView } from "@/modules/tasks/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { motion } from "framer-motion";

type ActiveDotProps = DotProps & { payload?: { iso?: string } };
type BarProject = { name: string; hours: number; count?: number };
type TimelineRange = 7 | 30;

type Props = {
  tasks: TaskView[];
  barProjectsOverride?: BarProject[];
  onPickConsultant?: (name: string) => void;
  onPickProject?: (name: string) => void;
  onPickDeadlineIso?: (iso: string) => void;
};

const COLORS = ["#FCBD0F", "#9333ea", "#22c55e", "#f43f5e", "#06b6d4", "#6366f1", "#f97316", "#84cc16"];

const tooltipStyle: React.CSSProperties = {
  background: "hsl(228 25% 8%)",
  border: "1px solid hsl(228 20% 18%)",
  borderRadius: 12,
  fontSize: 12,
  color: "#e2e8f0",
  boxShadow: "0 8px 30px -8px rgba(0,0,0,0.6)",
  padding: "8px 12px",
};

function groupTopN(tasks: TaskView[], key: (t: TaskView) => string | null | undefined, topN: number) {
  const map = new Map<string, number>();
  for (const t of tasks) {
    const k = (key(t) || "").trim() || "Sem informação";
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
  return sorted.slice(0, topN).map(([name, value]) => ({ name, value }));
}

function groupByProjectDuration(tasks: TaskView[], topN: number) {
  const map = new Map<string, { seconds: number; count: number }>();
  tasks.forEach((t) => {
    const key = (t.project || "").trim() || "Sem projeto";
    const seconds = typeof t.durationSeconds === "number" ? Math.max(0, t.durationSeconds) : 0;
    const curr = map.get(key) ?? { seconds: 0, count: 0 };
    curr.seconds += seconds;
    curr.count += 1;
    map.set(key, curr);
  });
  return [...map.entries()]
    .map(([name, { seconds, count }]) => ({ name, hours: seconds / 3600, count }))
    .sort((a, b) => b.hours - a.hours || b.count - a.count)
    .slice(0, topN);
}

function groupByDeadline(tasks: TaskView[], limit: TimelineRange) {
  const map = new Map<string, number>();
  for (const t of tasks) {
    const d = t.deadlineDate;
    if (!d) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  const arr = [...map.entries()]
    .map(([iso, count]) => ({ iso, count }))
    .sort((a, b) => a.iso.localeCompare(b.iso));
  const last = arr.length > limit ? arr.slice(arr.length - limit) : arr;
  return last.map((x) => {
    const mmdd = `${x.iso.slice(8, 10)}/${x.iso.slice(5, 7)}`;
    return { iso: x.iso, date: mmdd, count: x.count };
  });
}

/* ─── Chart Info Modal with contextual data ─── */
type ChartInfoProps = {
  title: string;
  description: string;
  tasks?: TaskView[];
  dataType?: "consultants" | "projects" | "timeline";
};

function ChartInfoButton({ title, description, tasks, dataType }: ChartInfoProps) {
  const [open, setOpen] = useState(false);

  const contextData = useMemo(() => {
    if (!tasks?.length) return null;

    if (dataType === "consultants") {
      const map = new Map<string, { total: number; done: number; overdue: number }>();
      tasks.forEach((t) => {
        const name = (t.consultant || "").trim() || "Sem responsável";
        const cur = map.get(name) ?? { total: 0, done: 0, overdue: 0 };
        cur.total += 1;
        if (t.statusKey === "done") cur.done += 1;
        if (t.statusKey === "overdue") cur.overdue += 1;
        map.set(name, cur);
      });
      return { type: "consultants" as const, items: [...map.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 8) };
    }

    if (dataType === "projects") {
      const map = new Map<string, { total: number; hours: number; done: number }>();
      tasks.forEach((t) => {
        const name = (t.project || "").trim() || "Sem projeto";
        const cur = map.get(name) ?? { total: 0, hours: 0, done: 0 };
        cur.total += 1;
        cur.hours += (t.durationSeconds ?? 0) / 3600;
        if (t.statusKey === "done") cur.done += 1;
        map.set(name, cur);
      });
      return { type: "projects" as const, items: [...map.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 8) };
    }

    const done = tasks.filter((t) => t.statusKey === "done").length;
    const pending = tasks.filter((t) => t.statusKey === "pending" || t.statusKey === "unknown").length;
    const overdue = tasks.filter((t) => t.statusKey === "overdue").length;
    return { type: "summary" as const, done, pending, overdue, total: tasks.length };
  }, [tasks, dataType]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-[hsl(var(--task-text-muted))] transition hover:bg-[hsl(var(--task-surface-hover))] hover:text-[hsl(var(--task-yellow))]"
        title="Mais informações"
      >
        <Info className="h-4 w-4" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-[hsl(var(--task-border))] bg-[hsl(var(--task-surface))] text-[hsl(var(--task-text))] max-w-lg mx-auto animate-scale-in fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-3xl p-6">
          <DialogHeader className="text-center items-center">
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--task-yellow)/0.15)]"
            >
              <Info className="h-5 w-5 text-[hsl(var(--task-yellow))]" />
            </motion.div>
            <DialogTitle className="text-[hsl(var(--task-text))] text-center text-xl">{title}</DialogTitle>
            <DialogDescription className="text-[hsl(var(--task-text-muted))] text-[13px] leading-relaxed mt-2 text-center">
              {description}
            </DialogDescription>
          </DialogHeader>

          {/* Contextual data */}
          {contextData?.type === "consultants" && (
            <div className="mt-4 space-y-2.5 max-h-[320px] overflow-y-auto styled-scrollbar">
              {contextData.items.map(([name, data], i) => (
                <div key={name} className="flex items-center gap-3 rounded-xl border border-[hsl(var(--task-border))] bg-[hsl(var(--task-bg))] px-4 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold" style={{ backgroundColor: `${COLORS[i % COLORS.length]}20`, color: COLORS[i % COLORS.length] }}>
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[hsl(var(--task-text))] truncate">{name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-[hsl(var(--task-text-muted))]">{data.total} tarefas</span>
                      <span className="text-[11px] text-emerald-400">{data.done} feitas</span>
                      {data.overdue > 0 && <span className="text-[11px] text-rose-400">{data.overdue} atrasadas</span>}
                    </div>
                  </div>
                  <span className="text-lg font-extrabold text-[hsl(var(--task-text))]">{data.total}</span>
                </div>
              ))}
            </div>
          )}

          {contextData?.type === "projects" && (
            <div className="mt-4 space-y-2.5 max-h-[320px] overflow-y-auto styled-scrollbar">
              {contextData.items.map(([name, data], i) => (
                <div key={name} className="flex items-center gap-3 rounded-xl border border-[hsl(var(--task-border))] bg-[hsl(var(--task-bg))] px-4 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold" style={{ backgroundColor: `${COLORS[i % COLORS.length]}20`, color: COLORS[i % COLORS.length] }}>
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[hsl(var(--task-text))] truncate">{name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-[hsl(var(--task-text-muted))]">{data.total} tarefas</span>
                      <span className="text-[11px] text-emerald-400">{data.hours.toFixed(1)}h</span>
                    </div>
                  </div>
                  <span className="text-lg font-extrabold text-[hsl(var(--task-text))]">{data.total}</span>
                </div>
              ))}
            </div>
          )}

          {contextData?.type === "summary" && (
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-3 text-center">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
                <p className="text-lg font-extrabold text-emerald-400">{contextData.done}</p>
                <p className="text-[9px] uppercase tracking-wider text-[hsl(var(--task-text-muted))]">Concluídas</p>
              </div>
              <div className="rounded-xl border border-[hsl(var(--task-yellow)/0.2)] bg-[hsl(var(--task-yellow)/0.05)] px-3 py-3 text-center">
                <Hourglass className="h-4 w-4 text-[hsl(var(--task-yellow))] mx-auto mb-1" />
                <p className="text-lg font-extrabold text-[hsl(var(--task-yellow))]">{contextData.pending}</p>
                <p className="text-[9px] uppercase tracking-wider text-[hsl(var(--task-text-muted))]">Em Andamento</p>
              </div>
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-3 py-3 text-center">
                <AlertTriangle className="h-4 w-4 text-rose-400 mx-auto mb-1" />
                <p className="text-lg font-extrabold text-rose-400">{contextData.overdue}</p>
                <p className="text-[9px] uppercase tracking-wider text-[hsl(var(--task-text-muted))]">Atrasadas</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function TaskCharts({
  tasks,
  barProjectsOverride,
  onPickConsultant,
  onPickProject,
  onPickDeadlineIso,
}: Props) {
  const [deadlineRange, setDeadlineRange] = useState<TimelineRange>(30);

  const pieByConsultant = useMemo(() => groupTopN(tasks, (t) => t.consultant, 6), [tasks]);
  const barByProject = useMemo(() => {
    const base =
      barProjectsOverride && barProjectsOverride.length ? barProjectsOverride : groupByProjectDuration(tasks, 8);
    return base.slice(0, 5);
  }, [tasks, barProjectsOverride]);
  const lineByDeadline = useMemo(() => groupByDeadline(tasks, deadlineRange), [tasks, deadlineRange]);
  const todayIso = useMemo(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  }, []);

  const formatBarTooltip: TooltipProps<number, string>["formatter"] = (value, _name, data) => {
    const num = typeof value === "number" ? value : Number(value ?? 0);
    const p = (data?.payload as { count?: number; name?: string } | undefined) ?? {};
    const tasksCount = Number(p.count ?? 0);
    const projectName = String(p.name ?? "Projeto");
    const hours = `${num.toFixed(num >= 10 ? 0 : 1)}h`;
    return [`${hours} (${tasksCount} tarefas)`, projectName];
  };

  const renderActiveDot = useCallback(
    (props: ActiveDotProps) => {
      const iso = String(props.payload?.iso ?? "");
      const handleClick = () => { if (iso) onPickDeadlineIso?.(iso); };
      return <Dot {...props} r={5} onClick={handleClick} style={{ cursor: "pointer" }} />;
    },
    [onPickDeadlineIso]
  );

  const formatBarLabel: NonNullable<React.ComponentProps<typeof LabelList>["formatter"]> = (value) => {
    const num = typeof value === "number" ? value : Number(value ?? 0);
    return `${num.toFixed(num >= 10 ? 0 : 1)}h`;
  };

  const lineTooltipFormatter: TooltipProps<number, string>["formatter"] = (value) => {
    const num = typeof value === "number" ? value : Number(value ?? 0);
    return [num === 1 ? "1 tarefa" : `${num} tarefas`, "Total"];
  };

  const formatIsoDatePtBr = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  };

  return (
    <div className="w-full overflow-x-hidden">
      {!tasks.length && (
        <div className="mb-4 task-card px-4 py-3 text-sm text-[hsl(var(--task-text-muted))]">
          Nenhuma tarefa neste recorte. Ajuste filtros ou recarregue a base.
        </div>
      )}

      {/* Grid: responsive charts */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {/* Pie: Consultants */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="task-card flex flex-col min-h-0 min-w-0"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[hsl(var(--task-yellow))]">Responsáveis</p>
              <p className="mt-0.5 text-xs sm:text-sm text-[hsl(var(--task-text-muted))] truncate">Distribuição por consultor</p>
            </div>
            <ChartInfoButton
              title="Distribuição por Responsável"
              description="Veja como as tarefas estão distribuídas entre os consultores. Clique em uma fatia para filtrar."
              tasks={tasks}
              dataType="consultants"
            />
          </div>
          <div className="flex-1 min-h-[180px] max-h-[280px]">
            {pieByConsultant.length ? (
              <div className="flex flex-col sm:flex-row items-center gap-3 h-full">
                <div className="flex-1 min-w-0 w-full" style={{ minHeight: 180 }}>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={pieByConsultant}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="40%"
                        outerRadius="65%"
                        paddingAngle={3}
                        stroke="none"
                        className="cursor-pointer"
                        onClick={(data: { name?: string; payload?: { name?: string } }) => {
                          const name = String(data?.name ?? data?.payload?.name ?? "");
                          if (name) onPickConsultant?.(name);
                        }}
                      >
                        {pieByConsultant.map((entry, index) => (
                          <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={tooltipStyle}
                        itemStyle={{ color: "#e2e8f0" }}
                        labelStyle={{ color: "#e2e8f0" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5 shrink-0 w-full sm:w-auto">
                  {pieByConsultant.map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-[10px] text-[hsl(var(--task-text-muted))] truncate max-w-[80px]">{d.name}</span>
                      <span className="ml-auto text-[10px] font-bold text-[hsl(var(--task-text))]">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-[hsl(var(--task-text-muted))]">
                Sem dados.
              </div>
            )}
          </div>
        </motion.div>

        {/* Bar: Projects */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="task-card flex flex-col min-h-0 min-w-0"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[hsl(var(--task-purple))]">Alocação por Projeto</p>
              <p className="mt-0.5 text-xs sm:text-sm text-[hsl(var(--task-text-muted))] truncate">Horas investidas por projeto</p>
            </div>
            <ChartInfoButton
              title="Horas por Projeto"
              description="Total de horas alocadas por projeto. Os 5 com mais horas são exibidos. Clique em uma barra para filtrar."
              tasks={tasks}
              dataType="projects"
            />
          </div>
          <div className="flex-1 min-h-[180px] max-h-[280px]">
            {barByProject.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barByProject}
                  layout="vertical"
                  barCategoryGap="40%"
                  margin={{ top: 5, right: 35, bottom: 5, left: 5 }}
                >
                  <defs>
                    {barByProject.map((_, idx) => (
                      <linearGradient key={idx} id={`barGrad-${idx}`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={COLORS[idx % COLORS.length]} />
                        <stop offset="100%" stopColor={COLORS[idx % COLORS.length]} stopOpacity={0.7} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(228 20% 14%)" horizontal={false} />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(v: number) => `${v.toFixed(v >= 10 ? 0 : 1)}h`} />
                  <YAxis dataKey="name" type="category" hide />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    itemStyle={{ color: "#e2e8f0" }}
                    labelStyle={{ color: "#e2e8f0" }}
                    formatter={formatBarTooltip}
                    labelFormatter={() => ""}
                    cursor={{ fill: "hsl(228 20% 10%)" }}
                  />
                  <Bar
                    dataKey="hours"
                    radius={[0, 6, 6, 0]}
                    barSize={18}
                    minPointSize={12}
                    className="cursor-pointer"
                    onClick={(data: { name?: string; payload?: { name?: string } }) => {
                      const name = String(data?.name ?? data?.payload?.name ?? "");
                      if (name) onPickProject?.(name);
                    }}
                  >
                    {barByProject.map((_, idx) => (
                      <Cell key={idx} fill={`url(#barGrad-${idx})`} />
                    ))}
                    <LabelList dataKey="hours" position="right" formatter={formatBarLabel} style={{ fill: "#e2e8f0", fontSize: 10, fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-[hsl(var(--task-text-muted))]">Sem dados.</div>
            )}
          </div>
        </motion.div>

        {/* Line: Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="task-card flex flex-col min-h-0 min-w-0"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-emerald-400">Linha do Tempo</p>
              <p className="mt-0.5 text-xs sm:text-sm text-[hsl(var(--task-text-muted))] truncate">Tarefas por prazo</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {[7, 30].map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setDeadlineRange(range as TimelineRange)}
                  className={`rounded-lg px-2 py-1 text-[10px] font-bold transition ${
                    deadlineRange === range
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "text-[hsl(var(--task-text-muted))] hover:text-emerald-300"
                  }`}
                >
                  {range}d
                </button>
              ))}
              <ChartInfoButton
                title="Linha do Tempo de Prazos"
                description="Tarefas agrupadas por data de prazo. A linha verde mostra a tendência. A linha tracejada marca o dia atual."
                tasks={tasks}
                dataType="timeline"
              />
            </div>
          </div>
          <div className="flex-1 min-h-[180px] max-h-[280px]">
            {lineByDeadline.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineByDeadline} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(228 20% 14%)" />
                  <XAxis dataKey="iso" tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(v: string) => `${v.slice(8, 10)}/${v.slice(5, 7)}`} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} width={30} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    itemStyle={{ color: "#e2e8f0" }}
                    labelStyle={{ color: "#e2e8f0" }}
                    formatter={lineTooltipFormatter}
                    labelFormatter={(label) => formatIsoDatePtBr(String(label ?? ""))}
                  />
                  <ReferenceLine x={todayIso} stroke="hsl(160 84% 60%)" strokeDasharray="4 4" label={{ position: "top", value: "Hoje", fill: "#94a3b8", fontSize: 10 }} />
                  <Line type="monotone" dataKey="count" stroke="#22c55e" strokeWidth={2} dot={false} activeDot={renderActiveDot} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-[hsl(var(--task-text-muted))]">
                Sem dados de prazos.
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/* ═══ Performance Gauge ═══ */

type AnyTask = Record<string, any>;

function _isTaskDone(t: AnyTask): boolean {
  if (t?.statusKey === "done") return true;
  if (t?.done === true || t?.completed === true || t?.isCompleted === true) return true;
  if (t?.status) {
    const s = String(t.status).trim().toLowerCase();
    if (["done", "completed", "concluida", "concluído", "concluída", "finalizada", "feita"].includes(s)) return true;
  }
  if (t?.completedAt || t?.finishedAt) return true;
  return false;
}

function _clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function ProjectPerformanceGauge({
  tasks,
  footerHint = "Percentual calculado com base em tarefas finalizadas / total do projeto.",
}: {
  tasks: AnyTask[];
  footerHint?: string;
}) {
  const total = Array.isArray(tasks) ? tasks.length : 0;
  const done = Array.isArray(tasks) ? tasks.filter(_isTaskDone).length : 0;
  const pct = total > 0 ? (done / total) * 100 : 0;
  const pctDone = Math.round(_clamp(pct, 0, 100));

  const [animValue, setAnimValue] = React.useState(0);

  React.useEffect(() => {
    const target = pctDone;
    setAnimValue(0);
    const duration = 900;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = (now - start) / duration;
      if (t >= 1) { setAnimValue(target); return; }
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimValue(Math.round(target * eased));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pctDone]);

  const data = [{ name: "progresso", value: animValue }];

  return (
    <div className="relative flex flex-col items-center justify-center w-full">
      <div className="relative" style={{ width: 180, height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            data={data}
            innerRadius="74%"
            outerRadius="94%"
            startAngle={90}
            endAngle={-270}
          >
            <defs>
              <linearGradient id="tcGaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(142 71% 45%)" />
                <stop offset="100%" stopColor="hsl(142 71% 55%)" />
              </linearGradient>
              <filter id="tcGlow" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="5" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar
              dataKey="value"
              cornerRadius={999}
              background={{ fill: "hsl(228 20% 12%)" }}
              isAnimationActive
              animationDuration={900}
              fill="url(#tcGaugeGradient)"
              stroke="none"
              style={{ filter: "url(#tcGlow)" }}
            />
          </RadialBarChart>
        </ResponsiveContainer>

        {/* Centered percentage */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-extrabold text-[hsl(var(--task-text))] leading-none">{animValue}<span className="text-base font-bold text-[hsl(var(--task-text-muted))]">%</span></span>
          <span className="text-[10px] text-[hsl(var(--task-text-muted))] mt-1">{done}/{total} concluídas</span>
        </div>
      </div>

      {footerHint && (
        <p className="mt-2 text-[10px] text-[hsl(var(--task-text-muted))] text-center max-w-[200px]">
          {footerHint}
        </p>
      )}
    </div>
  );
}
