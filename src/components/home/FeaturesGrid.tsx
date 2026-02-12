import { Shield, Zap, BarChart3, Layers, ArrowRight } from "lucide-react";

const features = [
  {
    icon: Layers,
    title: "Centralização",
    desc: "Todas as rotinas em um só lugar. Menos abas abertas, menos tempo perdido procurando informação.",
    color: "from-[hsl(270_80%_55%)] to-[hsl(234_89%_55%)]",
    glow: "hsl(270 80% 55% / 0.15)",
  },
  {
    icon: Zap,
    title: "Padronização",
    desc: "Processos com consistência que reduzem erros humanos e melhoram a previsibilidade.",
    color: "from-[hsl(160_84%_39%)] to-[hsl(180_70%_40%)]",
    glow: "hsl(160 84% 39% / 0.15)",
  },
  {
    icon: Shield,
    title: "Segurança",
    desc: "Cada perfil acessa apenas o necessário. Sem exposição desnecessária de rotinas sensíveis.",
    color: "from-[hsl(38_92%_50%)] to-[hsl(25_90%_55%)]",
    glow: "hsl(38 92% 50% / 0.15)",
  },
  {
    icon: BarChart3,
    title: "Rastreabilidade",
    desc: "Histórico completo para auditorias, repasses de turno e decisões com mais clareza.",
    color: "from-[hsl(234_89%_64%)] to-[hsl(200_90%_55%)]",
    glow: "hsl(234 89% 64% / 0.15)",
  },
];

export default function FeaturesGrid() {
  return (
    <section className="rounded-3xl border border-border/50 bg-card/30 p-8 backdrop-blur-sm md:p-10">
      {/* Header */}
      <div className="mb-10 flex flex-col items-center text-center md:flex-row md:items-end md:justify-between md:text-left">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1">
            <Zap className="h-3 w-3 text-primary" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary">
              Benefícios
            </span>
          </div>
          <h2 className="mt-2 text-2xl font-bold text-foreground md:text-3xl">
            Por que usar o ISP Consulte
          </h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Menos improviso, mais padrão. O que importa é reduzir atrito no dia a dia do seu provedor.
          </p>
        </div>
      </div>

      {/* Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {features.map((f, i) => (
          <div
            key={f.title}
            className="group relative overflow-hidden rounded-2xl border border-border/40 bg-background/40 p-6 transition-all duration-500 hover:-translate-y-1 hover:border-border/70 hover:shadow-2xl"
            style={{
              opacity: 0,
              animation: `fadeSlideUp 0.6s ease-out ${i * 120}ms forwards`,
            }}
          >
            {/* Corner glow on hover */}
            <div
              className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
              style={{ background: f.glow }}
            />

            {/* Top accent */}
            <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${f.color} opacity-0 transition-opacity duration-500 group-hover:opacity-100`} />

            <div className="relative z-10">
              <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${f.color} shadow-lg transition-transform duration-300 group-hover:scale-110`}>
                <f.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-base font-bold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>

              <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary opacity-0 transition-all duration-300 group-hover:opacity-100">
                <span>Saiba mais</span>
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
