import type { TaskView } from "@/modules/tasks/types";
import { STATUS_LABELS } from "@/modules/tasks/types";
import { formatDurationHHMM } from "@/modules/tasks/utils";

type TaskListTableProps = {
  tasks: TaskView[];
};

const statusColor = (status: TaskView["statusKey"]) => {
  switch (status) {
    case "done":
      return "bg-emerald-400";
    case "overdue":
      return "bg-rose-400";
    case "pending":
      return "bg-amber-300";
    default:
      return "bg-slate-400";
  }
};

const pillClasses = (task: TaskView) => {
  if (task.statusKey === "done") return "bg-emerald-500/15 text-emerald-100 border border-emerald-500/40";
  if (task.statusKey === "overdue") return "bg-rose-500/15 text-rose-100 border border-rose-500/40";
  if (task.deadlineIsSoon) return "bg-amber-500/15 text-amber-100 border border-amber-500/40";
  return "bg-slate-500/10 text-slate-100 border border-slate-500/30";
};

export function TaskListTable({ tasks }: TaskListTableProps) {
  if (!tasks.length) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.8)]">
      <table className="min-w-full divide-y divide-slate-800">
        <thead className="bg-slate-900/80">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-300">Nome</th>
            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-300">Status</th>
            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-300">Prazo final</th>
            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-300">Responsável</th>
            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-300">Projeto</th>
            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-300 whitespace-nowrap">Duração efetiva</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {tasks.map((task, index) => {
            const stableKey =
              task.raw.id ?? task.raw.task_id ?? `${task.title}-${task.deadlineLabel}-${index}`;
            return (
              <tr key={stableKey} className="bg-slate-900/30 hover:bg-slate-900/60">
                <td className="px-4 py-3 text-sm text-white">
                  <div className="flex items-center gap-3">
                    <span className={`h-2.5 w-2.5 rounded-full ${statusColor(task.statusKey)}`} aria-hidden />
                    <span className="font-medium">{task.title}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-white text-center">
                  <span className="inline-flex items-center rounded-full bg-slate-800/70 px-3 py-1 text-xs font-semibold text-slate-100">
                    {STATUS_LABELS[task.statusKey]?.label ?? "Sem status"}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-white text-center">
                  <span className={`inline-flex items-center justify-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${pillClasses(task)}`}>
                    <span className="font-bold text-white">{task.deadlineLabel}</span>
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-white text-left">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-200">
                      {task.consultant ? task.consultant.charAt(0).toUpperCase() : "?"}
                    </div>
                    <span className="text-slate-100">{task.consultant}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-slate-200 text-left">{task.project}</td>
                <td className="px-4 py-3 text-sm text-slate-200 whitespace-nowrap w-[140px] text-center">
                  <span className="inline-flex min-w-[110px] items-center justify-center rounded-full bg-slate-800/70 px-3 py-1 text-xs font-semibold text-slate-100">
                    {formatDurationHHMM(task.durationSeconds)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
