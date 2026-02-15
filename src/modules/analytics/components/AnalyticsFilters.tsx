import { useState } from "react";
import { Filter, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type AnalyticsFilterState = {
  period: "30d" | "90d" | "180d" | "all";
  status: "all" | "done" | "pending" | "overdue";
  consultant: string; // "" = all
};

type Props = {
  filters: AnalyticsFilterState;
  onChange: (filters: AnalyticsFilterState) => void;
  consultants: string[];
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

export default function AnalyticsFilters({ filters, onChange, consultants }: Props) {
  const [expanded, setExpanded] = useState(false);

  const activeCount =
    (filters.period !== "180d" ? 1 : 0) +
    (filters.status !== "all" ? 1 : 0) +
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
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
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

              {/* Consultant */}
              {consultants.length > 1 && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Consultor</label>
                  <select
                    value={filters.consultant}
                    onChange={(e) => onChange({ ...filters, consultant: e.target.value })}
                    className="h-8 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 text-[11px] font-semibold text-white/70 outline-none transition focus:border-[hsl(262_83%_58%/0.5)]"
                  >
                    <option value="">Todos</option>
                    {consultants.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Reset */}
              {activeCount > 0 && (
                <button
                  onClick={() => onChange({ period: "180d", status: "all", consultant: "" })}
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
