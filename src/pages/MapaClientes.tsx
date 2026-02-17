import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Building2, Users, Activity, Search, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { usePageSEO } from "@/hooks/usePageSEO";

// Mock data — Brasil regions
const MOCK_CLIENTS = [
  { id: 1, name: "TechFibra ISP", city: "São Paulo", state: "SP", lat: -23.55, lng: -46.63, projects: 8, status: "active" as const, revenue: "R$ 45K" },
  { id: 2, name: "NetLink Telecom", city: "Rio de Janeiro", state: "RJ", lat: -22.91, lng: -43.17, projects: 5, status: "active" as const, revenue: "R$ 32K" },
  { id: 3, name: "MegaNet Fibra", city: "Belo Horizonte", state: "MG", lat: -19.92, lng: -43.94, projects: 3, status: "warning" as const, revenue: "R$ 18K" },
  { id: 4, name: "VeloCity Internet", city: "Curitiba", state: "PR", lat: -25.43, lng: -49.27, projects: 6, status: "active" as const, revenue: "R$ 38K" },
  { id: 5, name: "AltaFibra", city: "Porto Alegre", state: "RS", lat: -30.03, lng: -51.23, projects: 4, status: "active" as const, revenue: "R$ 25K" },
  { id: 6, name: "ConectaJá ISP", city: "Salvador", state: "BA", lat: -12.97, lng: -38.51, projects: 2, status: "inactive" as const, revenue: "R$ 12K" },
  { id: 7, name: "NordesteTel", city: "Recife", state: "PE", lat: -8.05, lng: -34.87, projects: 7, status: "active" as const, revenue: "R$ 41K" },
  { id: 8, name: "CentroNet", city: "Goiânia", state: "GO", lat: -16.68, lng: -49.25, projects: 3, status: "warning" as const, revenue: "R$ 20K" },
  { id: 9, name: "AmazonLink", city: "Manaus", state: "AM", lat: -3.12, lng: -60.02, projects: 2, status: "active" as const, revenue: "R$ 15K" },
  { id: 10, name: "FibraMax", city: "Brasília", state: "DF", lat: -15.79, lng: -47.88, projects: 5, status: "active" as const, revenue: "R$ 35K" },
  { id: 11, name: "PampaNet", city: "Florianópolis", state: "SC", lat: -27.59, lng: -48.55, projects: 4, status: "active" as const, revenue: "R$ 28K" },
  { id: 12, name: "SerraLink", city: "Campinas", state: "SP", lat: -22.91, lng: -47.06, projects: 3, status: "warning" as const, revenue: "R$ 22K" },
];

const STATUS_CONFIG = {
  active: { color: "hsl(160 84% 39%)", label: "Ativo", badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  warning: { color: "hsl(38 92% 50%)", label: "Atenção", badge: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  inactive: { color: "hsl(0 84% 60%)", label: "Inativo", badge: "bg-red-500/20 text-red-400 border-red-500/30" },
};

// Convert lat/lng to SVG position (simplified Brazil bounds)
function toSvg(lat: number, lng: number) {
  const minLat = -33, maxLat = 5, minLng = -74, maxLng = -34;
  const x = ((lng - minLng) / (maxLng - minLng)) * 500 + 50;
  const y = ((maxLat - lat) / (maxLat - minLat)) * 500 + 30;
  return { x, y };
}

function MapDot({ client, index, selected, onSelect }: {
  client: typeof MOCK_CLIENTS[0];
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
      transition={{ delay: 0.3 + index * 0.08, type: "spring", stiffness: 200, damping: 15 }}
      style={{ cursor: "pointer" }}
      onClick={onSelect}
    >
      {/* Pulse ring */}
      <motion.circle
        cx={x} cy={y} r={selected ? 18 : 12}
        fill="none"
        stroke={config.color}
        strokeWidth={1.5}
        opacity={0.4}
        animate={{ r: selected ? [18, 24, 18] : [12, 16, 12], opacity: [0.4, 0.1, 0.4] }}
        transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
      />
      {/* Main dot */}
      <motion.circle
        cx={x} cy={y}
        r={selected ? 7 : 5}
        fill={config.color}
        stroke="hsl(222 47% 5%)"
        strokeWidth={2}
        whileHover={{ r: 9 }}
        filter="url(#glow)"
      />
      {/* Label */}
      {selected && (
        <motion.text
          x={x} y={y - 14}
          textAnchor="middle"
          fill="white"
          fontSize="10"
          fontWeight="600"
          initial={{ opacity: 0, y: y - 8 }}
          animate={{ opacity: 1, y: y - 14 }}
        >
          {client.name}
        </motion.text>
      )}
    </motion.g>
  );
}

export default function MapaClientes() {
  usePageSEO("/mapa");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return MOCK_CLIENTS.filter((c) => {
      const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.city.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [search, statusFilter]);

  const selectedClient = filtered.find((c) => c.id === selectedId);
  const stats = useMemo(() => ({
    total: MOCK_CLIENTS.length,
    active: MOCK_CLIENTS.filter((c) => c.status === "active").length,
    warning: MOCK_CLIENTS.filter((c) => c.status === "warning").length,
    projects: MOCK_CLIENTS.reduce((s, c) => s + c.projects, 0),
  }), []);

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <div className="pointer-events-none absolute inset-0" style={{
        background: "linear-gradient(180deg, hsl(270 60% 10%) 0%, hsl(250 50% 8%) 25%, hsl(234 45% 7%) 50%, hsl(260 40% 9%) 75%, hsl(234 45% 6%) 100%)",
      }} />
      <div className="pointer-events-none absolute top-[20%] left-[-5%] h-[500px] w-[500px] rounded-full opacity-15 blur-[140px]" style={{ background: "radial-gradient(circle, hsl(160 84% 39%), transparent 70%)" }} />
      <div className="pointer-events-none absolute bottom-[10%] right-[-5%] h-[400px] w-[400px] rounded-full opacity-10 blur-[120px]" style={{ background: "radial-gradient(circle, hsl(234 89% 50%), transparent 70%)" }} />

      <div className="relative z-10 mx-auto w-full max-w-[1400px] space-y-6 px-6 pt-6 md:px-10 pb-16">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <MapPin className="h-6 w-6 text-primary" />
              Mapa de Clientes
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Visualize a distribuição geográfica dos seus clientes</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar cliente ou cidade..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-64 bg-card/50 border-border/50" />
            </div>
            <div className="flex gap-1.5">
              {(["all", "active", "warning", "inactive"] as const).map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${statusFilter === s ? "bg-primary/20 text-primary border border-primary/30" : "bg-card/50 text-muted-foreground border border-border/30 hover:bg-card"}`}>
                  {s === "all" ? "Todos" : STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Building2, label: "Total Clientes", value: stats.total, color: "hsl(234 89% 64%)" },
            { icon: Activity, label: "Ativos", value: stats.active, color: "hsl(160 84% 39%)" },
            { icon: Filter, label: "Atenção", value: stats.warning, color: "hsl(38 92% 50%)" },
            { icon: Users, label: "Projetos", value: stats.projects, color: "hsl(280 70% 55%)" },
          ].map((kpi, i) => (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="bg-card/60 border-border/30 backdrop-blur-xl">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${kpi.color}20` }}>
                    <kpi.icon className="h-5 w-5" style={{ color: kpi.color }} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    <p className="text-xl font-bold text-foreground">{kpi.value}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Map + Details */}
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Map */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
            <Card className="bg-card/40 border-border/30 backdrop-blur-xl overflow-hidden">
              <CardContent className="p-4">
                <svg viewBox="0 0 600 580" className="w-full h-auto" style={{ maxHeight: "65vh" }}>
                  <defs>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    <linearGradient id="gridGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="hsl(234 89% 64%)" stopOpacity="0.05" />
                      <stop offset="100%" stopColor="hsl(280 70% 55%)" stopOpacity="0.03" />
                    </linearGradient>
                  </defs>
                  {/* Grid background */}
                  <rect width="600" height="580" fill="url(#gridGrad)" rx="12" />
                  {Array.from({ length: 12 }).map((_, i) => (
                    <line key={`h${i}`} x1="0" y1={i * 50} x2="600" y2={i * 50} stroke="hsl(234 89% 64%)" strokeOpacity="0.06" strokeWidth="0.5" />
                  ))}
                  {Array.from({ length: 13 }).map((_, i) => (
                    <line key={`v${i}`} x1={i * 50} y1="0" x2={i * 50} y2="580" stroke="hsl(234 89% 64%)" strokeOpacity="0.06" strokeWidth="0.5" />
                  ))}
                  {/* Connection lines between clients */}
                  {filtered.slice(0, -1).map((c, i) => {
                    const next = filtered[i + 1];
                    const from = toSvg(c.lat, c.lng);
                    const to = toSvg(next.lat, next.lng);
                    return (
                      <motion.line
                        key={`line-${c.id}-${next.id}`}
                        x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                        stroke="hsl(234 89% 64%)"
                        strokeOpacity="0.12"
                        strokeWidth="0.8"
                        strokeDasharray="4 4"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ delay: 0.5 + i * 0.05, duration: 0.8 }}
                      />
                    );
                  })}
                  {/* Client dots */}
                  {filtered.map((c, i) => (
                    <MapDot key={c.id} client={c} index={i} selected={selectedId === c.id} onSelect={() => setSelectedId(selectedId === c.id ? null : c.id)} />
                  ))}
                </svg>
              </CardContent>
            </Card>
          </motion.div>

          {/* Client List */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground px-1">Clientes ({filtered.length})</h2>
            <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1 scrollbar-thin">
              <AnimatePresence>
                {filtered.map((c, i) => {
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
                      className={`cursor-pointer rounded-xl border p-3.5 transition-all ${selectedId === c.id ? "bg-primary/10 border-primary/30 shadow-lg shadow-primary/10" : "bg-card/50 border-border/30 hover:bg-card/80"}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{c.city}, {c.state}</p>
                        </div>
                        <Badge variant="outline" className={`text-[10px] ${config.badge}`}>{config.label}</Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-2.5">
                        <span className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">{c.projects}</span> projetos</span>
                        <span className="text-xs font-semibold text-primary">{c.revenue}</span>
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
