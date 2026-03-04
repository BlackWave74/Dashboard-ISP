import { useEffect, useRef, useState, useCallback } from "react";
import { storage } from "@/modules/shared/storage";

type TaskStatusEntry = { id: string | number; status: string; title: string; project: string };

export type StatusAlert = {
  message: string;
  count: number;
  timestamp: number;
};

/**
 * Detects tasks that became overdue since the last check.
 * Returns alerts to be consumed by the AssistantReminder widget.
 * userId is used to namespace localStorage and prevent cross-user data leakage.
 */
export function useTaskStatusAlerts(
  tasks: TaskStatusEntry[],
  enabled: boolean = true,
  userId?: string,
) {
  const initialLoad = useRef(true);
  const [alert, setAlert] = useState<StatusAlert | null>(null);
  const storageKey = userId ? `task_status_snapshot_${userId}` : "task_status_snapshot";

  const dismissAlert = useCallback(() => setAlert(null), []);

  // Reset on user change
  useEffect(() => {
    initialLoad.current = true;
    setAlert(null);
  }, [userId]);

  useEffect(() => {
    if (!enabled || tasks.length === 0 || !userId) return;

    const prevSnapshot = storage.get<Record<string, string>>(storageKey, {});
    const currentSnapshot: Record<string, string> = {};

    const newlyOverdue: TaskStatusEntry[] = [];

    tasks.forEach((t) => {
      const key = String(t.id);
      currentSnapshot[key] = t.status;

      if (!initialLoad.current && prevSnapshot[key] && prevSnapshot[key] !== "overdue" && t.status === "overdue") {
        newlyOverdue.push(t);
      }
    });

    storage.set(storageKey, currentSnapshot);

    if (initialLoad.current) {
      initialLoad.current = false;
      return;
    }

    if (newlyOverdue.length > 0) {
      const names = newlyOverdue.slice(0, 3).map((t) => `• "${t.title}"`).join("\n");
      const extra = newlyOverdue.length > 3 ? `\ne mais ${newlyOverdue.length - 3} tarefa(s)` : "";
      const heading = newlyOverdue.length === 1
        ? "⚠️ Uma tarefa ficou atrasada:"
        : `⚠️ ${newlyOverdue.length} tarefas ficaram atrasadas:`;
      setAlert({
        message: `${heading}\n\n${names}${extra}\n\nConfira suas tarefas para não perder os prazos!`,
        count: newlyOverdue.length,
        timestamp: Date.now(),
      });
    }
  }, [tasks, enabled, userId, storageKey]);

  return { alert, dismissAlert };
}
