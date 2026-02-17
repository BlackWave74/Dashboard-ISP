import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Building2, Users, Activity, Search, Wifi } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { usePageSEO } from "@/hooks/usePageSEO";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useTasks } from "@/modules/tasks/api/useTasks";

// More realistic Brazil outline path
const BRAZIL_OUTLINE = "M290,25 L310,20 L330,25 L340,45 L350,60 L370,70 L395,65 L420,70 L430,85 L420,100 L430,120 L420,140 L430,155 L420,170 L415,185 L400,200 L395,220 L400,240 L390,260 L380,280 L375,300 L385,320 L380,340 L370,350 L350,360 L330,370 L300,380 L275,385 L260,420 L250,445 L235,460 L215,455 L200,435 L205,410 L215,395 L210,380 L200,360 L195,340 L190,315 L175,290 L160,265 L155,240 L140,215 L135,195 L120,180 L100,170 L85,155 L90,135 L110,120 L140,100 L155,75 L170,55 L185,40 L210,30 L240,25 L260,22 Z";

// Brazilian state approximate centers for labels
const BRAZIL_REGIONS = [
  { id: "N", path: "M140,50 L200,35 L250,30 L290,25 L340,45 L345,60 L340,85 L310,100 L280,110 L250,105 L220,95 L195,100 L170,110 L145,100 L120,120 L100,130 L90,110 L110,80 L140,60 Z", label: "Norte" },
  { id: "NE", path: "M310,100 L340,85 L370,70 L395,65 L420,70 L430,85 L420,100 L430,120 L420,140 L430,155 L420,170 L415,185 L400,200 L395,220 L380,230 L350,240 L320,230 L300,210 L290,180 L280,150 L280,125 Z", label: "Nordeste" },
  { id: "CO", path: "M195,140 L250,130 L280,140 L300,160 L300,210 L290,230 L270,245 L250,260 L230,270 L210,260 L195,240 L180,220 L170,195 L175,165 Z", label: "Centro-Oeste" },
  { id: "SE", path: "M250,260 L290,250 L320,260 L350,270 L380,280 L385,310 L380,335 L360,350 L340,360 L310,365 L280,360 L255,345 L240,325 L230,300 L235,280 Z", label: "Sudeste" },
  { id: "S", path: "M230,350 L260,345 L280,365 L275,390 L265,420 L255,445 L235,460 L215,450 L200,430 L205,405 L210,385 L200,365 L210,355 Z", label: "Sul" },
];

const STATUS_CONFIG = {
  active: { color: "hsl(160 84% 39%)", label: "Ativo", badge: "bg-emerald-500/15 text-emerald-400" },
  warning: { color: "hsl(38 92% 50%)", label: "Atenção", badge: "bg-amber-500/15 text-amber-400" },
  inactive: { color: "hsl(0 84% 60%)", label: "Inativo", badge: "bg-red-500/15 text-red-400" },
};

function toSvg(lat: number, lng: number) {
  const minLat = -34, maxLat = 6, minLng = -75, maxLng = -33;
  const x = ((lng - minLng) / (maxLng - minLng)) * 350 + 70;
  const y = ((maxLat - lat) / (maxLat - minLat)) * 450 + 10;
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
        opacity={0.3}
        animate={{ r: selected ? [18, 28, 18] : [12, 18, 12], opacity: [0.3, 0.05, 0.3] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
      />
      {/* Inner glow */}
      <circle cx={x} cy={y} r={selected ? 12 : 8} fill={config.color} fillOpacity={0.06} />
      {/* Main dot */}
      <motion.circle
        cx={x} cy={y}
        r={selected ? 5.5 : 4}
        fill={config.color}
        stroke="hsl(222 47% 5%)"
        strokeWidth={1.5}
        whileHover={{ r: 7 }}
        filter="url(#mapGlow)"
      />
      {/* Label on select */}
      {selected && (
        <motion.foreignObject
          x={x - 75} y={y - 42} width={150} height={34}
          initial={{ opacity: 0, y: y - 30 }}
          animate={{ opacity: 1, y: y - 42 }}
        >
          <div className="flex items-center justify-center">
            <span className="rounded-lg px-3 py-1.5 text-[10px] font-bold text-foreground backdrop-blur-xl text-center truncate max-w-[140px] shadow-xl" style={{ background: "hsl(222 40% 8% / 0.95)", border: "1px solid hsl(234 89% 64% / 0.15)" }}>
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

      <div className="relative z-10 mx-auto w-full max-w-[1400px] space-y-6 px-6 pt-6 md:px-10 pb-16">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15">
              <MapPin className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Mapa de Clientes</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Distribuição geográfica dos projetos ativos</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar projeto..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-56 bg-card/50 border-primary/10 focus:border-primary/30" />
            </div>
            <div className="flex gap-1.5">
              {(["all", "active", "warning", "inactive"] as const).map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${statusFilter === s ? "bg-primary/15 text-primary ring-1 ring-primary/25" : "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"}`}>
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
              <div className="flex items-center gap-3 rounded-2xl bg-card/30 backdrop-blur-xl p-4" style={{ border: "1px solid hsl(234 89% 64% / 0.08)" }}>
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
            <div className="rounded-2xl bg-card/20 backdrop-blur-xl overflow-hidden p-6" style={{ border: "1px solid hsl(234 89% 64% / 0.08)" }}>
              <svg viewBox="0 0 520 500" className="w-full h-auto" style={{ maxHeight: "68vh" }}>
                <defs>
                  <filter id="mapGlow">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <radialGradient id="mapBg" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="hsl(234 89% 64%)" stopOpacity="0.04" />
                    <stop offset="100%" stopColor="transparent" />
                  </radialGradient>
                </defs>

                {/* Background glow */}
                <circle cx="260" cy="250" r="200" fill="url(#mapBg)" />

                {/* Region fills */}
                {BRAZIL_REGIONS.map((region, i) => (
                  <motion.path
                    key={region.id}
                    d={region.path}
                    fill="hsl(234 89% 64%)"
                    fillOpacity="0.04"
                    stroke="hsl(234 89% 64%)"
                    strokeWidth="0.8"
                    strokeOpacity="0.15"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
                  />
                ))}

                {/* Main outline */}
                <motion.path
                  d={BRAZIL_OUTLINE}
                  fill="none"
                  stroke="hsl(234 89% 64%)"
                  strokeWidth="1.2"
                  strokeOpacity="0.25"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 2, ease: "easeInOut" }}
                />

                {/* Connection lines */}
                {filtered.slice(0, -1).map((c, i) => {
                  const next = filtered[i + 1];
                  const from = toSvg(c.lat, c.lng);
                  const to = toSvg(next.lat, next.lng);
                  const mx = (from.x + to.x) / 2;
                  const my = (from.y + to.y) / 2 - 20;
                  return (
                    <motion.path
                      key={`line-${c.id}-${next.id}`}
                      d={`M${from.x},${from.y} Q${mx},${my} ${to.x},${to.y}`}
                      fill="none"
                      stroke="hsl(234 89% 64%)"
                      strokeOpacity="0.08"
                      strokeWidth="0.8"
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
            <h2 className="text-sm font-bold text-foreground px-1">Projetos ({filtered.length})</h2>
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
                      className={`cursor-pointer rounded-xl p-3.5 transition-all ${selectedId === c.id ? "bg-primary/10 ring-1 ring-primary/25 shadow-lg shadow-primary/10" : "bg-card/20 hover:bg-card/40"}`}
                      style={{ border: "1px solid hsl(234 89% 64% / 0.06)" }}
                    >
                      <div className="flex items-start justify-between">
                        <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                        <Badge variant="outline" className={`text-[10px] shrink-0 border-0 ${config.badge}`}>{config.label}</Badge>
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
