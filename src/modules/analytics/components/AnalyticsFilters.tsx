import { useState, useRef, useEffect } from "react";
import { Search, X, Filter, ChevronDown, User, FolderKanban, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ProjectAnalytics } from "../types";

export type AnalyticsFilterState = {
  period: "30d" | "90d" | "180d" | "all";
  status: "all" | "done" | "pending" | "overdue";
  projectIds: number[];
  consultant: string;
};

type ProjectOption = { id: number; name: string };

type Props = {
  filters: AnalyticsFilterState;
  onChange: (filters: AnalyticsFilterState) => void;
  projects: ProjectOption[];
  consultants: string[];
  isAdmin: boolean;
  myProjectIds?: Set<number>;
  hideFilters?: boolean;
};

const PERIODS: { value: string; label: string }[] = [
  { value: "30d", label: "30 dias" },
  { value: "90d", label: "90 dias" },
  { value: "180d", label: "180 dias" },
  { value: "all", label: "Tudo" },
];

const STATUSES: { key: AnalyticsFilterState["status"]; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "done", label: "Concluídas" },
  { key: "pending", label: "Em andamento" },
  { key: "overdue", label: "Atrasadas" },
];

/* ── Custom dropdown with search/autocomplete ── */
function CustomSelect({
  value,
  onChange,
  options,
  placeholder,
  icon: Icon,
  mineIds,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  icon?: React.ComponentType<{ className?: string }>;
  mineIds?: Set<string>;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const selected = options.find((o) => o.value === value);

  const filtered = search.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  const sortedOptions = mineIds
    ? [...filtered].sort((a, b) => {
        const aM = mineIds.has(a.value) ? 0 : 1;
        const bM = mineIds.has(b.value) ? 0 : 1;
        return aM - bM || a.label.localeCompare(b.label);
      })
    : filtered;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex h-9 min-w-[170px] items-center gap-2 rounded-xl border px-3 text-[12px] font-semibold transition-all ${
          value
            ? "border-[hsl(262_83%_58%/0.4)] bg-[hsl(262_83%_58%/0.1)] text-white/80"
            : "border-white/[0.08] bg-[hsl(260_30%_12%)] text-white/50"
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
            className="absolute right-0 top-full z-[200] mt-1 min-w-[240px] rounded-2xl border border-white/[0.08] shadow-xl shadow-black/50 overflow-hidden flex flex-col"
            style={{ background: "hsl(260 30% 12%)", maxHeight: "260px" }}
          >
            {/* Search input — always visible, not scrollable */}
            {options.length > 5 && (
              <div className="shrink-0 px-1.5 pt-1.5 pb-1 border-b border-white/[0.06]" style={{ background: "hsl(260 30% 12%)" }}>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-white/30" />
                  <input
                    ref={inputRef}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar..."
                    className="h-8 w-full rounded-full border border-white/[0.08] bg-white/[0.04] pl-7 pr-3 text-[11px] text-white/70 outline-none focus:border-[hsl(262_83%_58%/0.4)] placeholder:text-white/25"
                  />
                </div>
              </div>
            )}
            {/* Scrollable list area */}
            <div className="overflow-y-auto flex-1 p-1.5">
              {/* "All" option */}
              <button
                onClick={() => { onChange(""); setOpen(false); setSearch(""); }}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-[12px] font-semibold transition ${
                  !value ? "bg-[hsl(262_83%_58%/0.15)] text-white/90" : "text-white/40 hover:bg-white/[0.05] hover:text-white/60"
                }`}
              >
                {placeholder}
              </button>
              {/* Mine first if provided */}
              {mineIds && sortedOptions.length > 0 && (
                <>
                  {sortedOptions.some(o => mineIds.has(o.value)) && (
                    <div className="px-3 pt-2 pb-1 text-[9px] font-bold uppercase tracking-widest text-[hsl(262_83%_58%/0.6)]">Projetos que faço parte</div>
                  )}
                  {sortedOptions.filter(o => mineIds.has(o.value)).map((o) => (
                    <button
                      key={o.value}
                      onClick={() => { onChange(o.value); setOpen(false); setSearch(""); }}
                      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-[12px] font-semibold transition ${
                        value === o.value
                          ? "bg-[hsl(262_83%_58%/0.15)] text-white/90"
                          : "text-white/50 hover:bg-white/[0.05] hover:text-white/70"
                      }`}
                    >
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(262_83%_58%)]" />
                      <span className="truncate">{o.label}</span>
                    </button>
                  ))}
                  {sortedOptions.some(o => !mineIds.has(o.value)) && (
                    <div className="px-3 pt-3 pb-1 text-[9px] font-bold uppercase tracking-widest text-white/20">Outros</div>
                  )}
                  {sortedOptions.filter(o => !mineIds.has(o.value)).map((o) => (
                    <button
                      key={o.value}
                      onClick={() => { onChange(o.value); setOpen(false); setSearch(""); }}
                      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-[12px] font-semibold transition ${
                        value === o.value
                          ? "bg-[hsl(262_83%_58%/0.15)] text-white/90"
                          : "text-white/40 hover:bg-white/[0.05] hover:text-white/60"
                      }`}
                    >
                      <span className="truncate">{o.label}</span>
                    </button>
                  ))}
                </>
              )}
              {/* Normal list when no mineIds */}
              {!mineIds && sortedOptions.map((o) => (
                <button
                  key={o.value}
                  onClick={() => { onChange(o.value); setOpen(false); setSearch(""); }}
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-[12px] font-semibold transition ${
                    value === o.value
                      ? "bg-[hsl(262_83%_58%/0.15)] text-white/90"
                      : "text-white/40 hover:bg-white/[0.05] hover:text-white/60"
                  }`}
                >
                  <span className="truncate">{o.label}</span>
                </button>
              ))}

              {sortedOptions.length === 0 && search.trim() && (
                <p className="px-3 py-4 text-center text-[11px] text-white/30">Nenhum resultado</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AnalyticsFilters({ filters, onChange, projects, consultants, isAdmin, myProjectIds, hideFilters = false }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const activeCount =
    (filters.period !== "180d" ? 1 : 0) +
    (filters.status !== "all" ? 1 : 0) +
    (filters.projectIds.length > 0 ? 1 : 0) +
    (filters.consultant ? 1 : 0);

  // Search filters project list inline
  const handleSearchSelect = (projectId: number | null) => {
    onChange({ ...filters, projectId });
  };

  // Filter projects by search
  const searchResults = searchQuery.trim()
    ? projects.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  return (
    <div className="space-y-2 flex flex-col items-center">
      {/* Search + Filter toggle side by side (same as Tarefas) */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {/* Search field */}
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-white/30" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar projeto ou cliente..."
            className="h-[38px] w-[320px] rounded-xl border border-white/[0.06] bg-white/[0.03] pl-9 pr-7 text-[13px] font-semibold text-white/50 placeholder:text-white/30 outline-none transition hover:border-white/[0.12] hover:text-white/70 focus:border-[hsl(262_83%_58%/0.4)] focus:bg-[hsl(262_83%_58%/0.1)] focus:text-[hsl(262_83%_58%)]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => { setSearchQuery(""); handleSearchSelect(null); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          {/* Search dropdown */}
          {searchQuery.trim() && searchResults.length > 0 && (
            <div
              className="absolute left-0 top-full z-[100] mt-1 max-h-60 w-full min-w-[240px] overflow-auto rounded-2xl border border-white/[0.08] p-1.5 shadow-xl shadow-black/40"
              style={{ background: "hsl(260 30% 12%)" }}
            >
              {searchResults.slice(0, 10).map((p) => (
                <button
                  key={p.id}
                  onClick={() => { handleSearchSelect(p.id); setSearchQuery(p.name); }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-[12px] font-semibold text-white/50 hover:bg-white/[0.05] hover:text-white/70 transition"
                >
                  <FolderKanban className="h-3.5 w-3.5 shrink-0 opacity-40" />
                  <span className="truncate">{p.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filter toggle — hidden for non-admin users */}
        {!hideFilters && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl border px-4 py-[9px] text-[13px] font-semibold transition ${
              expanded
                ? "border-[hsl(262_83%_58%/0.4)] bg-[hsl(262_83%_58%/0.1)] text-[hsl(262_83%_58%)]"
                : "border-white/[0.06] bg-white/[0.03] text-white/50 hover:border-white/[0.12] hover:text-white/70"
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            Filtros
            {activeCount > 0 && (
              <span className="rounded-full bg-[hsl(262_83%_58%)] px-1.5 py-0.5 text-[10px] font-bold text-white">
                {activeCount}
              </span>
            )}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        )}

        {activeCount > 0 && (
          <button
            onClick={() => { onChange({ period: "180d", status: "all", projectIds: [], consultant: "" }); setSearchQuery(""); }}
            className="text-[11px] font-semibold text-white/30 underline decoration-white/10 hover:text-white/50 transition"
          >
            Limpar filtros
          </button>
        )}
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
                <div className="flex gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1">
                  {STATUSES.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => onChange({ ...filters, status: s.key })}
                      className={`rounded-xl px-3 py-1.5 text-[12px] font-semibold transition-all ${
                        filters.status === s.key
                          ? "bg-[hsl(262_83%_58%)] text-white shadow"
                          : "text-white/30 hover:text-white/50"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Period dropdown (same as Tarefas) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Período</label>
                <CustomSelect
                  value={filters.period}
                  onChange={(v) => onChange({ ...filters, period: v as AnalyticsFilterState["period"] })}
                  options={PERIODS}
                  placeholder="Todos períodos"
                  icon={Calendar}
                />
              </div>

              {/* Project dropdown */}
              {projects.length > 1 && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Projeto</label>
                  <CustomSelect
                    value={filters.projectId !== null ? String(filters.projectId) : ""}
                    onChange={(v) => onChange({ ...filters, projectId: v ? Number(v) : null })}
                    options={projects.map((p) => ({ value: String(p.id), label: p.name }))}
                    placeholder="Todos os projetos"
                    icon={FolderKanban}
                    mineIds={myProjectIds ? new Set([...myProjectIds].map(String)) : undefined}
                  />
                </div>
              )}

              {/* Consultant filter */}
              {(isAdmin ? consultants.length > 1 : consultants.length > 0) && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Consultor</label>
                  <CustomSelect
                    value={filters.consultant}
                    onChange={(v) => onChange({ ...filters, consultant: v })}
                    options={consultants.map((c) => ({ value: c, label: c }))}
                    
                    placeholder="Todos os consultores"
                    icon={User}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
