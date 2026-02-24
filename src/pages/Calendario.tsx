import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
  User,
  Calendar,
} from "lucide-react";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useTasks } from "@/modules/tasks/api/useTasks";
import { normalizeTaskTitle, parseDateValue } from "@/modules/tasks/utils";
import { usePageSEO } from "@/hooks/usePageSEO";

function getTaskStatusKey(t: Record<string, any>): string {
  const statusRaw = String(t.status ?? t.situacao ?? "").toLowerCase();
  const isDone = ["5", "done", "concluido", "concluído", "completed", "finalizado"].includes(statusRaw);
  if (isDone) return "done";
  const deadline = parseDateValue(t.deadline) ?? parseDateValue(t.due_date) ?? parseDateValue(t.dueDate);
  if (deadline && deadline < new Date()) return "overdue";
  return "pending";
}

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const STATUS_CONFIG: Record<string, { dot: string; line: string; text: string; label: string; icon: typeof CheckCircle2 }> = {
  overdue: {
    dot: "bg-rose-400",
    line: "bg-rose-400",
    text: "text-rose-400",
    label: "Atrasada",
    icon: AlertTriangle,
  },
  pending: {
    dot: "bg-amber-400",
    line: "bg-amber-400",
    text: "text-amber-400",
    label: "Pendente",
    icon: Clock,
  },
  done: {
    dot: "bg-emerald-400",
    line: "bg-emerald-400",
    text: "text-emerald-400",
    label: "Concluída",
    icon: CheckCircle2,
  },
  unknown: {
    dot: "bg-[hsl(var(--muted-foreground))]",
    line: "bg-[hsl(var(--muted-foreground))]",
    text: "text-muted-foreground",
    label: "Sem status",
    icon: Clock,
  },
};

type CalendarTask = {
  title: string;
  project: string;
  statusKey: string;
  deadline: Date;
  consultant: string;
};

type CalendarCell = {
  date: Date;
  inCurrentMonth: boolean;
};

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildMonthGrid(year: number, month: number): CalendarCell[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const cells: CalendarCell[] = [];

  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({
      date: new Date(year, month - 1, prevMonthDays - i),
      inCurrentMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ date: new Date(year, month, day), inCurrentMonth: true });
  }

  const remaining = 42 - cells.length;
  for (let day = 1; day <= remaining; day++) {
    cells.push({ date: new Date(year, month + 1, day), inCurrentMonth: false });
  }

  return cells;
}

export default function Calendario() {
  usePageSEO("/calendario");
  const { session } = useAuth();
  const { tasks } = useTasks({ accessToken: session?.accessToken, period: "all" });

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState(new Date(now.getFullYear(), now.getMonth(), now.getDate()));

  const calendarTasks = useMemo<CalendarTask[]>(() => {
    return tasks
      .map((t) => {
        const deadline = parseDateValue(t.deadline) ?? parseDateValue(t.due_date) ?? parseDateValue(t.dueDate);
        if (!deadline) return null;

        return {
          title: normalizeTaskTitle(String(t.title ?? t.nome ?? t.name ?? "Tarefa")),
          project: String(t.projects?.name ?? t.project_name ?? t.project ?? ""),
          statusKey: getTaskStatusKey(t),
          deadline,
          consultant: String(t.responsible_name ?? t.consultant ?? t.owner ?? t.responsavel ?? ""),
        };
      })
      .filter(Boolean) as CalendarTask[];
  }, [tasks]);

  const tasksMap = useMemo(() => {
    const map = new Map<string, CalendarTask[]>();
    calendarTasks.forEach((task) => {
      const key = `${task.deadline.getFullYear()}-${task.deadline.getMonth()}-${task.deadline.getDate()}`;
      const list = map.get(key) ?? [];
      list.push(task);
      map.set(key, list);
    });
    return map;
  }, [calendarTasks]);

  const monthCells = useMemo(() => buildMonthGrid(year, month), [year, month]);

  const selectedTasks = useMemo(() => {
    const key = `${selectedDay.getFullYear()}-${selectedDay.getMonth()}-${selectedDay.getDate()}`;
    const items = tasksMap.get(key) ?? [];
    const order: Record<string, number> = { overdue: 0, pending: 1, done: 2 };
    return [...items].sort((a, b) => (order[a.statusKey] ?? 3) - (order[b.statusKey] ?? 3));
  }, [selectedDay, tasksMap]);

  const monthStats = useMemo(() => {
    let overdue = 0;
    let pending = 0;
    let done = 0;

    calendarTasks.forEach((task) => {
      if (task.deadline.getMonth() === month && task.deadline.getFullYear() === year) {
        if (task.statusKey === "overdue") overdue += 1;
        else if (task.statusKey === "done") done += 1;
        else pending += 1;
      }
    });

    return { overdue, pending, done };
  }, [calendarTasks, month, year]);

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((v) => v - 1);
    } else {
      setMonth((v) => v - 1);
    }
  };

  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((v) => v + 1);
    } else {
      setMonth((v) => v + 1);
    }
  };

  return (
    <div className="page-gradient w-full">
      <div className="mx-auto w-full max-w-[1500px] p-3 sm:p-5 md:p-7">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-[26px] border border-white/[0.08] bg-[hsl(var(--card)/0.75)] shadow-[0_30px_80px_hsl(260_60%_2%/0.55)]"
        >
          <header className="flex flex-col gap-4 border-b border-white/[0.06] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--task-purple)/0.2)]">
                <CalendarDays className="h-5 w-5 text-[hsl(var(--task-purple))]" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground sm:text-2xl">Olá, {session?.name?.split(" ")[0] || "Equipe"}!</h1>
                <p className="text-xs text-muted-foreground sm:text-sm">Aqui está sua agenda de entregas do dia.</p>
              </div>
            </div>
            <button
              onClick={() => { setSelectedDay(new Date(now.getFullYear(), now.getMonth(), now.getDate())); setMonth(now.getMonth()); setYear(now.getFullYear()); }}
              className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-muted-foreground transition hover:text-foreground hover:border-[hsl(var(--task-purple)/0.4)]"
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Hoje
            </button>
          </header>

          <div className="grid gap-0 lg:grid-cols-[1fr_340px]">
            <div className="p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button onClick={prevMonth} className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.02] text-muted-foreground transition hover:text-foreground">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-sm font-semibold text-foreground">
                    {MONTHS[month]} {year}
                  </div>
                  <button onClick={nextMonth} className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.02] text-muted-foreground transition hover:text-foreground">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="hidden items-center gap-2 sm:flex">
                  <BadgeInfo label="Atrasadas" value={monthStats.overdue} color="text-rose-400" />
                  <BadgeInfo label="Pendentes" value={monthStats.pending} color="text-amber-400" />
                  <BadgeInfo label="Concluídas" value={monthStats.done} color="text-emerald-400" />
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {WEEKDAYS.map((day) => (
                  <div key={day} className="px-1 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60 sm:text-[11px]">
                    {day.slice(0, 3)}
                  </div>
                ))}

                {monthCells.map((cell, index) => {
                  const date = cell.date;
                  const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
                  const dayTasks = tasksMap.get(key) ?? [];
                  const isSelected = isSameDay(date, selectedDay);
                  const isToday = isSameDay(date, now);
                  const overdueCount = dayTasks.filter(t => t.statusKey === "overdue").length;
                  const pendingCount = dayTasks.filter(t => t.statusKey === "pending").length;
                  const doneCount = dayTasks.filter(t => t.statusKey === "done").length;

                  // Determine dominant status for cell bg tint
                  let cellBg = "bg-white/[0.02]";
                  let cellBorder = "border-white/[0.06]";
                  if (cell.inCurrentMonth && dayTasks.length > 0) {
                    if (overdueCount > 0) {
                      cellBg = "bg-rose-500/[0.08]";
                      cellBorder = "border-rose-500/[0.2]";
                    } else if (pendingCount > 0) {
                      cellBg = "bg-amber-500/[0.08]";
                      cellBorder = "border-amber-500/[0.2]";
                    } else if (doneCount > 0) {
                      cellBg = "bg-emerald-500/[0.08]";
                      cellBorder = "border-emerald-500/[0.2]";
                    }
                  }

                  return (
                    <motion.button
                      key={`${key}-${index}`}
                      onClick={() => setSelectedDay(date)}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                      className={`group relative min-h-[98px] rounded-2xl border p-2 text-left transition-all sm:min-h-[112px] ${
                        isSelected
                          ? "border-[hsl(var(--task-purple)/0.55)] bg-[hsl(var(--task-purple)/0.15)] ring-1 ring-[hsl(var(--task-purple)/0.3)]"
                          : `${cellBorder} ${cellBg} hover:bg-white/[0.05]`
                      } ${!cell.inCurrentMonth ? "opacity-40" : "opacity-100"}`}
                    >
                      <span className={`text-sm font-semibold ${isToday ? "text-[hsl(var(--task-purple))]" : "text-foreground/80"}`}>
                        {date.getDate()}
                      </span>

                      {dayTasks.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.05 }}
                          className="mt-1.5 space-y-0.5"
                        >
                          <p className="text-[11px] font-bold text-foreground/90">{dayTasks.length} tarefa{dayTasks.length > 1 ? "s" : ""}</p>
                          <div className="flex flex-col gap-0.5 text-[10px] font-semibold">
                            {overdueCount > 0 && <span className="text-rose-400">{overdueCount} atrasada{overdueCount > 1 ? "s" : ""}</span>}
                            {pendingCount > 0 && <span className="text-amber-400">{pendingCount} pendente{pendingCount > 1 ? "s" : ""}</span>}
                            {doneCount > 0 && <span className="text-emerald-400">{doneCount} concluída{doneCount > 1 ? "s" : ""}</span>}
                          </div>
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <aside className="border-t border-white/[0.06] bg-white/[0.02] p-4 lg:border-l lg:border-t-0">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-foreground">Agenda do dia</p>
                  <p className="text-[11px] text-muted-foreground">
                    {selectedDay.getDate()} de {MONTHS[selectedDay.getMonth()]}, {selectedDay.getFullYear()}
                  </p>
                </div>
                <Calendar className="h-4 w-4 text-[hsl(var(--task-purple))]" />
              </div>

              <AnimatePresence mode="wait">
                {selectedTasks.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="rounded-2xl border border-dashed border-white/[0.1] p-6 text-center"
                  >
                    <p className="text-sm text-muted-foreground">Sem tarefas neste dia.</p>
                  </motion.div>
                ) : (
                  <motion.div key="tasks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2.5 max-h-[820px] overflow-y-auto styled-scrollbar pr-1">
                    {selectedTasks.map((task, idx) => {
                      const cfg = STATUS_CONFIG[task.statusKey] ?? STATUS_CONFIG.unknown;
                      const Icon = cfg.icon;
                      const cardBg = task.statusKey === "overdue"
                        ? "bg-rose-500/[0.1] border-rose-500/[0.25]"
                        : task.statusKey === "pending"
                        ? "bg-amber-500/[0.08] border-amber-500/[0.2]"
                        : task.statusKey === "done"
                        ? "bg-emerald-500/[0.08] border-emerald-500/[0.2]"
                        : "bg-white/[0.03] border-white/[0.08]";
                      return (
                        <motion.div
                          key={`${task.title}-${idx}`}
                          initial={{ opacity: 0, x: 12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05, duration: 0.25 }}
                          className={`rounded-xl border p-3 ${cardBg}`}
                        >
                          <span className={`mb-2 block h-1 w-full rounded-full ${cfg.line}`} />
                          <div className="flex items-start gap-2.5">
                            <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.06]">
                              <Icon className={`h-3.5 w-3.5 ${cfg.text}`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] font-semibold text-foreground">{task.title}</p>
                              {task.project && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{task.project}</p>}
                              <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                                <span className={`font-bold ${cfg.text}`}>{cfg.label}</span>
                                {task.consultant && (
                                  <span className="inline-flex items-center gap-1 truncate">
                                    <User className="h-3 w-3" />
                                    {task.consultant}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </aside>
          </div>
        </motion.section>
      </div>
    </div>
  );
}

function BadgeInfo({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-center">
      <p className={`text-sm font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
