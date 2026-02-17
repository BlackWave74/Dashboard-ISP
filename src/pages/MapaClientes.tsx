import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Building2, Users, Activity, Search, Wifi } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { usePageSEO } from "@/hooks/usePageSEO";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useTasks } from "@/modules/tasks/api/useTasks";

// Brazil SVG outline path (simplified)
const BRAZIL_PATH = "M280,30 C290,28 310,35 320,40 L340,42 L355,48 L370,55 L385,52 L400,58 L410,68 L420,72 L430,85 L425,100 L430,115 L440,125 L445,140 L450,160 L445,175 L440,190 L435,210 L430,225 L425,245 L415,260 L405,275 L395,290 L385,305 L375,320 L360,335 L345,345 L330,355 L315,365 L300,375 L285,385 L270,395 L255,400 L240,395 L225,385 L215,370 L210,355 L200,340 L195,320 L190,300 L185,280 L178,260 L170,240 L162,225 L155,210 L150,195 L148,175 L152,155 L158,135 L165,120 L175,105 L185,90 L195,78 L210,65 L225,55 L245,45 L260,38 Z";

const STATUS_CONFIG = {
  active: { color: "hsl(160 84% 39%)", label: "Ativo", badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  warning: { color: "hsl(38 92% 50%)", label: "Atenção", badge: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  inactive: { color: "hsl(0 84% 60%)", label: "Inativo", badge: "bg-red-500/20 text-red-400 border-red-500/30" },
};

// Convert lat/lng to SVG position
function toSvg(lat: number, lng: number) {
  const minLat = -34, maxLat = 6, minLng = -75, maxLng = -33;
  const x = ((lng - minLng) / (maxLng - minLng)) * 320 + 90;
  const y = ((maxLat - lat) / (maxLat - minLat)) * 380 + 20;
  return { x, y };
}

// Extract unique clients from tasks projects
function useClientLocations() {
  const { session } = useAuth();
  const { tasks } = useTasks({ accessToken: session?.accessToken, period: "all" });

  return useMemo(() => {
    const projectMap = new Map<string, { name: string; taskCount: number; hasOverdue: boolean }>();

    tasks.forEach((t) => {
      const project = String(t.projects?.name ?? t.project_name ?? t.project ?? "").trim();
      if (!project) return;
      const statusRaw = String(t.status ?? "").toLowerCase();
      const isDone = ["5", "done", "concluido", "concluído"].includes(statusRaw);
      const isOverdue = !isDone && t.due_date && new Date(String(t.due_date)) < new Date();

      if (!projectMap.has(project)) {
        projectMap.set(project, { name: project, taskCount: 0, hasOverdue: false });
      }
      const entry = projectMap.get(project)!;
      entry.taskCount++;
      if (isOverdue) entry.hasOverdue = true;
    });

    // Distribute across Brazil coordinates for visual representation
    const coords = [
      { lat: -23.55, lng: -46.63 }, { lat: -22.91, lng: -43.17 }, { lat: -19.92, lng: -43.94 },
      { lat: -25.43, lng: -49.27 }, { lat: -30.03, lng: -51.23 }, { lat: -12.97, lng: -38.51 },
      { lat: -8.05, lng: -34.87 }, { lat: -16.68, lng: -49.25 }, { lat: -3.12, lng: -60.02 },
      { lat: -15.79, lng: -47.88 }, { lat: -27.59, lng: -48.55 }, { lat: -2.5, lng: -44.28 },
      { lat: -5.79, lng: -35.21 }, { lat: -10.91, lng: -37.07 }, { lat: -1.46, lng: -48.50 },
    ];

    return Array.from(projectMap.values()).map((p, i) => ({
      id: i + 1,
      name: p.name,
      tasks: p.taskCount,
      status: p.hasOverdue ? "warning" as const : p.taskCount > 0 ? "active" as const : "inactive" as const,
      ...coords[i % coords.length],
    }));
  }, [tasks]);
}

function MapDot({ client, index, selected, onSelect }: {
  client: { id: number; name: string; lat: number; lng: number; status: "active" | "warning" | "inactive"; tasks: number };
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const { x, y } = toSvg(client.lat, client.lng);
  const config = STATUS_CONFIG[client.status];

  return (
    <motion.g
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.6 + index * 0.08, type: "spring", stiffness: 200, damping: 15 }}
      style={{ cursor: "pointer" }}
      onClick={onSelect}
    >
      {/* Pulse ring */}
      <motion.circle
        cx={x} cy={y} r={selected ? 16 : 10}
        fill="none"
        stroke={config.color}
        strokeWidth={1}
        opacity={0.3}
        animate={{ r: selected ? [16, 22, 16] : [10, 14, 10], opacity: [0.3, 0.08, 0.3] }}
        transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
      />
      {/* Main dot */}
      <motion.circle
        cx={x} cy={y}
        r={selected ? 6 : 4}
        fill={config.color}
        stroke="hsl(222 47% 5%)"
        strokeWidth={2}
        whileHover={{ r: 8 }}
        filter="url(#mapGlow)"
      />
      {/* Label on select */}
      {selected && (
        <motion.foreignObject
          x={x - 60} y={y - 40} width={120} height={32}
          initial={{ opacity: 0, y: y - 30 }}
          animate={{ opacity: 1, y: y - 40 }}
        >
          <div className="flex items-center justify-center">
            <span className="rounded-lg bg-card/90 border border-border/40 px-2 py-0.5 text-[10px] font-semibold text-foreground backdrop-blur-sm text-center truncate max-w-[110px]">
              {client.name}
            </span>
          </div>
        </motion.foreignObject>
      )}
    </motion.g>
  );
}

export default function MapaClientes() {
  usePageSEO("/mapa");
  const clients = useClientLocations();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [clients, search, statusFilter]);

  const stats = useMemo(() => ({
    total: clients.length,
    active: clients.filter((c) => c.status === "active").length,
    warning: clients.filter((c) => c.status === "warning").length,
    tasks: clients.reduce((s, c) => s + c.tasks, 0),
  }), [clients]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0" style={{
        background: "linear-gradient(180deg, hsl(270 60% 10%) 0%, hsl(250 50% 8%) 25%, hsl(234 45% 7%) 50%, hsl(260 40% 9%) 75%, hsl(234 45% 6%) 100%)",
      }} />
      <div className="pointer-events-none absolute top-[20%] left-[-5%] h-[500px] w-[500px] rounded-full opacity-12 blur-[140px]" style={{ background: "radial-gradient(circle, hsl(160 84% 39%), transparent 70%)" }} />
      <div className="pointer-events-none absolute bottom-[10%] right-[-5%] h-[400px] w-[400px] rounded-full opacity-8 blur-[120px]" style={{ background: "radial-gradient(circle, hsl(234 89% 50%), transparent 70%)" }} />

      <div className="relative z-10 mx-auto w-full max-w-[1400px] space-y-6 px-6 pt-6 md:px-10 pb-16">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <MapPin className="h-6 w-6 text-primary" />
              Mapa de Clientes
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Distribuição geográfica dos projetos ativos</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar projeto..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-56 bg-card/50 border-border/30" />
            </div>
            <div className="flex gap-1.5">
              {(["all", "active", "warning", "inactive"] as const).map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${statusFilter === s ? "bg-primary/20 text-primary border border-primary/30" : "bg-card/30 text-muted-foreground border border-border/20 hover:bg-card/60"}`}>
                  {s === "all" ? "Todos" : STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Building2, label: "Total Projetos", value: stats.total, color: "hsl(234 89% 64%)" },
            { icon: Activity, label: "Ativos", value: stats.active, color: "hsl(160 84% 39%)" },
            { icon: Wifi, label: "Atenção", value: stats.warning, color: "hsl(38 92% 50%)" },
            { icon: Users, label: "Tarefas", value: stats.tasks, color: "hsl(280 70% 55%)" },
          ].map((kpi, i) => (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <div className="flex items-center gap-3 rounded-2xl bg-card/40 border border-border/20 backdrop-blur-xl p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${kpi.color}15` }}>
                  <kpi.icon className="h-5 w-5" style={{ color: kpi.color }} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className="text-xl font-bold text-foreground">{kpi.value}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Map + Details */}
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* Map */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
            <div className="rounded-2xl bg-card/30 border border-border/20 backdrop-blur-xl overflow-hidden p-4">
              <svg viewBox="0 0 500 440" className="w-full h-auto" style={{ maxHeight: "65vh" }}>
                <defs>
                  <filter id="mapGlow">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <linearGradient id="brazilGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="hsl(234 89% 64%)" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="hsl(280 70% 55%)" stopOpacity="0.06" />
                  </linearGradient>
                </defs>

                {/* Brazil outline */}
                <motion.path
                  d={BRAZIL_PATH}
                  fill="url(#brazilGrad)"
                  stroke="hsl(234 89% 64%)"
                  strokeWidth="1.5"
                  strokeOpacity="0.25"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 2, ease: "easeInOut" }}
                />

                {/* Grid overlay */}
                {Array.from({ length: 9 }).map((_, i) => (
                  <line key={`h${i}`} x1="90" y1={20 + i * 48} x2="410" y2={20 + i * 48} stroke="hsl(234 89% 64%)" strokeOpacity="0.04" strokeWidth="0.5" />
                ))}
                {Array.from({ length: 9 }).map((_, i) => (
                  <line key={`v${i}`} x1={90 + i * 40} y1="20" x2={90 + i * 40} y2="420" stroke="hsl(234 89% 64%)" strokeOpacity="0.04" strokeWidth="0.5" />
                ))}

                {/* Connection lines */}
                {filtered.slice(0, -1).map((c, i) => {
                  const next = filtered[i + 1];
                  const from = toSvg(c.lat, c.lng);
                  const to = toSvg(next.lat, next.lng);
                  return (
                    <motion.line
                      key={`line-${c.id}-${next.id}`}
                      x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                      stroke="hsl(234 89% 64%)"
                      strokeOpacity="0.08"
                      strokeWidth="0.6"
                      strokeDasharray="3 3"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ delay: 0.8 + i * 0.05, duration: 0.6 }}
                    />
                  );
                })}

                {/* Client dots */}
                {filtered.map((c, i) => (
                  <MapDot key={c.id} client={c} index={i} selected={selectedId === c.id} onSelect={() => setSelectedId(selectedId === c.id ? null : c.id)} />
                ))}
              </svg>
            </div>
          </motion.div>

          {/* Client List */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground px-1">Projetos ({filtered.length})</h2>
            <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1 scrollbar-thin">
              <AnimatePresence>
                {filtered.length === 0 ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-10">
                    <MapPin className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">Nenhum projeto encontrado</p>
                  </motion.div>
                ) : filtered.map((c, i) => {
                  const config = STATUS_CONFIG[c.status];
                  return (
                    <motion.div
                      key={c.id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => setSelectedId(selectedId === c.id ? null : c.id)}
                      className={`cursor-pointer rounded-xl border p-3.5 transition-all ${selectedId === c.id ? "bg-primary/10 border-primary/30 shadow-lg shadow-primary/10" : "bg-card/30 border-border/20 hover:bg-card/60"}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                        </div>
                        <Badge variant="outline" className={`text-[10px] shrink-0 ${config.badge}`}>{config.label}</Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">{c.tasks}</span> tarefas</span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
