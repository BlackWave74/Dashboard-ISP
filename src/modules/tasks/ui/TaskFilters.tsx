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
};

const deadlineOptions = [
  { value: "all", label: "Todos os prazos" },
  { value: "overdue", label: "Somente atrasados" },
  { value: "done", label: "Somente concluidos" },
  { value: "pending", label: "Somente pendentes" },
];

const statusOptions = [
  { value: "all", label: "Todos os status" },
  { value: "done", label: "Concluidas" },
  { value: "pending", label: "Em andamento" },
  { value: "overdue", label: "Atrasadas" },
  { value: "unknown", label: "Sem status" },
];

const periodOptions = [
  { value: "all", label: "Todo o periodo" },
  { value: "7d", label: "Ultimos 7 dias" },
  { value: "30d", label: "Ultimos 30 dias" },
  { value: "90d", label: "Ultimos 90 dias" },
  { value: "custom", label: "Personalizado" },
];

const fieldBaseClass =
  "h-11 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 text-sm text-white outline-none transition hover:border-indigo-400/70 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";
const selectBaseClass = `task-select ${fieldBaseClass} pr-10 appearance-none`;

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
}: TaskFiltersProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2 sm:gap-3">
        <div className="relative flex items-center">
          <input
            value={search}
            ref={searchRef}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome, consultor ou projeto..."
            className={`${fieldBaseClass} pl-11 pr-3 ring-2 ring-transparent focus-visible:outline-none`}
          />
          <svg
            className="pointer-events-none absolute left-4 h-5 w-5 text-slate-500"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden
          >
            <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2" />
            <path
              d="m14 14 4 4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div className="relative">
          <select
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
            className={selectBaseClass}
          >
            {deadlineOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <svg
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden
          >
            <path d="m6 8 4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div className="relative">
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className={selectBaseClass}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <svg
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden
          >
            <path d="m6 8 4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div className="relative">
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            className={selectBaseClass}
          >
            {periodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <svg
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden
          >
            <path d="m6 8 4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div className="relative">
          <select
            value={consultant}
            onChange={(event) => setConsultant(event.target.value)}
            className={selectBaseClass}
          >
            <option value="all">Todos os consultores</option>
            {consultantOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <svg
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden
          >
            <path d="m6 8 4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div className="relative">
          <select
            value={project}
            onChange={(event) => setProject(event.target.value)}
            disabled={projectDisabled}
            className={`${selectBaseClass} disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <option value="all">Todos os projetos</option>
            {projectOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <svg
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden
          >
            <path d="m6 8 4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>


      {period === "custom" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative flex items-center">
            <input
              id="date-from"
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              placeholder="De"
              className={`${fieldBaseClass} appearance-none`}
            />
          </div>
          <div className="relative flex items-center">
            <input
              id="date-to"
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              placeholder="Até"
              className={`${fieldBaseClass} appearance-none`}
            />
          </div>
        </div>
      )}

    </div>
  );
}
