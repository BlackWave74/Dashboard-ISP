import { useCallback, useMemo, useState } from "react";
import { storage } from "@/modules/shared/storage";

export type AppNotification = {
  id: string;
  type: "overdue" | "deadline_soon" | "new_assignment" | "info";
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  projectName?: string;
  /** Days remaining until deadline (negative = overdue) */
  daysRemaining?: number;
  /** Formatted deadline date string */
  deadlineDateStr?: string;
  /** Whether this task is assigned to the current user */
  isOwnTask?: boolean;
};

const STORAGE_KEY = "app_notifications_read";

const makeId = (type: string, title: string) =>
  `${type}::${title}`.replace(/\s+/g, "_").slice(0, 80);

type TaskLike = {
  title?: string;
  project?: string;
  statusKey?: string;
  deadlineDate?: Date | null;
  deadlineIsSoon?: boolean;
  consultant?: string;
};

/**
 * Notification hook with role-based filtering:
 * - Admin/gerente/coordenador: see ALL tasks, with own tasks highlighted
 * - Consultor/cliente: see ONLY own tasks
 */
export function useNotifications(
  tasks: TaskLike[],
  userName?: string,
  userRole?: string
) {
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    const saved = storage.get<string[]>(STORAGE_KEY, []);
    return new Set(saved);
  });

  const persistRead = useCallback((ids: Set<string>) => {
    storage.set(STORAGE_KEY, [...ids]);
  }, []);

  const notifications = useMemo<AppNotification[]>(() => {
    const now = Date.now();
    const items: AppNotification[] = [];
    const isPrivileged = ["admin", "gerente", "coordenador"].includes(userRole ?? "");

    const isOwnTask = (task: TaskLike): boolean => {
      if (!userName) return false;
      const consultant = (task.consultant || "").trim().toLowerCase();
      const user = userName.trim().toLowerCase();
      // Se não há consultor definido na tarefa, NÃO consideramos como própria
      // para não-privilegiados (evita falsos positivos)
      if (!consultant) return isPrivileged;
      return consultant === user || consultant.includes(user) || user.includes(consultant);
    };

    // Non-privileged users only see their own tasks
    const visibleTasks = isPrivileged
      ? tasks
      : tasks.filter((t) => isOwnTask(t));

    const formatDate = (d: Date | null | undefined) => {
      if (!d) return "";
      return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    };

    const getDaysRemaining = (d: Date | null | undefined): number | undefined => {
      if (!d) return undefined;
      return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    };

    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

    visibleTasks.forEach((task) => {
      const title = task.title || "Tarefa";
      const project = task.project || "";
      const own = isOwnTask(task);

      // Skip done tasks
      if (task.statusKey === "done") return;

      // Only show tasks with deadline within 7 days or already overdue
      if (task.deadlineDate) {
        const daysRemaining = getDaysRemaining(task.deadlineDate);
        const dateStr = formatDate(task.deadlineDate);
        const isWithinWeek = task.deadlineDate.getTime() - now <= ONE_WEEK_MS;
        const isOverdue = task.statusKey === "overdue" || task.deadlineDate.getTime() < now;

        if (!isOverdue && !isWithinWeek) return;

        if (isOverdue) {
          const id = makeId("overdue", title);
          items.push({
            id,
            type: "overdue",
            title: own ? "⚠️ Sua tarefa está atrasada" : "Tarefa atrasada",
            message: `"${title}" tinha prazo para ${dateStr || "data não definida"}.${!own && task.consultant ? ` (${task.consultant})` : ""}`,
            timestamp: task.deadlineDate?.getTime() ?? now,
            read: readIds.has(id),
            projectName: project,
            daysRemaining,
            deadlineDateStr: dateStr,
            isOwnTask: own,
          });
        } else {
          const id = makeId("soon", title);
          items.push({
            id,
            type: "deadline_soon",
            title: own ? "📅 Prazo se aproximando" : "Prazo se aproximando",
            message: `Tarefa "${title}" deve ser concluída até o dia ${dateStr}.${!own && task.consultant ? ` (${task.consultant})` : ""}`,
            timestamp: task.deadlineDate?.getTime() ?? now,
            read: readIds.has(id),
            projectName: project,
            daysRemaining,
            deadlineDateStr: dateStr,
            isOwnTask: own,
          });
        }
      }
    });

    // Sort: own tasks first, then unread, then by timestamp desc
    items.sort((a, b) => {
      if (a.isOwnTask !== b.isOwnTask) return a.isOwnTask ? -1 : 1;
      if (a.read !== b.read) return a.read ? 1 : -1;
      return b.timestamp - a.timestamp;
    });

    return items.slice(0, 50);
  }, [tasks, readIds, userName, userRole]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const markAsRead = useCallback((id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      persistRead(next);
      return next;
    });
  }, [persistRead]);

  const markAllAsRead = useCallback(() => {
    setReadIds((prev) => {
      const next = new Set(prev);
      notifications.forEach((n) => next.add(n.id));
      persistRead(next);
      return next;
    });
  }, [notifications, persistRead]);

  const clearAll = useCallback(() => {
    const allIds = new Set(notifications.map((n) => n.id));
    setReadIds(allIds);
    persistRead(allIds);
  }, [notifications, persistRead]);

  return { notifications, unreadCount, markAsRead, markAllAsRead, clearAll };
}
