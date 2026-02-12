const steps = [
  { num: "1", label: "Escolha seu módulo", desc: "Entre no menu lateral e vá direto no que você usa: comodato, cadastros, integrações ou tarefas.", color: "bg-primary/20 text-primary" },
  { num: "2", label: "Siga o fluxo recomendado", desc: "O sistema te guia para reduzir erro e retrabalho. Menos \"onde fica isso?\" e mais execução.", color: "bg-emerald-500/20 text-emerald-400" },
  { num: "3", label: "Registre e acompanhe", desc: "Tudo que é rotina precisa de rastreabilidade: resultado consistente, histórico e menos ruído no time.", color: "bg-amber-500/20 text-amber-400" },
];

export default function QuickGuide() {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/55 p-6">
      <div className="mx-auto max-w-4xl text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-primary">Primeiros passos</p>
        <h2 className="mt-2 text-2xl font-semibold text-foreground">Guia rápido para começar bem no dia a dia</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
          Use a Home como um mapa: entenda o fluxo, acesse seu módulo e siga o passo a passo do seu perfil.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {steps.map((s) => (
          <div key={s.num} className="rounded-2xl border border-border/70 bg-muted/35 p-5 transition-colors hover:bg-muted/50">
            <div className="flex items-center gap-3">
              <span className={`grid h-8 w-8 place-items-center rounded-full text-sm font-semibold ${s.color}`}>
                {s.num}
              </span>
              <p className="text-sm font-semibold text-foreground">{s.label}</p>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
