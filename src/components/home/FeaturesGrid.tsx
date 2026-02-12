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
      <div className="mb-8 text-center">
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

      <div className="grid gap-4 sm:grid-cols-2">
        {features.map((f) => (
          <div
            key={f.title}
            className="group rounded-2xl bg-card/40 p-6 transition-all duration-300 hover:bg-card/70"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
              <f.icon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-base font-semibold text-foreground">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
