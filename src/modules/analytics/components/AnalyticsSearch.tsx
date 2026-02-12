import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import type { ProjectAnalytics } from "../types";

type Props = {
  projects: ProjectAnalytics[];
  onSelect: (project: ProjectAnalytics | null) => void;
  selected: ProjectAnalytics | null;
};

export default function AnalyticsSearch({ projects, onSelect, selected }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? projects.filter(
        (p) =>
          p.projectName.toLowerCase().includes(query.toLowerCase()) ||
          p.clientName.toLowerCase().includes(query.toLowerCase())
      )
    : projects;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative w-full sm:max-w-[340px]">
      <div className="relative flex items-center">
        <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
        <input
          value={selected ? selected.projectName : query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (selected) onSelect(null);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar projeto ou cliente..."
          className="h-9 w-full rounded-lg border border-border/50 bg-card/80 pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
        />
        {(query || selected) && (
          <button
            onClick={() => { setQuery(""); onSelect(null); setOpen(false); }}
            className="absolute right-3 text-muted-foreground hover:text-foreground transition"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && filtered.length > 0 && !selected && (
        <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-border/50 bg-card shadow-2xl max-h-[280px] overflow-y-auto styled-scrollbar">
          {filtered.slice(0, 15).map((p) => (
            <button
              key={p.projectId}
              onClick={() => { onSelect(p); setOpen(false); setQuery(""); }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted/50 transition"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{p.projectName}</p>
                <p className="truncate text-xs text-muted-foreground">{p.clientName}</p>
              </div>
              {p.isActive && (
                <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                  Ativo
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
