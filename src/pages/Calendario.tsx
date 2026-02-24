import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, CheckCircle2, AlertTriangle, User } from "lucide-react";
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

const STATUS_COLORS: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  overdue: { dot: "bg-red-500", bg: "bg-red-500/10", text: "text-red-400", label: "Atrasada" },
  pending: { dot: "bg-amber-400", bg: "bg-amber-500/10", text: "text-amber-400", label: "Pendente" },
  done: { dot: "bg-emerald-500", bg: "bg-emerald-500/10", text: "text-emerald-400", label: "Concluída" },
  unknown: { dot: "bg-muted-foreground", bg: "bg-muted/30", text: "text-muted-foreground", label: "—" },
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
  consultant: string;
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
          consultant: String(t.responsible_name ?? t.consultant ?? t.owner ?? t.responsavel ?? ""),
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

      <div className="relative z-10 mx-auto w-full max-w-[1400px] space-y-6 px-3 sm:px-6 pt-4 sm:pt-6 md:px-10 pb-16">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Calendário de Tarefas</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Visualize suas tarefas organizadas por data de entrega</p>
            </div>
          </div>
          <div className="flex items-center gap-5">
            {[
              { label: "Atrasadas", value: monthStats.overdue, color: "text-red-400" },
              { label: "Pendentes", value: monthStats.pending, color: "text-amber-400" },
              { label: "Concluídas", value: monthStats.done, color: "text-emerald-400" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* Calendar Grid */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
            <div className="rounded-2xl bg-card/20 backdrop-blur-xl p-5" style={{ border: "1px solid hsl(234 89% 64% / 0.08)" }}>
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-5">
                <Button variant="ghost" size="icon" onClick={prevMonth} className="text-muted-foreground hover:text-foreground rounded-xl"><ChevronLeft className="h-4 w-4" /></Button>
                <h2 className="text-lg font-bold text-foreground">{MONTHS[month]} {year}</h2>
                <Button variant="ghost" size="icon" onClick={nextMonth} className="text-muted-foreground hover:text-foreground rounded-xl"><ChevronRight className="h-4 w-4" /></Button>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="text-center text-[11px] font-bold text-muted-foreground/60 py-1.5 uppercase tracking-wider">{d}</div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 gap-1">
                {days.map((day, i) => {
                  if (!day) return <div key={i} className="min-h-[72px]" />;
                  const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
                  const dayTasks = tasksMap.get(key) ?? [];
                  const isToday = isSameDay(day, today);
                  const isSelected = selectedDay && isSameDay(day, selectedDay);
                  const hasOverdue = dayTasks.some((t) => t.statusKey === "overdue");

                  return (
                    <motion.button
                      key={i}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setSelectedDay(day)}
                      className={`relative flex flex-col items-center justify-start rounded-xl p-1.5 min-h-[72px] transition-all ${
                        isSelected
                          ? "bg-primary/12 ring-1 ring-primary/30 shadow-lg shadow-primary/10"
                          : isToday
                          ? "bg-primary/5 ring-1 ring-primary/15"
                          : "hover:bg-white/[0.03]"
                      }`}
                    >
                      <span className={`text-sm font-semibold ${isToday ? "text-primary" : isSelected ? "text-foreground" : "text-foreground/70"}`}>
                        {day.getDate()}
                      </span>
                      {dayTasks.length > 0 && (
                        <div className="flex gap-0.5 mt-1.5 flex-wrap justify-center">
                          {dayTasks.slice(0, 3).map((t, ti) => (
                            <motion.div
                              key={ti}
                              className={`h-2 w-2 rounded-full ${STATUS_COLORS[t.statusKey]?.dot ?? STATUS_COLORS.unknown.dot}`}
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: 0.3 + ti * 0.05 }}
                            />
                          ))}
                          {dayTasks.length > 3 && (
                            <span className="text-[9px] text-primary font-bold ml-0.5">+{dayTasks.length - 3}</span>
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
            <div className="rounded-2xl bg-card/20 backdrop-blur-xl sticky top-6 p-5" style={{ border: "1px solid hsl(234 89% 64% / 0.08)" }}>
              <h3 className="text-sm font-bold text-foreground mb-4">
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
                  <motion.div key="tasks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
                    {selectedTasks.map((t, i) => {
                      const colors = STATUS_COLORS[t.statusKey] ?? STATUS_COLORS.unknown;
                      const StatusIcon = t.statusKey === "done" ? CheckCircle2 : t.statusKey === "overdue" ? AlertTriangle : Clock;
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="rounded-xl p-3.5"
                          style={{ background: "hsl(222 40% 8% / 0.5)", border: "1px solid hsl(234 89% 64% / 0.06)" }}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${colors.bg}`}>
                              <StatusIcon className={`h-3.5 w-3.5 ${colors.text}`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-semibold text-foreground line-clamp-2">{t.title}</p>
                              {t.project && <p className="text-[11px] text-muted-foreground mt-0.5">{t.project}</p>}
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className={`text-[10px] font-semibold ${colors.text}`}>{colors.label}</span>
                                {t.consultant && (
                                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                                    <User className="h-2.5 w-2.5" />{t.consultant}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground/50 mt-1">
                                Prazo: {t.deadline.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                              </p>
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
