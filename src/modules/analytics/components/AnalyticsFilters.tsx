import { useState, useRef, useEffect } from "react";
import { Filter, ChevronDown, User, FolderKanban } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type AnalyticsFilterState = {
  period: "30d" | "90d" | "180d" | "all";
  status: "all" | "done" | "pending" | "overdue";
  projectId: number | null;
  consultant: string; // "" = all (admin only)
};

type ProjectOption = { id: number; name: string };

type Props = {
  filters: AnalyticsFilterState;
  onChange: (filters: AnalyticsFilterState) => void;
  projects: ProjectOption[];
  consultants: string[];
  isAdmin: boolean;
};

const PERIODS: { key: AnalyticsFilterState["period"]; label: string }[] = [
  { key: "30d", label: "30 dias" },
  { key: "90d", label: "90 dias" },
  { key: "180d", label: "180 dias" },
  { key: "all", label: "Tudo" },
];

const STATUSES: { key: AnalyticsFilterState["status"]; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "done", label: "Concluídas" },
  { key: "pending", label: "Em andamento" },
  { key: "overdue", label: "Atrasadas" },
];

/* ── Custom dropdown with solid background ── */
function CustomSelect({
  value,
  onChange,
  options,
  placeholder,
  icon: Icon,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  icon?: React.ComponentType<{ className?: string }>;
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

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex h-8 min-w-[180px] items-center gap-2 rounded-lg border px-3 text-[11px] font-semibold transition-all ${
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
            className="absolute left-0 top-full z-50 mt-1 max-h-60 min-w-[200px] overflow-auto rounded-xl border border-white/[0.08] p-1 shadow-xl shadow-black/40"
            style={{ background: "hsl(260 30% 12%)" }}
          >
            {/* "All" option */}
            <button
              onClick={() => { onChange(""); setOpen(false); }}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-semibold transition ${
                !value ? "bg-[hsl(262_83%_58%/0.15)] text-white/90" : "text-white/40 hover:bg-white/[0.05] hover:text-white/60"
              }`}
            >
              {placeholder}
            </button>
            {options.map((o) => (
              <button
                key={o.value}
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-semibold transition ${
                  value === o.value
                    ? "bg-[hsl(262_83%_58%/0.15)] text-white/90"
                    : "text-white/40 hover:bg-white/[0.05] hover:text-white/60"
                }`}
              >
                {o.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AnalyticsFilters({ filters, onChange, projects, consultants, isAdmin }: Props) {
  const [expanded, setExpanded] = useState(false);

  const activeCount =
    (filters.period !== "180d" ? 1 : 0) +
    (filters.status !== "all" ? 1 : 0) +
    (filters.projectId !== null ? 1 : 0) +
    (filters.consultant ? 1 : 0);

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2 text-xs font-semibold text-white/50 transition hover:border-white/[0.12] hover:text-white/70"
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

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-visible"
          >
            <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 overflow-visible">
              {/* Period */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Período</label>
                <div className="flex gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] p-0.5">
                  {PERIODS.map((p) => (
                    <button
                      key={p.key}
                      onClick={() => onChange({ ...filters, period: p.key })}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
                        filters.period === p.key
                          ? "bg-[hsl(262_83%_58%)] text-white shadow"
                          : "text-white/30 hover:text-white/50"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Status</label>
                <div className="flex gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] p-0.5">
                  {STATUSES.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => onChange({ ...filters, status: s.key })}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
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

              {/* Consultant – admin only */}
              {isAdmin && consultants.length > 1 && (
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

              {/* Project */}
              {projects.length > 1 && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Projeto</label>
                  <CustomSelect
                    value={filters.projectId !== null ? String(filters.projectId) : ""}
                    onChange={(v) => onChange({ ...filters, projectId: v ? Number(v) : null })}
                    options={projects.map((p) => ({ value: String(p.id), label: p.name }))}
                    placeholder="Todos os projetos"
                    icon={FolderKanban}
                  />
                </div>
              )}

              {/* Reset */}
              {activeCount > 0 && (
                <button
                  onClick={() => onChange({ period: "180d", status: "all", projectId: null, consultant: "" })}
                  className="text-[11px] font-semibold text-white/30 underline decoration-white/10 hover:text-white/50 transition"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
