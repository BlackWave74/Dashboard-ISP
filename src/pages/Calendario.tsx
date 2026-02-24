/**
 * CALENDÁRIO DE TAREFAS
 * Layout inspirado em designs modernos de calendário (Dribbble).
 * Estrutura: Grade de dias + painel lateral de detalhes.
 * Manter esta estrutura para futuras melhorias.
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, CheckCircle2, AlertTriangle, User, Calendar } from "lucide-react";
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

const STATUS_CONFIG: Record<string, { dot: string; bg: string; text: string; label: string; icon: typeof CheckCircle2 }> = {
  overdue: { dot: "bg-red-500", bg: "bg-red-500/10", text: "text-red-400", label: "Atrasada", icon: AlertTriangle },
  pending: { dot: "bg-amber-400", bg: "bg-amber-500/10", text: "text-amber-400", label: "Pendente", icon: Clock },
  done: { dot: "bg-emerald-500", bg: "bg-emerald-500/10", text: "text-emerald-400", label: "Concluída", icon: CheckCircle2 },
  unknown: { dot: "bg-muted-foreground", bg: "bg-muted/30", text: "text-muted-foreground", label: "—", icon: Clock },
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
  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); setSelectedDay(today); };

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
    <div className="relative min-h-screen w-full">
      {/* Fundo sóbrio */}
      <div className="pointer-events-none fixed inset-0" style={{
        background: "linear-gradient(180deg, hsl(260 35% 8%) 0%, hsl(240 35% 6%) 50%, hsl(234 30% 5%) 100%)",
      }} />

      <div className="relative z-10 mx-auto w-full max-w-[1400px] space-y-5 px-3 sm:px-6 pt-4 sm:pt-6 md:px-10 pb-16">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Calendário</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Tarefas organizadas por data de entrega</p>
            </div>
          </div>
          {/* Stats compactos */}
          <div className="flex items-center gap-4 sm:gap-5">
            {[
              { label: "Atrasadas", value: monthStats.overdue, color: "text-red-400" },
              { label: "Pendentes", value: monthStats.pending, color: "text-amber-400" },
              { label: "Concluídas", value: monthStats.done, color: "text-emerald-400" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className={`text-lg sm:text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          {/* Calendar Grid */}
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-4 sm:p-5">
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="icon" onClick={prevMonth} className="text-muted-foreground hover:text-foreground rounded-xl h-9 w-9">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-3">
                  <h2 className="text-base sm:text-lg font-bold text-foreground">{MONTHS[month]} {year}</h2>
                  <button
                    onClick={goToday}
                    className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold text-muted-foreground hover:text-foreground hover:border-primary/30 transition"
                  >
                    Hoje
                  </button>
                </div>
                <Button variant="ghost" size="icon" onClick={nextMonth} className="text-muted-foreground hover:text-foreground rounded-xl h-9 w-9">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="text-center text-[10px] sm:text-[11px] font-bold text-muted-foreground/50 py-1.5 uppercase tracking-wider">{d}</div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 gap-1">
                {days.map((day, i) => {
                  if (!day) return <div key={i} className="min-h-[56px] sm:min-h-[68px]" />;
                  const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
                  const dayTasks = tasksMap.get(key) ?? [];
                  const isToday = isSameDay(day, today);
                  const isSelected = selectedDay && isSameDay(day, selectedDay);
                  const hasOverdue = dayTasks.some((t) => t.statusKey === "overdue");
                  const hasDone = dayTasks.some((t) => t.statusKey === "done");
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                  return (
                    <motion.button
                      key={i}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedDay(day)}
                      className={`relative flex flex-col items-center justify-start rounded-xl p-1 sm:p-1.5 min-h-[56px] sm:min-h-[68px] transition-all ${
                        isSelected
                          ? "bg-primary/15 ring-1 ring-primary/40"
                          : isToday
                          ? "bg-primary/8 ring-1 ring-primary/20"
                          : isWeekend
                          ? "bg-white/[0.01]"
                          : "hover:bg-white/[0.03]"
                      }`}
                    >
                      <span className={`text-xs sm:text-sm font-semibold ${
                        isToday ? "text-primary font-bold" : isSelected ? "text-foreground" : isWeekend ? "text-foreground/40" : "text-foreground/70"
                      }`}>
                        {day.getDate()}
                      </span>
                      {dayTasks.length > 0 && (
                        <div className="flex gap-0.5 mt-1 flex-wrap justify-center max-w-full">
                          {dayTasks.slice(0, 3).map((t, ti) => (
                            <span
                              key={ti}
                              className={`h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full ${STATUS_CONFIG[t.statusKey]?.dot ?? STATUS_CONFIG.unknown.dot}`}
                            />
                          ))}
                          {dayTasks.length > 3 && (
                            <span className="text-[8px] sm:text-[9px] text-primary font-bold ml-0.5">+{dayTasks.length - 3}</span>
                          )}
                        </div>
                      )}
                      {hasOverdue && (
                        <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-red-500 animate-pulse" />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Day Detail Panel */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm sticky top-6 p-4 sm:p-5">
              {/* Panel header */}
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">
                  {selectedDay
                    ? `${selectedDay.getDate()} de ${MONTHS[selectedDay.getMonth()]}`
                    : "Selecione um dia"}
                </h3>
                {selectedTasks.length > 0 && (
                  <span className="ml-auto rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                    {selectedTasks.length}
                  </span>
                )}
              </div>

              <AnimatePresence mode="wait">
                {selectedTasks.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center py-12 text-muted-foreground"
                  >
                    <CalendarDays className="h-10 w-10 mb-3 opacity-15" />
                    <p className="text-sm">{selectedDay ? "Nenhuma tarefa neste dia" : "Clique em um dia para ver tarefas"}</p>
                  </motion.div>
                ) : (
                  <motion.div key="tasks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2 max-h-[60vh] overflow-y-auto pr-1 styled-scrollbar">
                    {selectedTasks.map((t, i) => {
                      const cfg = STATUS_CONFIG[t.statusKey] ?? STATUS_CONFIG.unknown;
                      const StatusIcon = cfg.icon;
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
                        >
                          <div className="flex items-start gap-2.5">
                            <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${cfg.bg}`}>
                              <StatusIcon className={`h-3.5 w-3.5 ${cfg.text}`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-semibold text-foreground leading-snug line-clamp-2">{t.title}</p>
                              {t.project && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{t.project}</p>}
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <span className={`text-[10px] font-bold ${cfg.text}`}>{cfg.label}</span>
                                {t.consultant && (
                                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                                    <User className="h-2.5 w-2.5" />{t.consultant}
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
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
