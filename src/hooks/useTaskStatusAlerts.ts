import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { storage } from "@/modules/shared/storage";

type TaskStatusEntry = { id: string | number; status: string; title: string; project: string };

const STORAGE_KEY = "task_status_snapshot";

/**
 * Detects tasks that became overdue since the last check and shows toast alerts.
 * Runs on each data refresh, comparing current statuses with the previous snapshot.
 */
export function useTaskStatusAlerts(
  tasks: TaskStatusEntry[],
  enabled: boolean = true
) {
  const initialLoad = useRef(true);

  useEffect(() => {
    if (!enabled || tasks.length === 0) return;

    const prevSnapshot = storage.get<Record<string, string>>(STORAGE_KEY, {});
    const currentSnapshot: Record<string, string> = {};

    const newlyOverdue: TaskStatusEntry[] = [];

    tasks.forEach((t) => {
      const key = String(t.id);
      currentSnapshot[key] = t.status;

      // Only alert after initial load (not on first page render)
      if (!initialLoad.current && prevSnapshot[key] && prevSnapshot[key] !== "overdue" && t.status === "overdue") {
        newlyOverdue.push(t);
      }
    });

    // Save current snapshot
    storage.set(STORAGE_KEY, currentSnapshot);

    if (initialLoad.current) {
      initialLoad.current = false;
      return;
    }

    // Show alerts for newly overdue tasks (max 3 to avoid spam)
    newlyOverdue.slice(0, 3).forEach((t) => {
      toast.warning(`Tarefa atrasada: "${t.title}"`, {
        description: t.project || undefined,
        duration: 8000,
      });
    });

    if (newlyOverdue.length > 3) {
      toast.warning(`+${newlyOverdue.length - 3} tarefas ficaram atrasadas`, {
        duration: 6000,
      });
    }
  }, [tasks, enabled]);
}
