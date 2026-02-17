import { useCallback, useEffect, useMemo, useState } from "react";
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

export function useNotifications(tasks: TaskLike[], userName?: string) {
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

    // Filter tasks relevant to the current user
    const userTasks = userName
      ? tasks.filter((task) => {
          const consultant = (task.consultant || "").trim().toLowerCase();
          const user = userName.trim().toLowerCase();
          return !consultant || consultant === user || consultant.includes(user) || user.includes(consultant);
        })
      : tasks;

    userTasks.forEach((task) => {
      const title = task.title || "Tarefa";
      const project = task.project || "";

      const formatDate = (d: Date | null | undefined) => {
        if (!d) return "";
        return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
      };

      const getDaysRemaining = (d: Date | null | undefined): number | undefined => {
        if (!d) return undefined;
        const diffMs = d.getTime() - Date.now();
        return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      };

      // Overdue tasks
      if (task.statusKey === "overdue") {
        const id = makeId("overdue", title);
        const dateStr = formatDate(task.deadlineDate);
        const daysRemaining = getDaysRemaining(task.deadlineDate);
        items.push({
          id,
          type: "overdue",
          title: "Tarefa atrasada",
          message: `"${title}" tinha prazo para ${dateStr || "data não definida"}.`,
          timestamp: task.deadlineDate?.getTime() ?? now,
          read: readIds.has(id),
          projectName: project,
          daysRemaining,
          deadlineDateStr: dateStr,
        });
      }

      // Deadline approaching (within 3 days)
      if (task.deadlineIsSoon && task.statusKey !== "done" && task.statusKey !== "overdue") {
        const id = makeId("soon", title);
        const dateStr = formatDate(task.deadlineDate);
        const daysRemaining = getDaysRemaining(task.deadlineDate);
        items.push({
          id,
          type: "deadline_soon",
          title: "Prazo se aproximando",
          message: `Tarefa "${title}" deve ser concluída até o dia ${dateStr}.`,
          timestamp: task.deadlineDate?.getTime() ?? now,
          read: readIds.has(id),
          projectName: project,
          daysRemaining,
          deadlineDateStr: dateStr,
        });
      }
    });

    // Sort: unread first, then by timestamp desc
    items.sort((a, b) => {
      if (a.read !== b.read) return a.read ? 1 : -1;
      return b.timestamp - a.timestamp;
    });

    return items.slice(0, 50);
  }, [tasks, readIds, userName]);

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
