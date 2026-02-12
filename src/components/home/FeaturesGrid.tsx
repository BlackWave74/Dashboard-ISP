import { Shield, Zap, BarChart3, Layers } from "lucide-react";

const features = [
  {
    icon: Layers,
    title: "Centralização",
    desc: "Todas as rotinas em um só lugar. Menos abas abertas, menos tempo perdido procurando informação.",
  },
  {
    icon: Zap,
    title: "Padronização",
    desc: "Processos com consistência que reduzem erros humanos e melhoram a previsibilidade.",
  },
  {
    icon: Shield,
    title: "Segurança",
    desc: "Cada perfil acessa apenas o necessário. Sem exposição desnecessária de rotinas sensíveis.",
  },
  {
    icon: BarChart3,
    title: "Rastreabilidade",
    desc: "Histórico completo para auditorias, repasses de turno e decisões com mais clareza.",
  },
];

export default function FeaturesGrid() {
  return (
    <section>
      <div className="mb-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Benefícios
        </p>
        <h2 className="mt-2 text-2xl font-bold text-foreground md:text-3xl">
          Por que usar o ISP Consulte
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          Menos improviso, mais padrão. O que importa é reduzir atrito no dia a dia do seu provedor.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {features.map((f, i) => (
          <div
            key={f.title}
            className="group relative overflow-hidden rounded-2xl bg-card/30 p-7 transition-all duration-500 hover:-translate-y-2 hover:bg-card/60 hover:shadow-2xl hover:shadow-primary/10"
            style={{
              opacity: 0,
              animation: `fadeSlideUp 0.6s ease-out ${i * 120}ms forwards`,
            }}
          >
            {/* Top glow */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent transition-all duration-500 group-hover:via-primary/40" />

            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-all duration-300 group-hover:bg-primary/20 group-hover:shadow-lg group-hover:shadow-primary/10">
              <f.icon className="h-5 w-5 text-primary transition-transform duration-300 group-hover:scale-110" />
            </div>
            <h3 className="text-base font-bold text-foreground">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
