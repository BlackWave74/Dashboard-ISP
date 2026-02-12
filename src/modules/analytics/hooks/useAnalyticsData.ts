import { useMemo, useState, useCallback } from "react";
import type { TaskRecord } from "@/modules/tasks/types";
import type { ProjectHours } from "@/modules/tasks/api/useProjectHours";
import type { ProjectAnalytics } from "../types";

function classifyTask(task: TaskRecord): "done" | "overdue" | "pending" {
  const status = String(task.status ?? task.situacao ?? "").toLowerCase();
  if (["5", "done", "concluida", "concluído", "finalizada", "completed"].some((s) => status.includes(s)))
    return "done";
  const deadline = task.deadline ?? task.due_date ?? task.dueDate;
  if (deadline) {
    const d = new Date(String(deadline));
    if (!Number.isNaN(d.getTime()) && d < new Date()) return "overdue";
  }
  return "pending";
}

export function useAnalyticsData(
  tasks: TaskRecord[],
  projectHours: ProjectHours[]
) {
  const [favorites, setFavorites] = useState<Set<number>>(() => {
    try {
      const stored = localStorage.getItem("ana:favorites");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const toggleFavorite = useCallback((projectId: number) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      try {
        localStorage.setItem("ana:favorites", JSON.stringify([...next]));
      } catch {}
      return next;
    });
  }, []);

  const tasksByProject = useMemo(() => {
    const map = new Map<number, { done: number; pending: number; overdue: number }>();
    tasks.forEach((t) => {
      const pid = Number(t.project_id);
      if (!pid) return;
      if (!map.has(pid)) map.set(pid, { done: 0, pending: 0, overdue: 0 });
      const entry = map.get(pid)!;
      entry[classifyTask(t)]++;
    });
    return map;
  }, [tasks]);

  const projects: ProjectAnalytics[] = useMemo(() => {
    return projectHours.map((ph) => {
      const taskStats = tasksByProject.get(ph.projectId) ?? { done: 0, pending: 0, overdue: 0 };
      const totalTasks = taskStats.done + taskStats.pending + taskStats.overdue;
      const completionRate = totalTasks > 0 ? taskStats.done / totalTasks : 0;
      const overdueRate = totalTasks > 0 ? taskStats.overdue / totalTasks : 0;
      const performance: "good" | "neutral" | "bad" =
        overdueRate > 0.3 ? "bad" : completionRate > 0.6 ? "good" : "neutral";

      return {
        projectId: ph.projectId,
        projectName: ph.projectName,
        clientId: ph.clientId,
        clientName: ph.clientName,
        hoursUsed: ph.hours,
        hoursContracted: 0, // placeholder - would come from contract data
        isActive: taskStats.pending > 0 || taskStats.overdue > 0,
        isFavorite: favorites.has(ph.projectId),
        tasksDone: taskStats.done,
        tasksPending: taskStats.pending,
        tasksOverdue: taskStats.overdue,
        performance,
      };
    });
  }, [projectHours, tasksByProject, favorites]);

  const uniqueClients = useMemo(() => {
    const set = new Set<number>();
    projectHours.forEach((p) => set.add(p.clientId));
    return set.size;
  }, [projectHours]);

  const totalDone = useMemo(() => tasks.filter((t) => classifyTask(t) === "done").length, [tasks]);
  const totalPending = useMemo(() => tasks.filter((t) => classifyTask(t) === "pending").length, [tasks]);
  const totalOverdue = useMemo(() => tasks.filter((t) => classifyTask(t) === "overdue").length, [tasks]);
  const totalHours = useMemo(() => projectHours.reduce((s, p) => s + p.hours, 0), [projectHours]);

  return {
    projects,
    uniqueClients,
    totalDone,
    totalPending,
    totalOverdue,
    totalHours,
    toggleFavorite,
  };
}
