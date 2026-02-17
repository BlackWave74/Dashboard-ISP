import { useState, useRef, useEffect, memo } from "react";
import { Bell, Check, CheckCheck, AlertTriangle, Clock, X, Sparkles, CalendarClock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { AppNotification } from "@/hooks/useNotifications";

type Props = {
  notifications: AppNotification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  collapsed?: boolean;
};

/** Get urgency color based on days remaining */
function getDeadlineColor(daysRemaining?: number): { clockColor: string; badgeBg: string } {
  if (daysRemaining === undefined) return { clockColor: "text-muted-foreground", badgeBg: "bg-muted/30" };
  if (daysRemaining <= 1) return { clockColor: "text-red-400", badgeBg: "bg-red-500/15" };
  if (daysRemaining <= 3) return { clockColor: "text-amber-400", badgeBg: "bg-amber-500/15" };
  return { clockColor: "text-emerald-400", badgeBg: "bg-emerald-500/15" };
}

const typeConfig = {
  overdue: {
    icon: AlertTriangle,
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    dot: "bg-rose-400",
  },
  deadline_soon: {
    icon: CalendarClock,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    dot: "bg-amber-400",
  },
  new_assignment: {
    icon: Sparkles,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    dot: "bg-blue-400",
  },
  info: {
    icon: Bell,
    color: "text-white/60",
    bg: "bg-white/5",
    border: "border-white/10",
    dot: "bg-white/40",
  },
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function NotificationBellInner({ notifications, unreadCount, onMarkAsRead, onMarkAllAsRead, collapsed }: Props) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        className={`relative flex items-center justify-center rounded-xl transition-all duration-200 hover:bg-white/[0.08] h-9 w-9 ${
          open ? "bg-white/[0.1] text-white" : "text-white/50 hover:text-white/80"
        }`}
        aria-label="Notificações"
      >
        <Bell className="h-[18px] w-[18px]" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-rose-600 text-[9px] font-bold text-white shadow-lg shadow-rose-500/40"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed z-[100] w-[360px] max-h-[480px] overflow-hidden rounded-2xl border border-white/[0.08] shadow-2xl shadow-black/60"
            style={{
              background: "linear-gradient(160deg, hsl(234 50% 13%), hsl(260 45% 10%))",
              top: buttonRef.current ? buttonRef.current.getBoundingClientRect().top : 0,
              left: buttonRef.current ? buttonRef.current.getBoundingClientRect().right + 12 : 0,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Tarefas Pendentes</h3>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-400">
                    {unreadCount} nova{unreadCount > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={onMarkAllAsRead}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold text-white/40 transition hover:bg-white/[0.06] hover:text-white/70"
                  >
                    <CheckCheck className="h-3 w-3" />
                    Ler todas
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="flex h-6 w-6 items-center justify-center rounded-lg text-white/30 transition hover:bg-white/[0.06] hover:text-white/60"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto max-h-[400px] divide-y divide-white/[0.04]">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04]">
                    <Bell className="h-5 w-5 text-white/20" />
                  </div>
                  <p className="text-sm font-semibold text-white/40">Tudo em dia!</p>
                  <p className="text-[11px] text-white/20 mt-1">Nenhuma notificação no momento.</p>
                </div>
              ) : (
                notifications.map((notif, i) => {
                  const config = typeConfig[notif.type];
                  const Icon = config.icon;
                  const deadlineColors = getDeadlineColor(notif.daysRemaining);
                  return (
                    <motion.div
                      key={notif.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.2 }}
                      onClick={() => !notif.read && onMarkAsRead(notif.id)}
                      className={`group flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer ${
                        notif.read
                          ? "opacity-50 hover:opacity-70"
                          : "hover:bg-white/[0.04]"
                      } ${notif.isOwnTask ? "border-l-2 border-l-primary/40" : ""}`}
                    >
                      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${config.bg} border ${config.border}`}>
                        <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[12px] font-semibold text-white/80 truncate">{notif.title}</p>
                          {!notif.read && (
                            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${config.dot}`} />
                          )}
                        </div>
                        <p className="text-[11px] text-white/40 mt-0.5 line-clamp-2">{notif.message}</p>
                        {/* Deadline date with color-coded clock */}
                        {notif.deadlineDateStr && (
                          <div className={`inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-md ${deadlineColors.badgeBg}`}>
                            <Clock className={`h-2.5 w-2.5 ${deadlineColors.clockColor}`} />
                            <span className={`text-[10px] font-semibold ${deadlineColors.clockColor}`}>
                              {notif.deadlineDateStr}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {notif.projectName && (
                            <span className="text-[9px] font-semibold text-white/25 uppercase tracking-wider truncate max-w-[150px]">
                              {notif.projectName}
                            </span>
                          )}
                          <span className="text-[9px] text-white/20">{timeAgo(notif.timestamp)}</span>
                        </div>
                      </div>
                      {!notif.read && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onMarkAsRead(notif.id); }}
                          className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-white/20 opacity-0 transition-all group-hover:opacity-100 hover:bg-white/[0.08] hover:text-white/50"
                          title="Marcar como lida"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default memo(NotificationBellInner);
