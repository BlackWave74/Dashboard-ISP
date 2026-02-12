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
import { Info, X } from "lucide-react";
import { type TaskView } from "@/modules/tasks/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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

/* ─── Chart Info Modal ─── */
function ChartInfoButton({ title, description }: { title: string; description: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-6 w-6 items-center justify-center rounded-lg text-[hsl(var(--task-text-muted))] transition hover:bg-[hsl(var(--task-surface-hover))] hover:text-[hsl(var(--task-yellow))]"
        title="Mais informações"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-[hsl(var(--task-border))] bg-[hsl(var(--task-surface))] text-[hsl(var(--task-text))] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[hsl(var(--task-text))]">{title}</DialogTitle>
            <DialogDescription className="text-[hsl(var(--task-text-muted))] text-sm leading-relaxed mt-2">
              {description}
            </DialogDescription>
          </DialogHeader>
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
    <div className="w-full">
      {!tasks.length && (
        <div className="mb-4 task-card px-4 py-3 text-sm text-[hsl(var(--task-text-muted))]">
          Nenhuma tarefa neste recorte. Ajuste filtros ou recarregue a base.
        </div>
      )}

      {/* Grid: 3 charts side by side */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {/* Pie: Consultants */}
        <div className="task-card flex flex-col min-h-0">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[hsl(var(--task-yellow))]">Responsáveis</p>
              <p className="mt-0.5 text-xs text-[hsl(var(--task-text-muted))]">Distribuição por consultor</p>
            </div>
            <ChartInfoButton
              title="Distribuição por Responsável"
              description="Este gráfico mostra como as tarefas estão distribuídas entre os consultores responsáveis. Clique em uma fatia para filtrar as tarefas pelo consultor selecionado. Os 6 consultores com mais tarefas são exibidos."
            />
          </div>
          <div className="flex-1" style={{ minHeight: 220, maxHeight: 280 }}>
            {pieByConsultant.length ? (
              <div className="flex items-center gap-3 h-full">
                <div className="flex-1 min-w-0" style={{ minHeight: 200 }}>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={pieByConsultant}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        outerRadius={75}
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
                <div className="space-y-1.5 shrink-0">
                  {pieByConsultant.map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-[10px] text-[hsl(var(--task-text-muted))] truncate max-w-[70px]">{d.name}</span>
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
        </div>

        {/* Bar: Projects */}
        <div className="task-card flex flex-col min-h-0">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[hsl(var(--task-purple))]">Projetos</p>
              <p className="mt-0.5 text-xs text-[hsl(var(--task-text-muted))]">Horas por projeto</p>
            </div>
            <ChartInfoButton
              title="Horas por Projeto"
              description="Visualize o total de horas alocadas em cada projeto. Os 5 projetos com mais horas são exibidos. Clique em uma barra para filtrar as tarefas pelo projeto selecionado. O rótulo ao lado mostra o total em horas."
            />
          </div>
          <div className="flex-1" style={{ minHeight: 220, maxHeight: 280 }}>
            {barByProject.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={barByProject}
                  layout="vertical"
                  barCategoryGap="40%"
                  margin={{ top: 5, right: 40, bottom: 5, left: 5 }}
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
                    barSize={20}
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
        </div>

        {/* Line: Timeline */}
        <div className="task-card flex flex-col min-h-0">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-400">Linha do Tempo</p>
              <p className="mt-0.5 text-xs text-[hsl(var(--task-text-muted))]">Tarefas por prazo</p>
            </div>
            <div className="flex items-center gap-1">
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
                description="Mostra a quantidade de tarefas agrupadas por data de prazo. A linha verde indica a tendência de entregas. A linha tracejada marca o dia atual. Clique em um ponto para filtrar tarefas pela data selecionada."
              />
            </div>
          </div>
          <div className="flex-1" style={{ minHeight: 220, maxHeight: 280 }}>
            {lineByDeadline.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={lineByDeadline} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(228 20% 14%)" />
                  <XAxis dataKey="iso" tick={{ fill: "#94a3b8", fontSize: 10 }} tickFormatter={(v: string) => `${v.slice(8, 10)}/${v.slice(5, 7)}`} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
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
        </div>
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
    <div className="tc-kpi">
      <div className="tc-kpi__chart">
        <ResponsiveContainer width="100%" height="100%" minWidth={180} minHeight={180}>
          <RadialBarChart
            data={data}
            innerRadius="74%"
            outerRadius="94%"
            startAngle={90}
            endAngle={-270}
          >
            <defs>
              <linearGradient id="tcGaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FCBD0F" />
                <stop offset="100%" stopColor="#9333ea" />
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
              className="tc-gauge-arc"
              style={{ filter: "url(#tcGlow)" }}
            />
          </RadialBarChart>
        </ResponsiveContainer>

        <div className="tc-kpi__center" aria-label="Percentual do projeto">
          <div className="tc-kpi__value">
            <span className="tc-kpi__num">{animValue}</span>
            <span className="tc-kpi__pct">%</span>
          </div>
          <div className="tc-kpi__sub">
            {done}/{total} concluídas
          </div>
        </div>
      </div>

      {footerHint && (
        <div className="tc-kpi__footer">
          <span className="tc-kpi__hint">{footerHint}</span>
        </div>
      )}
    </div>
  );
}
