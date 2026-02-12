const steps = [
  { num: "1", label: "Escolha seu módulo", desc: "Entre no menu lateral e vá direto no que você usa: comodato, cadastros, integrações ou tarefas.", accent: "hsl(var(--dash-accent-indigo))" },
  { num: "2", label: "Siga o fluxo recomendado", desc: "O sistema te guia para reduzir erro e retrabalho. Menos \"onde fica isso?\" e mais execução.", accent: "hsl(var(--dash-accent-emerald))" },
  { num: "3", label: "Registre e acompanhe", desc: "Tudo que é rotina precisa de rastreabilidade: resultado consistente, histórico e menos ruído no time.", accent: "hsl(var(--dash-accent-amber))" },
];

export default function QuickGuide() {
  return (
    <div className="rounded-2xl border border-[hsl(var(--dash-border)/0.7)] p-6" style={{ background: "hsl(var(--dash-bg) / 0.55)" }}>
      <div className="mx-auto max-w-4xl text-center">
        <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "hsl(var(--dash-accent-indigo))" }}>Primeiros passos</p>
        <h2 className="mt-2 text-2xl font-semibold" style={{ color: "hsl(var(--dash-text))" }}>Guia rápido para começar bem no dia a dia</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm" style={{ color: "hsl(var(--dash-text-muted))" }}>
          Use a Home como um mapa: entenda o fluxo, acesse seu módulo e siga o passo a passo do seu perfil.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {steps.map((s) => (
          <div key={s.num} className="rounded-2xl border border-[hsl(var(--dash-border)/0.7)] p-5" style={{ background: "hsl(var(--dash-surface) / 0.35)" }}>
            <div className="flex items-center gap-3">
              <span
                className="grid h-8 w-8 place-items-center rounded-full text-sm font-semibold"
                style={{ background: `${s.accent}20`, color: s.accent }}
              >
                {s.num}
              </span>
              <p className="text-sm font-semibold" style={{ color: "hsl(var(--dash-text))" }}>{s.label}</p>
            </div>
            <p className="mt-3 text-sm" style={{ color: "hsl(var(--dash-text-muted))" }}>{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
