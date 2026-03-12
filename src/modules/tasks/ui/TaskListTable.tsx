import { useState } from "react";
import type { TaskView } from "@/modules/tasks/types";
import { STATUS_LABELS } from "@/modules/tasks/types";
import { formatDurationHHMM } from "@/modules/tasks/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Calendar, User, FolderKanban, Clock, FileText } from "lucide-react";

/* Parse description — handles HTML tags, \n, numbered lists, bullets */
function FormattedDescription({ text }: { text?: string }) {
  if (!text || text === "Sem descrição") {
    return <p className="text-xs text-[hsl(var(--task-text-muted))] italic">Sem descrição disponível</p>;
  }

  // Check if text contains HTML tags
  const hasHtml = /<\/?[a-z][\s\S]*>/i.test(text);
  if (hasHtml) {
    // Strip dangerous tags but keep formatting ones
    const sanitized = text
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/on\w+="[^"]*"/gi, "");
    return (
      <div
        className="text-xs text-[hsl(var(--task-text))] leading-relaxed max-w-none [&_br]:block [&_p]:mb-1.5 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:mb-1 [&_li]:text-[hsl(var(--task-text))] [&_strong]:text-[hsl(var(--task-yellow))] [&_b]:text-[hsl(var(--task-yellow))] [&_a]:text-[hsl(var(--task-purple))] [&_a]:underline"
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
    );
  }

  // Split by actual newlines, \n literals, or numbered patterns
  const lines = text
    .replace(/\\n/g, "\n")
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length > 1) {
    return (
      <div className="space-y-1.5">
        {lines.map((line, i) => {
          const stepMatch = line.match(/^(\d+)[.)]\s*(.*)/);
          if (stepMatch) {
            return (
              <div key={i} className="flex items-start gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--task-yellow)/0.12)] text-[10px] font-bold text-[hsl(var(--task-yellow))] border border-[hsl(var(--task-yellow)/0.2)]">
                  {stepMatch[1]}
                </span>
                <p className="text-xs text-[hsl(var(--task-text))] leading-relaxed pt-0.5">{stepMatch[2]}</p>
              </div>
            );
          }
          const bulletMatch = line.match(/^[-•*]\s*(.*)/);
          if (bulletMatch) {
            return (
              <div key={i} className="flex items-start gap-2 pl-1">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--task-purple))]" />
                <p className="text-xs text-[hsl(var(--task-text))] leading-relaxed">{bulletMatch[1]}</p>
              </div>
            );
          }
          const labelMatch = line.match(/^([A-ZÀ-Ú][a-zà-ú]*(?:\s[a-zà-ú]+)*):\s*(.*)/);
          if (labelMatch) {
            return (
              <div key={i}>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--task-yellow))]">{labelMatch[1]}</span>
                <p className="text-xs text-[hsl(var(--task-text))] leading-relaxed mt-0.5">{labelMatch[2]}</p>
              </div>
            );
          }
          return <p key={i} className="text-xs text-[hsl(var(--task-text))] leading-relaxed">{line}</p>;
        })}
      </div>
    );
  }

  return <p className="text-xs text-[hsl(var(--task-text))] leading-relaxed whitespace-pre-wrap">{text}</p>;
}

type TaskListTableProps = {
  tasks: TaskView[];
};

const statusDot = (status: TaskView["statusKey"]) => {
  switch (status) {
    case "done": return "bg-emerald-400";
    case "overdue": return "bg-rose-400 animate-pulse";
    case "pending": return "bg-[hsl(var(--task-yellow))]";
    default: return "bg-[hsl(var(--task-text-muted))]";
  }
};

const statusPill = (status: TaskView["statusKey"]) => {
  switch (status) {
    case "done": return "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
    case "overdue": return "bg-rose-500/10 text-rose-300 border-rose-500/20";
    case "pending": return "bg-[hsl(var(--task-yellow)/0.1)] text-[hsl(var(--task-yellow))] border-[hsl(var(--task-yellow)/0.2)]";
    default: return "bg-[hsl(var(--task-surface))] text-[hsl(var(--task-text-muted))] border-[hsl(var(--task-border))]";
  }
};

export function TaskListTable({ tasks }: TaskListTableProps) {
  const [expandedId, setExpandedId] = useState<string | number | null>(null);

  if (!tasks.length) return null;

  return (
    <div className="overflow-x-auto rounded-2xl border border-[hsl(var(--task-border))] bg-[hsl(var(--task-surface))]">
      {/* Header */}
      <div className="hidden md:grid grid-cols-[minmax(0,0.95fr)_96px_112px_176px_minmax(220px,1.15fr)_190px] bg-[hsl(var(--task-bg))] border-b border-[hsl(var(--task-border))]">
        <div className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
          Tarefa
        </div>
        {["Status", "Prazo", "Responsável", "Projeto", "Duração"].map((h) => (
          <div key={h} className="px-2 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white text-left">
            {h}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y divide-[hsl(var(--task-border)/0.5)]">
        {tasks.map((task, index) => {
          const key = task.raw.id ?? task.raw.task_id ?? `${task.title}-${index}`;
          const isExpanded = expandedId === key;
          const isOverdue = task.statusKey === "overdue";

          return (
            <div key={key}>
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.025, duration: 0.2 }}
                onClick={() => setExpandedId(isExpanded ? null : key)}
                className={`group grid grid-cols-1 md:grid-cols-[minmax(0,0.95fr)_96px_112px_176px_minmax(220px,1.15fr)_190px] bg-transparent transition-colors cursor-pointer hover:bg-[hsl(var(--task-surface-hover))] ${isOverdue ? "task-shake" : ""}`}
              >
                {/* Task name */}
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${statusDot(task.statusKey)}`} />
                  <div className="min-w-0 flex-1">
                    <span className="text-[13px] font-semibold text-[hsl(var(--task-text))] truncate block">{task.title}</span>
                    <span className="text-[10px] text-[hsl(var(--task-text-muted))] truncate block md:hidden">
                      {task.project} • {task.consultant}
                    </span>
                  </div>
                  <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-[hsl(var(--task-text-muted))] transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </div>

                {/* Status */}
                <div className="hidden md:flex items-center justify-start px-2 py-3">
                  <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[9px] font-bold whitespace-nowrap ${statusPill(task.statusKey)}`}>
                    {STATUS_LABELS[task.statusKey]?.label ?? "—"}
                  </span>
                </div>

                {/* Deadline */}
                <div className="hidden md:flex items-center justify-start px-2 py-3">
                  <span className={`text-[13px] ${task.statusKey === "overdue" ? "text-rose-400 font-bold" : task.deadlineIsSoon ? "text-[hsl(var(--task-yellow))]" : "text-[hsl(var(--task-text-muted))]"}`}>
                    {task.deadlineLabel}
                  </span>
                </div>

                {/* Consultant */}
                <div className="hidden md:flex items-center justify-start gap-2 px-2 py-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--task-purple)/0.15)] text-[9px] font-bold text-[hsl(var(--task-purple))]">
                    {task.consultant ? task.consultant.charAt(0).toUpperCase() : "?"}
                  </div>
                  <span className="text-[13px] text-white truncate">{task.consultant}</span>
                </div>

                {/* Project */}
                <div className="hidden md:flex items-center justify-start px-2 py-3">
                  <span className="text-[13px] text-white truncate whitespace-nowrap">{task.project}</span>
                </div>

                {/* Duration */}
                <div className="hidden md:flex items-center justify-start px-2 py-3">
                  <span className="text-[13px] text-white whitespace-nowrap truncate">
                    {formatDurationHHMM(task.durationSeconds)}
                  </span>
                </div>
              </motion.div>

              {/* Expanded details */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 py-4 bg-[hsl(var(--task-bg))] border-t border-[hsl(var(--task-border)/0.3)]">
                      {/* Meta info grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        <div className="rounded-lg border border-[hsl(var(--task-border))] bg-[hsl(var(--task-surface))] p-2.5">
                          <div className="flex items-center gap-1.5 mb-1">
                            <User className="h-3 w-3 text-[hsl(var(--task-purple))]" />
                            <span className="text-[9px] uppercase tracking-wider text-[hsl(var(--task-text-muted))]">Responsável</span>
                          </div>
                          <p className="text-xs font-semibold text-[hsl(var(--task-text))]">{task.consultant}</p>
                        </div>
                        <div className="rounded-lg border border-[hsl(var(--task-border))] bg-[hsl(var(--task-surface))] p-2.5">
                          <div className="flex items-center gap-1.5 mb-1">
                            <FolderKanban className="h-3 w-3 text-emerald-400" />
                            <span className="text-[9px] uppercase tracking-wider text-[hsl(var(--task-text-muted))]">Projeto</span>
                          </div>
                          <p className="text-xs font-semibold text-[hsl(var(--task-text))]">{task.project}</p>
                        </div>
                        <div className="rounded-lg border border-[hsl(var(--task-border))] bg-[hsl(var(--task-surface))] p-2.5">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Calendar className="h-3 w-3 text-rose-400" />
                            <span className="text-[9px] uppercase tracking-wider text-[hsl(var(--task-text-muted))]">Prazo</span>
                          </div>
                          <p className={`text-xs font-semibold ${task.statusKey === "overdue" ? "text-rose-400" : "text-[hsl(var(--task-text))]"}`}>
                            {task.deadlineLabel || "Sem prazo"}
                          </p>
                        </div>
                        {task.durationSeconds != null && task.durationSeconds > 0 && (
                          <div className="rounded-lg border border-[hsl(var(--task-border))] bg-[hsl(var(--task-surface))] p-2.5">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Clock className="h-3 w-3 text-[hsl(var(--task-text-muted))]" />
                              <span className="text-[9px] uppercase tracking-wider text-[hsl(var(--task-text-muted))]">Tempo</span>
                            </div>
                            <p className="text-xs font-semibold text-[hsl(var(--task-text))]">{task.durationLabel}</p>
                          </div>
                        )}
                      </div>

                      {/* Description */}
                      <div className="rounded-lg border border-[hsl(var(--task-border))] bg-[hsl(var(--task-surface))] p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <FileText className="h-3 w-3 text-[hsl(var(--task-yellow))]" />
                          <span className="text-[9px] uppercase tracking-wider text-[hsl(var(--task-text-muted))]">Descrição</span>
                        </div>
                        <FormattedDescription text={task.description} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
