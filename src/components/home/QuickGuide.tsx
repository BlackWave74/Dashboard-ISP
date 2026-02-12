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
      <div className="mb-8 text-center">
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

      <div className="grid gap-4 md:grid-cols-3">
        {steps.map((s) => (
          <div
            key={s.num}
            className="group rounded-2xl bg-card/40 p-6 transition-all duration-300 hover:bg-card/70"
          >
            <div className="mb-4 flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                {s.num}
              </span>
              <p className="text-sm font-semibold text-foreground">{s.label}</p>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
          </div>
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        A Página Inicial é o mapa do sistema — orienta o usuário e reforça o propósito de cada módulo.
      </p>
    </section>
  );
}
