import { Search, X, Filter, ChevronDown, FolderKanban, User } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
  myProjectNames?: Set<string>;
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

/* ── Custom dropdown (same style as analytics) ── */
function CustomSelect({
  value,
  onChange,
  options,
  placeholder,
  icon: Icon,
  mineSet,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  icon?: React.ComponentType<{ className?: string }>;
  mineSet?: Set<string>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find((o) => o.value === value);

  // Sort: mine first if provided
  const sortedOptions = mineSet
    ? [...options].sort((a, b) => {
        const aM = mineSet.has(a.value) ? 0 : 1;
        const bM = mineSet.has(b.value) ? 0 : 1;
        return aM - bM || a.label.localeCompare(b.label);
      })
    : options;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex h-8 min-w-[170px] items-center gap-2 rounded-lg border px-3 text-[11px] font-semibold transition-all ${
          value && value !== "all"
            ? "border-[hsl(var(--task-purple)/0.4)] bg-[hsl(var(--task-purple)/0.1)] text-white/80"
            : "border-white/[0.08] bg-[hsl(var(--task-surface))] text-white/50"
        } hover:border-white/[0.15]`}
      >
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0 opacity-50" />}
        <span className="flex-1 truncate text-left">{selected?.label || placeholder}</span>
        <ChevronDown className={`h-3 w-3 shrink-0 opacity-40 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full z-[100] mt-1 max-h-60 min-w-[220px] overflow-auto rounded-xl border border-white/[0.08] p-1 shadow-xl shadow-black/40"
            style={{ background: "hsl(260 30% 12%)" }}
          >
            <button
              onClick={() => { onChange("all"); setOpen(false); }}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-semibold transition ${
                value === "all" || !value ? "bg-[hsl(var(--task-purple)/0.15)] text-white/90" : "text-white/40 hover:bg-white/[0.05] hover:text-white/60"
              }`}
            >
              {placeholder}
            </button>

            {/* Mine first if provided */}
            {mineSet && sortedOptions.length > 0 && (
              <>
                {sortedOptions.some(o => mineSet.has(o.value)) && (
                  <div className="px-3 pt-2 pb-1 text-[9px] font-bold uppercase tracking-widest text-[hsl(var(--task-purple)/0.6)]">Projetos que faço parte</div>
                )}
                {sortedOptions.filter(o => mineSet.has(o.value)).map((o) => (
                  <button
                    key={o.value}
                    onClick={() => { onChange(o.value); setOpen(false); }}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-semibold transition ${
                      value === o.value
                        ? "bg-[hsl(var(--task-purple)/0.15)] text-white/90"
                        : "text-white/50 hover:bg-white/[0.05] hover:text-white/70"
                    }`}
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--task-purple))]" />
                    <span className="truncate">{o.label}</span>
                  </button>
                ))}
                {sortedOptions.some(o => !mineSet.has(o.value)) && (
                  <div className="px-3 pt-3 pb-1 text-[9px] font-bold uppercase tracking-widest text-white/20">Outros</div>
                )}
                {sortedOptions.filter(o => !mineSet.has(o.value)).map((o) => (
                  <button
                    key={o.value}
                    onClick={() => { onChange(o.value); setOpen(false); }}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-semibold transition ${
                      value === o.value
                        ? "bg-[hsl(var(--task-purple)/0.15)] text-white/90"
                        : "text-white/40 hover:bg-white/[0.05] hover:text-white/60"
                    }`}
                  >
                    <span className="truncate">{o.label}</span>
                  </button>
                ))}
              </>
            )}

            {/* Normal list when no mineSet */}
            {!mineSet && options.map((o) => (
              <button
                key={o.value}
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-semibold transition ${
                  value === o.value
                    ? "bg-[hsl(var(--task-purple)/0.15)] text-white/90"
                    : "text-white/40 hover:bg-white/[0.05] hover:text-white/60"
                }`}
              >
                <span className="truncate">{o.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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
  myProjectNames,
}: TaskFiltersProps) {
  const [expanded, setExpanded] = useState(false);

  const activeCount =
    (status !== "all" ? 1 : 0) +
    (period !== "all" ? 1 : 0) +
    (consultant !== "all" && consultant ? 1 : 0) +
    (project !== "all" && project ? 1 : 0) +
    (deadline !== "all" ? 1 : 0);

  return (
    <div className="space-y-2 flex flex-col items-center">
      {/* Search + Filter toggle side by side */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {/* Search field — same style as filter button */}
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-white/30" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar tarefa..."
            className="h-[38px] w-[210px] rounded-xl border border-white/[0.06] bg-white/[0.03] pl-9 pr-7 text-[13px] font-semibold text-white/50 placeholder:text-white/30 outline-none transition hover:border-white/[0.12] hover:text-white/70 focus:border-[hsl(var(--task-purple)/0.4)] focus:bg-[hsl(var(--task-purple)/0.1)] focus:text-[hsl(var(--task-purple))]"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Filter toggle */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl border px-4 py-[9px] text-[13px] font-semibold transition ${
            expanded
              ? "border-[hsl(var(--task-purple)/0.4)] bg-[hsl(var(--task-purple)/0.1)] text-[hsl(var(--task-purple))]"
              : "border-white/[0.06] bg-white/[0.03] text-white/50 hover:border-white/[0.12] hover:text-white/70"
          }`}
        >
          <Filter className="h-3.5 w-3.5" />
          Filtros
          {activeCount > 0 && (
            <span className="rounded-full bg-[hsl(var(--task-purple))] px-1.5 py-0.5 text-[10px] font-bold text-white">
              {activeCount}
            </span>
          )}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Expanded filters panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-visible w-full"
          >
            <div className="flex flex-wrap items-end justify-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 overflow-visible">
              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Status</label>
                <div className="flex gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] p-0.5">
                  {statusChips.map((chip) => (
                    <button
                      key={chip.value}
                      type="button"
                      onClick={() => setStatus(chip.value)}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
                        status === chip.value
                          ? "bg-[hsl(var(--task-purple))] text-white shadow"
                          : "text-white/30 hover:text-white/50"
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Period */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Período</label>
                <div className="flex gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] p-0.5">
                  {periodChips.map((chip) => (
                    <button
                      key={chip.value}
                      type="button"
                      onClick={() => setPeriod(chip.value)}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
                        period === chip.value
                          ? "bg-[hsl(var(--task-purple))] text-white shadow"
                          : "text-white/30 hover:text-white/50"
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Consultant dropdown */}
              {consultantOptions.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Consultor</label>
                  <CustomSelect
                    value={consultant}
                    onChange={setConsultant}
                    options={consultantOptions.map(o => ({ value: o, label: o }))}
                    placeholder="Todos consultores"
                    icon={User}
                  />
                </div>
              )}

              {/* Project dropdown */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Projeto</label>
                <CustomSelect
                  value={project}
                  onChange={setProject}
                  options={projectOptions.map(o => ({ value: o, label: o }))}
                  placeholder="Todos projetos"
                  icon={FolderKanban}
                  mineSet={myProjectNames}
                />
              </div>

              {/* Deadline filter */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Prazo</label>
                <CustomSelect
                  value={deadline}
                  onChange={setDeadline}
                  options={[
                    { value: "overdue", label: "Atrasados" },
                    { value: "done", label: "Concluídos" },
                    { value: "pending", label: "Pendentes" },
                  ]}
                  placeholder="Todos os prazos"
                />
              </div>

              {/* Custom date range */}
              {period === "custom" && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Intervalo</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="h-8 rounded-lg border border-white/[0.08] bg-[hsl(var(--task-surface))] px-2.5 text-xs text-white/70 outline-none"
                    />
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="h-8 rounded-lg border border-white/[0.08] bg-[hsl(var(--task-surface))] px-2.5 text-xs text-white/70 outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Clear filters */}
              {hasActiveFilters && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-transparent">‎</label>
                  <button
                    type="button"
                    onClick={onClearFilters}
                    className="flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 text-[11px] font-semibold text-white/40 hover:text-white/60 hover:border-white/[0.15] transition"
                  >
                    <X className="h-3 w-3" />
                    Limpar
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
