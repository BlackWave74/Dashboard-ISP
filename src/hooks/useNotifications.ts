import { useCallback, useMemo, useState } from "react";
import { storage } from "@/modules/shared/storage";

export type AppNotification = {
  /** When type is "project_alert", links to a project with accumulated overdue tasks */
  overdueProjectCount?: number;
  id: string;
  type: "overdue" | "deadline_soon" | "new_assignment" | "info" | "project_alert";
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

      const deadlineDate = task.deadlineDate;
      const dateStr = formatDate(deadlineDate);
      const daysRemaining = getDaysRemaining(deadlineDate);
      const isOverdue =
        task.statusKey === "overdue" ||
        (deadlineDate !== null && deadlineDate !== undefined && deadlineDate < new Date());
      const isWithinWeek =
        deadlineDate !== null &&
        deadlineDate !== undefined &&
        deadlineDate.getTime() - now <= ONE_WEEK_MS;

      if (isOverdue) {
        // Atrasada com prazo definido
        const id = makeId("overdue", title);
        items.push({
          id,
          type: "overdue",
          title: own ? "⚠️ Sua tarefa está atrasada" : "Tarefa atrasada",
          message: `"${title}"${dateStr ? ` — prazo era ${dateStr}` : ""}.${!own && task.consultant ? ` (${task.consultant})` : ""}`,
          timestamp: deadlineDate?.getTime() ?? now,
          read: readIds.has(id),
          projectName: project,
          daysRemaining,
          deadlineDateStr: dateStr || undefined,
          isOwnTask: own,
        });
      } else if (deadlineDate && isWithinWeek) {
        // Prazo próximo (dentro de 7 dias)
        const id = makeId("soon", title);
        items.push({
          id,
          type: "deadline_soon",
          title: own ? "📅 Prazo se aproximando" : "Prazo se aproximando",
          message: `Tarefa "${title}" deve ser concluída até ${dateStr}.${!own && task.consultant ? ` (${task.consultant})` : ""}`,
          timestamp: deadlineDate.getTime(),
          read: readIds.has(id),
          projectName: project,
          daysRemaining,
          deadlineDateStr: dateStr,
          isOwnTask: own,
        });
      } else {
        // Tarefa aberta sem prazo iminente (em andamento normal)
        const id = makeId("open", title);
        items.push({
          id,
          type: "new_assignment",
          title: own ? "📋 Sua tarefa em andamento" : "Tarefa em andamento",
          message: `"${title}"${dateStr ? ` — prazo: ${dateStr}` : " — sem prazo definido"}.${!own && task.consultant ? ` (${task.consultant})` : ""}`,
          timestamp: now,
          read: readIds.has(id),
          projectName: project,
          daysRemaining,
          deadlineDateStr: dateStr || undefined,
          isOwnTask: own,
        });
      }
    });

    // ── Smart project alerts (admin only): aggregate overdue tasks per project ──
    if (isPrivileged) {
      const overdueByProject: Record<string, number> = {};
      visibleTasks.forEach((task) => {
        if (task.statusKey === "done") return;
        const deadlineDate = task.deadlineDate;
        const isOverdue =
          task.statusKey === "overdue" ||
          (deadlineDate !== null && deadlineDate !== undefined && deadlineDate < new Date());
        if (isOverdue) {
          const project = (task.project || "").trim() || "Sem projeto";
          overdueByProject[project] = (overdueByProject[project] ?? 0) + 1;
        }
      });

      const ALERT_THRESHOLD = 5;
      Object.entries(overdueByProject).forEach(([projectName, count]) => {
        if (count >= ALERT_THRESHOLD) {
          const id = makeId("project_alert", projectName);
          items.push({
            id,
            type: "project_alert",
            title: `🚨 Projeto com ${count} tarefas atrasadas`,
            message: `O projeto "${projectName}" acumulou ${count} tarefas atrasadas. Ação imediata recomendada.`,
            timestamp: now,
            read: readIds.has(id),
            projectName,
            overdueProjectCount: count,
          });
        }
      });
    }

    // Sort: project alerts first, then own tasks, then unread, then by timestamp desc
    items.sort((a, b) => {
      const aIsAlert = a.type === "project_alert" ? 1 : 0;
      const bIsAlert = b.type === "project_alert" ? 1 : 0;
      if (aIsAlert !== bIsAlert) return bIsAlert - aIsAlert;
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
