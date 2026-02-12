const steps = [
  {
    num: "1",
    label: "Escolha seu módulo",
    desc: "Entre no menu lateral e vá direto no que você usa: comodato, cadastros, integrações ou tarefas.",
  },
  {
    num: "2",
    label: "Siga o fluxo recomendado",
    desc: "O sistema te guia para reduzir erro e retrabalho. Menos dúvidas e mais execução.",
  },
  {
    num: "3",
    label: "Registre e acompanhe",
    desc: "Tudo que é rotina precisa de rastreabilidade: resultado consistente, histórico e menos ruído.",
  },
];

export default function QuickGuide() {
  return (
    <section>
      <div className="mb-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Primeiros passos
        </p>
        <h2 className="mt-2 text-2xl font-bold text-foreground md:text-3xl">
          Guia rápido para começar
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          Use a página inicial como um mapa: entenda o fluxo, acesse seu módulo e siga o passo a passo.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {steps.map((s, i) => (
          <div
            key={s.num}
            className="group relative overflow-hidden rounded-2xl bg-card/30 p-7 transition-all duration-500 hover:-translate-y-2 hover:bg-card/60 hover:shadow-2xl hover:shadow-primary/10"
            style={{
              opacity: 0,
              animation: `fadeSlideUp 0.6s ease-out ${i * 120}ms forwards`,
            }}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent transition-all duration-500 group-hover:via-primary/40" />
            <div className="mb-4 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/15 text-sm font-bold text-primary shadow-md shadow-primary/10">
                {s.num}
              </span>
              <p className="text-sm font-bold text-foreground">{s.label}</p>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
          </div>
        ))}
      </div>

      <p className="mt-10 text-center text-xs text-muted-foreground">
        A Página Inicial é o mapa do sistema — orienta o usuário e reforça o propósito de cada módulo.
      </p>
    </section>
  );
}
