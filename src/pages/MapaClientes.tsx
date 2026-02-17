import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Building2, Users, Activity, Search, Wifi } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { usePageSEO } from "@/hooks/usePageSEO";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useTasks } from "@/modules/tasks/api/useTasks";

// Simplified Brazil state boundaries for a more realistic map
const BRAZIL_STATES: { id: string; path: string }[] = [
  // Norte
  { id: "AM", path: "M120,80 L180,60 L220,70 L240,90 L230,130 L200,150 L160,140 L130,120 Z" },
  { id: "PA", path: "M220,70 L290,55 L330,75 L340,110 L310,140 L270,145 L240,130 L230,130 L240,90 Z" },
  { id: "RR", path: "M160,30 L200,25 L220,50 L200,60 L180,60 L160,50 Z" },
  { id: "AP", path: "M290,30 L320,25 L335,45 L330,65 L310,60 L290,55 Z" },
  { id: "TO", path: "M270,145 L300,140 L310,140 L310,200 L290,220 L270,210 L265,180 Z" },
  { id: "RO", path: "M160,140 L200,150 L210,170 L200,195 L170,195 L150,175 Z" },
  { id: "AC", path: "M100,140 L130,120 L160,140 L150,175 L120,175 L100,160 Z" },
  // Nordeste
  { id: "MA", path: "M310,100 L340,110 L360,100 L370,120 L350,150 L320,155 L310,140 Z" },
  { id: "PI", path: "M320,155 L350,150 L360,160 L355,200 L330,210 L315,195 Z" },
  { id: "CE", path: "M360,100 L390,95 L400,115 L390,140 L370,145 L360,130 L360,120 Z" },
  { id: "RN", path: "M390,95 L415,100 L410,115 L400,115 Z" },
  { id: "PB", path: "M390,120 L415,118 L410,135 L395,135 Z" },
  { id: "PE", path: "M370,145 L415,140 L410,158 L380,160 L360,160 Z" },
  { id: "AL", path: "M395,160 L415,158 L412,172 L398,170 Z" },
  { id: "SE", path: "M390,172 L410,172 L408,185 L392,182 Z" },
  { id: "BA", path: "M315,195 L355,200 L380,190 L395,200 L400,230 L380,270 L350,290 L320,280 L300,250 L290,220 Z" },
  // Centro-Oeste
  { id: "MT", path: "M170,195 L200,195 L230,180 L265,180 L270,210 L260,250 L230,265 L195,260 L175,235 Z" },
  { id: "MS", path: "M195,260 L230,265 L240,290 L230,320 L205,325 L185,305 L180,280 Z" },
  { id: "GO", path: "M260,250 L290,220 L300,250 L310,270 L300,295 L275,305 L255,295 L240,290 L245,270 Z" },
  { id: "DF", path: "M290,260 L300,258 L302,268 L292,268 Z" },
  // Sudeste
  { id: "MG", path: "M300,250 L320,280 L350,290 L375,300 L370,330 L340,340 L310,330 L290,320 L275,305 L300,295 Z" },
  { id: "ES", path: "M375,300 L395,305 L390,330 L370,330 Z" },
  { id: "RJ", path: "M340,340 L370,330 L385,340 L375,355 L350,355 Z" },
  { id: "SP", path: "M240,290 L275,305 L310,330 L340,340 L330,360 L295,370 L265,355 L240,335 L230,320 Z" },
  // Sul
  { id: "PR", path: "M230,320 L265,355 L275,375 L250,390 L225,385 L210,365 L205,340 Z" },
  { id: "SC", path: "M250,390 L275,375 L285,395 L265,410 L245,405 Z" },
  { id: "RS", path: "M225,385 L250,390 L265,410 L260,440 L235,455 L210,445 L200,420 L210,400 Z" },
];

const STATUS_CONFIG = {
  active: { color: "hsl(160 84% 39%)", label: "Ativo", badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  warning: { color: "hsl(38 92% 50%)", label: "Atenção", badge: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  inactive: { color: "hsl(0 84% 60%)", label: "Inativo", badge: "bg-red-500/20 text-red-400 border-red-500/30" },
};

function toSvg(lat: number, lng: number) {
  const minLat = -34, maxLat = 6, minLng = -75, maxLng = -33;
  const x = ((lng - minLng) / (maxLng - minLng)) * 320 + 90;
  const y = ((maxLat - lat) / (maxLat - minLat)) * 440 + 15;
  return { x, y };
}

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
      transition={{ delay: 1.2 + index * 0.1, type: "spring", stiffness: 200, damping: 15 }}
      style={{ cursor: "pointer" }}
      onClick={onSelect}
    >
      {/* Outer pulse */}
      <motion.circle
        cx={x} cy={y} r={selected ? 18 : 12}
        fill="none"
        stroke={config.color}
        strokeWidth={1}
        opacity={0.25}
        animate={{ r: selected ? [18, 25, 18] : [12, 17, 12], opacity: [0.25, 0.05, 0.25] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
      />
      {/* Inner glow */}
      <circle cx={x} cy={y} r={selected ? 10 : 7} fill={config.color} fillOpacity={0.08} />
      {/* Main dot */}
      <motion.circle
        cx={x} cy={y}
        r={selected ? 5 : 3.5}
        fill={config.color}
        stroke="hsl(222 47% 5%)"
        strokeWidth={1.5}
        whileHover={{ r: 7 }}
        filter="url(#mapGlow)"
      />
      {/* Label on select */}
      {selected && (
        <motion.foreignObject
          x={x - 70} y={y - 38} width={140} height={30}
          initial={{ opacity: 0, y: y - 28 }}
          animate={{ opacity: 1, y: y - 38 }}
        >
          <div className="flex items-center justify-center">
            <span className="rounded-lg bg-card/95 border border-border/30 px-2.5 py-1 text-[10px] font-semibold text-foreground backdrop-blur-md text-center truncate max-w-[130px] shadow-lg shadow-black/40">
              {client.name} • {client.tasks} tarefas
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
              <Input placeholder="Buscar projeto..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-56 bg-card/50 border-border/20" />
            </div>
            <div className="flex gap-1.5">
              {(["all", "active", "warning", "inactive"] as const).map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${statusFilter === s ? "bg-primary/20 text-primary border border-primary/30" : "bg-card/30 text-muted-foreground border border-border/15 hover:bg-card/60"}`}>
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
              <div className="flex items-center gap-3 rounded-2xl bg-card/40 border border-border/15 backdrop-blur-xl p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${kpi.color}12` }}>
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
            <div className="rounded-2xl bg-card/25 border border-border/15 backdrop-blur-xl overflow-hidden p-5">
              <svg viewBox="0 0 500 480" className="w-full h-auto" style={{ maxHeight: "68vh" }}>
                <defs>
                  <filter id="mapGlow">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <linearGradient id="stateGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="hsl(234 89% 64%)" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="hsl(280 70% 55%)" stopOpacity="0.03" />
                  </linearGradient>
                </defs>

                {/* State boundaries */}
                {BRAZIL_STATES.map((state, i) => (
                  <motion.path
                    key={state.id}
                    d={state.path}
                    fill="url(#stateGrad)"
                    stroke="hsl(234 89% 64%)"
                    strokeWidth="0.6"
                    strokeOpacity="0.2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 + i * 0.03, duration: 0.5 }}
                  />
                ))}

                {/* Connection lines */}
                {filtered.slice(0, -1).map((c, i) => {
                  const next = filtered[i + 1];
                  const from = toSvg(c.lat, c.lng);
                  const to = toSvg(next.lat, next.lng);
                  const mx = (from.x + to.x) / 2;
                  const my = (from.y + to.y) / 2 - 15;
                  return (
                    <motion.path
                      key={`line-${c.id}-${next.id}`}
                      d={`M${from.x},${from.y} Q${mx},${my} ${to.x},${to.y}`}
                      fill="none"
                      stroke="hsl(234 89% 64%)"
                      strokeOpacity="0.1"
                      strokeWidth="0.7"
                      strokeDasharray="4 3"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ delay: 1.0 + i * 0.06, duration: 0.8 }}
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
                    <MapPin className="h-10 w-10 text-muted-foreground/20 mb-3" />
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
                      className={`cursor-pointer rounded-xl border p-3.5 transition-all ${selectedId === c.id ? "bg-primary/10 border-primary/30 shadow-lg shadow-primary/10" : "bg-card/25 border-border/15 hover:bg-card/50"}`}
                    >
                      <div className="flex items-start justify-between">
                        <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
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
