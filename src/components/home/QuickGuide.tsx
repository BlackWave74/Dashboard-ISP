import { Rocket } from "lucide-react";

const steps = [
  {
    num: "01",
    label: "Escolha seu módulo",
    desc: "Entre no menu lateral e vá direto no que você usa: comodato, cadastros, integrações ou tarefas.",
  },
  {
    num: "02",
    label: "Siga o fluxo recomendado",
    desc: "O sistema te guia para reduzir erro e retrabalho. Menos dúvidas e mais execução.",
  },
  {
    num: "03",
    label: "Registre e acompanhe",
    desc: "Tudo que é rotina precisa de rastreabilidade: resultado consistente, histórico e menos ruído.",
  },
];

export default function QuickGuide() {
  return (
    <section className="rounded-3xl border border-border/50 bg-card/30 p-8 backdrop-blur-sm md:p-10">
      {/* Header */}
      <div className="mb-10 text-center">
        <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1">
          <Rocket className="h-3 w-3 text-primary" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary">
            Primeiros passos
          </span>
        </div>
        <h2 className="mt-2 text-2xl font-bold text-foreground md:text-3xl">
          Guia rápido para começar
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          Use a página inicial como um mapa: entenda o fluxo, acesse seu módulo e siga o passo a passo.
        </p>
      </div>

      {/* Steps with connecting line */}
      <div className="relative grid gap-5 md:grid-cols-3">
        {/* Connector line (desktop) */}
        <div className="pointer-events-none absolute top-10 left-[16.7%] right-[16.7%] hidden h-px bg-gradient-to-r from-primary/30 via-primary/50 to-primary/30 md:block" />

        {steps.map((s, i) => (
          <div
            key={s.num}
            className="group relative overflow-hidden rounded-2xl border border-border/40 bg-background/40 p-7 text-center transition-all duration-500 hover:-translate-y-2 hover:border-border/70 hover:shadow-2xl hover:shadow-primary/10"
            style={{
              opacity: 0,
              animation: `fadeSlideUp 0.6s ease-out ${i * 150}ms forwards`,
            }}
          >
            {/* Number badge */}
            <div className="relative z-10 mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/80 to-[hsl(270_80%_55%)] text-lg font-bold text-white shadow-xl shadow-primary/25 transition-transform duration-300 group-hover:scale-110">
              {s.num}
            </div>
            <h3 className="text-base font-bold text-foreground">{s.label}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
          </div>
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground/60">
        A Página Inicial é o mapa do sistema — orienta o usuário e reforça o propósito de cada módulo.
      </p>
    </section>
  );
}
