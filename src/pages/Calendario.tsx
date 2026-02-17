import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
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

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const STATUS_COLORS: Record<string, { dot: string; bg: string; text: string }> = {
  overdue: { dot: "bg-red-500", bg: "bg-red-500/10", text: "text-red-400" },
  pending: { dot: "bg-amber-400", bg: "bg-amber-500/10", text: "text-amber-400" },
  done: { dot: "bg-emerald-500", bg: "bg-emerald-500/10", text: "text-emerald-400" },
  unknown: { dot: "bg-muted-foreground", bg: "bg-muted/30", text: "text-muted-foreground" },
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

type CalendarTask = {
  title: string;
  project: string;
  statusKey: string;
  deadline: Date;
};

export default function Calendario() {
  usePageSEO("/calendario");
  const { session } = useAuth();
  const { tasks } = useTasks({ accessToken: session?.accessToken, period: "all" });

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

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
        };
      })
      .filter(Boolean) as CalendarTask[];
  }, [tasks]);

  const tasksMap = useMemo(() => {
    const map = new Map<string, CalendarTask[]>();
    calendarTasks.forEach((t) => {
      const key = `${t.deadline.getFullYear()}-${t.deadline.getMonth()}-${t.deadline.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    return map;
  }, [calendarTasks]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const days = Array.from({ length: 42 }, (_, i) => {
    const dayNum = i - firstDay + 1;
    if (dayNum < 1 || dayNum > daysInMonth) return null;
    return new Date(year, month, dayNum);
  });

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(year - 1); } else setMonth(month - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(year + 1); } else setMonth(month + 1); };

  const selectedTasks = selectedDay
    ? tasksMap.get(`${selectedDay.getFullYear()}-${selectedDay.getMonth()}-${selectedDay.getDate()}`) ?? []
    : [];

  const monthStats = useMemo(() => {
    let overdue = 0, pending = 0, done = 0;
    calendarTasks.forEach((t) => {
      if (t.deadline.getFullYear() === year && t.deadline.getMonth() === month) {
        if (t.statusKey === "overdue") overdue++;
        else if (t.statusKey === "done") done++;
        else pending++;
      }
    });
    return { overdue, pending, done, total: overdue + pending + done };
  }, [calendarTasks, year, month]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <div className="pointer-events-none absolute inset-0" style={{
        background: "linear-gradient(180deg, hsl(270 60% 10%) 0%, hsl(250 50% 8%) 25%, hsl(234 45% 7%) 50%, hsl(260 40% 9%) 75%, hsl(234 45% 6%) 100%)",
      }} />
      <div className="pointer-events-none absolute top-[40%] right-[-10%] h-[500px] w-[500px] rounded-full opacity-12 blur-[140px]" style={{ background: "radial-gradient(circle, hsl(234 89% 50%), transparent 70%)" }} />

      <div className="relative z-10 mx-auto w-full max-w-[1400px] space-y-6 px-6 pt-6 md:px-10 pb-16">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <CalendarDays className="h-6 w-6 text-primary" />
              Calendário de Tarefas
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Visualize suas tarefas organizadas por data de entrega</p>
          </div>
          <div className="flex items-center gap-5">
            {[
              { label: "Atrasadas", value: monthStats.overdue, color: "text-red-400" },
              { label: "Pendentes", value: monthStats.pending, color: "text-amber-400" },
              { label: "Concluídas", value: monthStats.done, color: "text-emerald-400" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Calendar Grid */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
            <div className="rounded-2xl bg-card/30 border border-border/20 backdrop-blur-xl p-5">
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-5">
                <Button variant="ghost" size="icon" onClick={prevMonth} className="text-muted-foreground hover:text-foreground"><ChevronLeft className="h-4 w-4" /></Button>
                <h2 className="text-lg font-bold text-foreground">{MONTHS[month]} {year}</h2>
                <Button variant="ghost" size="icon" onClick={nextMonth} className="text-muted-foreground hover:text-foreground"><ChevronRight className="h-4 w-4" /></Button>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="text-center text-[11px] font-semibold text-muted-foreground py-1">{d}</div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 gap-1">
                {days.map((day, i) => {
                  if (!day) return <div key={i} />;
                  const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
                  const dayTasks = tasksMap.get(key) ?? [];
                  const isToday = isSameDay(day, today);
                  const isSelected = selectedDay && isSameDay(day, selectedDay);
                  const hasOverdue = dayTasks.some((t) => t.statusKey === "overdue");

                  return (
                    <motion.button
                      key={i}
                      whileHover={{ scale: 1.06 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedDay(day)}
                      className={`relative flex flex-col items-center justify-start rounded-xl p-1.5 min-h-[72px] transition-all ${
                        isSelected
                          ? "bg-primary/15 ring-1 ring-primary/40 shadow-lg shadow-primary/10"
                          : isToday
                          ? "bg-primary/5 ring-1 ring-primary/20"
                          : "bg-card/10 hover:bg-card/40"
                      }`}
                    >
                      <span className={`text-sm font-semibold ${isToday ? "text-primary" : "text-foreground/80"}`}>
                        {day.getDate()}
                      </span>
                      {dayTasks.length > 0 && (
                        <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                          {dayTasks.slice(0, 3).map((t, ti) => (
                            <motion.div
                              key={ti}
                              className={`h-1.5 w-1.5 rounded-full ${STATUS_COLORS[t.statusKey]?.dot ?? STATUS_COLORS.unknown.dot}`}
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: 0.3 + ti * 0.05 }}
                            />
                          ))}
                          {dayTasks.length > 3 && (
                            <span className="text-[8px] text-muted-foreground ml-0.5">+{dayTasks.length - 3}</span>
                          )}
                        </div>
                      )}
                      {hasOverdue && (
                        <motion.div
                          className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500"
                          animate={{ scale: [1, 1.3, 1] }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Day Detail */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <div className="rounded-2xl bg-card/30 border border-border/20 backdrop-blur-xl sticky top-6 p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">
                {selectedDay
                  ? `${selectedDay.getDate()} de ${MONTHS[selectedDay.getMonth()]}`
                  : "Selecione um dia"}
              </h3>
              <AnimatePresence mode="wait">
                {selectedTasks.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center py-10 text-muted-foreground"
                  >
                    <CalendarDays className="h-10 w-10 mb-3 opacity-20" />
                    <p className="text-sm">{selectedDay ? "Nenhuma tarefa neste dia" : "Clique em um dia"}</p>
                  </motion.div>
                ) : (
                  <motion.div key="tasks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {selectedTasks.map((t, i) => {
                      const colors = STATUS_COLORS[t.statusKey] ?? STATUS_COLORS.unknown;
                      const StatusIcon = t.statusKey === "done" ? CheckCircle2 : t.statusKey === "overdue" ? AlertTriangle : Clock;
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className={`rounded-xl p-3 ${colors.bg}`}
                        >
                          <div className="flex items-start gap-2">
                            <StatusIcon className={`h-4 w-4 mt-0.5 shrink-0 ${colors.text}`} />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{t.title}</p>
                              {t.project && <p className="text-xs text-muted-foreground mt-0.5">{t.project}</p>}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
