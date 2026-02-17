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
};

const STORAGE_KEY = "app_notifications_read";

/** Generate a stable id for deduplication */
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

  // Persist read state
  const persistRead = useCallback((ids: Set<string>) => {
    storage.set(STORAGE_KEY, [...ids]);
  }, []);

  const notifications = useMemo<AppNotification[]>(() => {
    const now = Date.now();
    const items: AppNotification[] = [];

    tasks.forEach((task) => {
      const title = task.title || "Tarefa";
      const project = task.project || "";

      // Overdue tasks
      if (task.statusKey === "overdue") {
        const id = makeId("overdue", title);
        items.push({
          id,
          type: "overdue",
          title: "Tarefa atrasada",
          message: `"${title}" está com o prazo estourado.`,
          timestamp: task.deadlineDate?.getTime() ?? now,
          read: readIds.has(id),
          projectName: project,
        });
      }

      // Deadline approaching (within 3 days)
      if (task.deadlineIsSoon && task.statusKey !== "done" && task.statusKey !== "overdue") {
        const id = makeId("soon", title);
        items.push({
          id,
          type: "deadline_soon",
          title: "Prazo se aproximando",
          message: `"${title}" tem prazo próximo.`,
          timestamp: task.deadlineDate?.getTime() ?? now,
          read: readIds.has(id),
          projectName: project,
        });
      }
    });

    // Sort: unread first, then by timestamp desc
    items.sort((a, b) => {
      if (a.read !== b.read) return a.read ? 1 : -1;
      return b.timestamp - a.timestamp;
    });

    return items.slice(0, 50); // cap at 50
  }, [tasks, readIds]);

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
