import { Search, X, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

type TaskFiltersProps = {
  search: string;
  setSearch: (value: string) => void;
  status: string;
  setStatus: (value: string) => void;
  deadline: string;
  setDeadline: (value: string) => void;
  period: string;
  setPeriod: (value: string) => void;
  dateFrom: string;
  setDateFrom: (value: string) => void;
  dateTo: string;
  setDateTo: (value: string) => void;
  deadlineTo: string;
  setDeadlineTo: (value: string) => void;
  searchRef?: React.RefObject<HTMLInputElement>;
  consultant: string;
  setConsultant: (value: string) => void;
  consultantOptions?: string[];
  project: string;
  setProject: (value: string) => void;
  projectOptions?: string[];
  projectDisabled?: boolean;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
};

const statusChips = [
  { value: "all", label: "Todos" },
  { value: "done", label: "Concluídas" },
  { value: "pending", label: "Em andamento" },
  { value: "overdue", label: "Atrasadas" },
];

const periodChips = [
  { value: "all", label: "Tudo" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "custom", label: "Período" },
];

const selectClass =
  "h-9 rounded-lg border border-[hsl(var(--task-border))] bg-[hsl(var(--task-surface))] px-3 text-xs text-[hsl(var(--task-text))] outline-none transition hover:border-[hsl(var(--task-yellow)/0.4)] focus:border-[hsl(var(--task-yellow)/0.6)] focus:ring-1 focus:ring-[hsl(var(--task-yellow)/0.2)] appearance-none cursor-pointer";

export function TaskFilters({
  search,
  setSearch,
  status,
  setStatus,
  deadline,
  setDeadline,
  period,
  setPeriod,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  deadlineTo,
  setDeadlineTo,
  searchRef,
  consultant,
  setConsultant,
  consultantOptions = [],
  project,
  setProject,
  projectOptions = [],
  projectDisabled = false,
  hasActiveFilters = false,
  onClearFilters,
}: TaskFiltersProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-3">
      {/* Main row: Search + Status chips + Period chips */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-[360px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--task-text-muted))]" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar tarefa..."
            className="h-10 w-full rounded-lg border border-[hsl(var(--task-border))] bg-[hsl(var(--task-surface))] pl-10 pr-8 text-sm text-[hsl(var(--task-text))] placeholder:text-[hsl(var(--task-text-muted)/0.5)] outline-none transition focus:border-[hsl(var(--task-yellow)/0.5)] focus:ring-1 focus:ring-[hsl(var(--task-yellow)/0.2)]"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[hsl(var(--task-text-muted))] hover:text-[hsl(var(--task-text))]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Status chips */}
        <div className="flex items-center gap-1 rounded-lg border border-[hsl(var(--task-border))] bg-[hsl(var(--task-surface))] p-0.5">
          {statusChips.map((chip) => (
            <button
              key={chip.value}
              type="button"
              onClick={() => setStatus(chip.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                status === chip.value
                  ? "bg-[hsl(var(--task-yellow))] text-[hsl(var(--task-bg))] shadow-sm"
                  : "text-[hsl(var(--task-text-muted))] hover:text-[hsl(var(--task-text))]"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Period chips */}
        <div className="flex items-center gap-1 rounded-lg border border-[hsl(var(--task-border))] bg-[hsl(var(--task-surface))] p-0.5">
          {periodChips.map((chip) => (
            <button
              key={chip.value}
              type="button"
              onClick={() => setPeriod(chip.value)}
              className={`rounded-md px-2.5 py-1.5 text-sm font-medium transition ${
                period === chip.value
                  ? "bg-[hsl(var(--task-purple))] text-white shadow-sm"
                  : "text-[hsl(var(--task-text-muted))] hover:text-[hsl(var(--task-text))]"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* More filters toggle + clear */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
              expanded
                ? "border-[hsl(var(--task-yellow)/0.4)] bg-[hsl(var(--task-yellow)/0.1)] text-[hsl(var(--task-yellow))]"
                : "border-[hsl(var(--task-border))] text-[hsl(var(--task-text-muted))] hover:border-[hsl(var(--task-border-light))] hover:text-[hsl(var(--task-text))]"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filtros
          </button>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="flex items-center gap-1 rounded-lg border border-rose-500/20 bg-rose-500/5 px-2.5 py-1.5 text-[10px] font-medium text-rose-400 transition hover:bg-rose-500/10"
            >
              <X className="h-3 w-3" />
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Expanded filters */}
      {expanded && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[hsl(var(--task-border))] bg-[hsl(var(--task-surface)/0.5)] p-3">
          <select value={deadline} onChange={(e) => setDeadline(e.target.value)} className={selectClass}>
            <option value="all">Todos os prazos</option>
            <option value="overdue">Atrasados</option>
            <option value="done">Concluídos</option>
            <option value="pending">Pendentes</option>
          </select>

          <select value={consultant} onChange={(e) => setConsultant(e.target.value)} className={selectClass}>
            <option value="all">Todos consultores</option>
            {consultantOptions.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>

          <select
            value={project}
            onChange={(e) => setProject(e.target.value)}
            disabled={projectDisabled}
            className={`${selectClass} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <option value="all">Todos projetos</option>
            {projectOptions.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>

          {period === "custom" && (
            <>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className={`${selectClass} w-[140px]`}
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className={`${selectClass} w-[140px]`}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
