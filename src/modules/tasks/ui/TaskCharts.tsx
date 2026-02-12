import React, { useCallback, useMemo, useState, type ComponentProps } from "react";
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
import { type TaskView } from "@/modules/tasks/types";

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

function groupTopN(tasks: TaskView[], key: (t: TaskView) => string | null | undefined, topN: number) {
  const map = new Map<string, number>();
  for (const t of tasks) {
    const k = (key(t) || "").trim() || "Sem informação";
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);

  const main = sorted.slice(0, topN).map(([name, value]) => ({ name, value }));

  return main;
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

  const sorted = [...map.entries()]
    .map(([name, { seconds, count }]) => ({ name, hours: seconds / 3600, count }))
    .sort((a, b) => b.hours - a.hours || b.count - a.count);

  const main = sorted.slice(0, topN);

  return main;
}

function groupByDeadline(tasks: TaskView[], limit: TimelineRange) {
  const map = new Map<string, number>();

  for (const t of tasks) {
    const d = t.deadlineDate;
    if (!d) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; // yyyy-mm-dd (local)
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
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  const gradientPairs = COLORS.map((c) => `${c}:${c}`);

  const formatBarTooltip: TooltipProps<number, string>["formatter"] = (value, _name, data) => {
    const num = typeof value === "number" ? value : Number(value ?? 0);
    const p = (data?.payload as { count?: number; name?: string } | undefined) ?? {};
    const tasksCount = Number(p.count ?? 0);
    const projectName = String(p.name ?? "Projeto");

    const hours = `${num.toFixed(num >= 10 ? 0 : 1)}h`;
    return [`${hours} (tarefas: ${tasksCount})`, projectName];
  };

  const renderActiveDot = useCallback(
    (props: ActiveDotProps) => {
      const iso = String(props.payload?.iso ?? "");
      const handleClick = () => {
        if (iso) onPickDeadlineIso?.(iso);
      };
      return <Dot {...props} r={5} onClick={handleClick} style={{ cursor: "pointer" }} />;
    },
    [onPickDeadlineIso]
  );

  const formatBarLabel: NonNullable<ComponentProps<typeof LabelList>["formatter"]> = (value) => {
    const num = typeof value === "number" ? value : Number(value ?? 0);
    return `${num.toFixed(num >= 10 ? 0 : 1)}h`;
  };

  const lineTooltipFormatter: TooltipProps<number, string>["formatter"] = (value) => {
    const num = typeof value === "number" ? value : Number(value ?? 0);
    const label = num === 1 ? "Total: 1 tarefa" : `Total: ${num} tarefas`;
    return [label, undefined];
  };

  const formatIsoDatePtBr = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="h-full w-full" style={{ minHeight: 420 }}>
      {!tasks.length && (
        <div className="mb-4 rounded-xl border border-[hsl(var(--task-border))] bg-[hsl(var(--task-surface))] px-4 py-3 text-sm text-[hsl(var(--task-text-muted))]">
          Nenhuma tarefa neste recorte. Ajuste filtros ou recarregue a base para visualizar dados.
        </div>
      )}

      <div className="grid items-stretch gap-4 xl:grid-cols-3">
        <div className="flex h-full flex-col rounded-xl border border-[hsl(var(--task-border))] bg-[hsl(var(--task-bg))] p-4">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-[hsl(var(--task-yellow))]">Distribuição por responsáveis</p>
            <p className="mt-1 text-sm text-[hsl(var(--task-text-muted))]">Quem concentra mais tarefas neste recorte.</p>
          </div>

          <div className="mt-3 flex-1" style={{ minHeight: 320 }}>
            {pieByConsultant.length ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={240}>
                <PieChart>
                  <Pie
                    data={pieByConsultant}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={2}
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
                    contentStyle={{ background: "rgba(2,6,23,0.95)", border: "1px solid rgba(148,163,184,0.2)" }}
                    labelStyle={{ color: "#e2e8f0" }}
                    itemStyle={{ color: "#e2e8f0" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-[hsl(var(--task-text-muted))]">
                Sem dados para este recorte.
              </div>
            )}
          </div>
        </div>

        <div className="flex h-full flex-col rounded-2xl border border-slate-800 bg-slate-900/45 p-4">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-indigo-300">Top projetos</p>
            <p className="mt-1 text-sm text-slate-400">Mais horas consumidas neste recorte.</p>
          </div>

          <div className="mt-3 flex-1" style={{ minHeight: 320 }}>
            {barByProject.length ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={240}>
                <BarChart
                  data={barByProject}
                  layout="vertical"
                  barCategoryGap="48%"
                  barGap={14}
                  margin={{ top: 10, right: 28, bottom: 14, left: 24 }}
                  style={{ background: "transparent" }}
                >
                  <defs>
                    {barByProject.map((_, idx) => {
                      const colors = gradientPairs[idx % gradientPairs.length].split(":");
                      return (
                        <linearGradient key={idx} id={`barGrad-${idx}`} x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor={colors[0]} />
                          <stop offset="100%" stopColor={colors[1]} />
                        </linearGradient>
                      );
                    })}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "rgba(226,232,240,0.75)", fontSize: 11 }}
                    tickFormatter={(v: number) => `${v.toFixed(v >= 10 ? 0 : 1)}h`}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    hide
                  />
                  <Tooltip
                    contentStyle={{ background: "rgba(2,6,23,0.95)", border: "1px solid rgba(148,163,184,0.2)" }}
                    labelStyle={{ color: "#e2e8f0" }}
                    itemStyle={{ color: "#e2e8f0" }}
                    cursor={{ fill: "rgba(99,102,241,0.08)" }}
                    formatter={formatBarTooltip}
                    labelFormatter={() => ""}
                  />
                  <Bar
                    dataKey="hours"
                    fill="#6366f1"
                    radius={[0, 0, 0, 0]}
                    barSize={24}
                    minPointSize={14}
                    className="cursor-pointer"
                    onClick={(data: { name?: string; payload?: { name?: string } }) => {
                      const name = String(data?.name ?? data?.payload?.name ?? "");
                      if (name) onPickProject?.(name);
                    }}
                  >
                    {barByProject.map((_, idx) => (
                      <Cell key={idx} fill={`url(#barGrad-${idx})`} />
                    ))}
                    <LabelList
                      dataKey="hours"
                      position="right"
                      formatter={formatBarLabel}
                      style={{ fill: "#e2e8f0", fontSize: 11 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-[hsl(var(--task-text-muted))]">
                Sem dados para este recorte.
              </div>
            )}
          </div>
        </div>

        <div className="flex h-full flex-col rounded-xl border border-[hsl(var(--task-border))] bg-[hsl(var(--task-bg))] p-4">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">Linha do tempo</p>
            <p className="mt-1 text-sm text-[hsl(var(--task-text-muted))]">Quantidade por data de prazo (últimos pontos).</p>
            <div className="mt-2 flex justify-center gap-2">
              {[7, 30].map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setDeadlineRange(range as TimelineRange)}
                  className={`rounded-md border px-3 py-1 text-xs transition ${
                    deadlineRange === range
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                      : "border-[hsl(var(--task-border))] text-[hsl(var(--task-text-muted))] hover:border-emerald-400/30 hover:text-emerald-300"
                  }`}
                >
                  Últimos {range}d
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 flex-1" style={{ minHeight: 320 }}>
            {lineByDeadline.length ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={240}>
                <LineChart data={lineByDeadline} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                  <XAxis
                    dataKey="iso"
                    tick={{ fill: "rgba(226,232,240,0.75)", fontSize: 11 }}
                    tickFormatter={(v: string) => `${v.slice(8, 10)}/${v.slice(5, 7)}`}
                  />
                  <YAxis tick={{ fill: "rgba(226,232,240,0.6)", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: "rgba(2,6,23,0.95)", border: "1px solid rgba(148,163,184,0.2)" }}
                    labelStyle={{ color: "#e2e8f0" }}
                    itemStyle={{ color: "#e2e8f0" }}
                    formatter={lineTooltipFormatter}
                    labelFormatter={(label) => formatIsoDatePtBr(String(label ?? ""))}
                  />
                  <ReferenceLine
                    x={todayIso}
                    stroke="rgba(94,234,212,0.8)"
                    strokeDasharray="4 4"
                    label={{ position: "top", value: "Hoje", fill: "#cbd5e1", fontSize: 11 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={false}
                    activeDot={renderActiveDot}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-[hsl(var(--task-text-muted))]">
                Nenhuma tarefa com prazo para montar a linha do tempo.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

type AnyTask = Record<string, any>;

function _isTaskDone(t: AnyTask): boolean {
  if (t?.statusKey === "done") return true;
  if (t?.done === true) return true;
  if (t?.completed === true) return true;
  if (t?.isCompleted === true) return true;

  if (t?.status) {
    const s = String(t.status).trim().toLowerCase();
    if (
      s === "done" ||
      s === "completed" ||
      s === "concluida" ||
      s === "concluído" ||
      s === "concluída" ||
      s === "finalizada" ||
      s === "feita"
    )
      return true;
  }

  if (t?.completedAt) return true;
  if (t?.finishedAt) return true;

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

  // animação: "carrega" 0 -> pctDone (e o centro mostra o que falta)
  const [animValue, setAnimValue] = React.useState(0);

  React.useEffect(() => {
    const target = pctDone;

    setAnimValue(0);

    const duration = 900; // ms
    const start = performance.now();

    let raf = 0;
    const tick = (now: number) => {
      const t = (now - start) / duration;
      if (t >= 1) {
        setAnimValue(target);
        return;
      }
      // easing suave (easeOutCubic)
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimValue(Math.round(target * eased));
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pctDone]);

  const animLeft = 100 - animValue;

  // Recharts usa animValue (pro arco acompanhar a animação)
  const data = [{ name: "progresso", value: animValue }];

  return (
    <div className="tc-kpi">
      <div className="tc-kpi__chart">
        <ResponsiveContainer width="100%" height="100%" minWidth={220} minHeight={220}>
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
              background={{ fill: "rgba(148,163,184,0.12)" }}
              isAnimationActive
              animationDuration={900}
              fill="url(#tcGaugeGradient)"
              stroke="none"
              className="tc-gauge-arc"
              style={{ filter: "url(#tcGlow)" }}
            />
          </RadialBarChart>
        </ResponsiveContainer>

        <div className="tc-kpi__center" aria-label="Percentual restante do projeto">
          <div className="tc-kpi__label">FALTA</div>

          <div className="tc-kpi__value">
            <span className="tc-kpi__num">{animLeft}</span>
            <span className="tc-kpi__pct">%</span>
          </div>

          <div className="tc-kpi__sub">
            {done}/{total} concluídas
          </div>
        </div>
      </div>

      <div className="tc-kpi__footer">
        <span className="tc-kpi__hint">{footerHint}</span>
      </div>
    </div>
  );
}
