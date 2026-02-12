const benefits = [
  { title: "Centralização", desc: "O essencial fica em um lugar só. Menos abas, menos perda de tempo procurando informação." },
  { title: "Padrão", desc: "Rotinas com consistência: reduz erro humano e melhora a previsibilidade do processo." },
  { title: "Segurança", desc: "Cada perfil acessa apenas o que faz sentido. Sem exposição desnecessária de rotinas sensíveis." },
  { title: "Rastreabilidade", desc: "Facilita repasse de turno e auditoria do que foi feito, com menos ruído e mais clareza." },
];

export default function BenefitsSection() {
  return (
    <div className="rounded-2xl border border-[hsl(var(--dash-border))] p-6" style={{ background: "hsl(var(--dash-bg) / 0.55)" }}>
      <div className="mx-auto max-w-4xl text-center">
        <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "hsl(var(--dash-accent-indigo))" }}>Benefícios</p>
        <h3 className="mt-2 text-2xl font-semibold" style={{ color: "hsl(var(--dash-text))" }}>Por que usar</h3>
        <p className="mx-auto mt-2 max-w-2xl text-sm" style={{ color: "hsl(var(--dash-text-muted))" }}>
          Menos improviso, mais padrão. Um painel bonito é legal — mas o que importa é reduzir atrito no dia a dia.
        </p>
      </div>

      <div className="mx-auto mt-6 grid max-w-5xl gap-4 md:grid-cols-2">
        {benefits.map((b) => (
          <div key={b.title} className="rounded-2xl border border-[hsl(var(--dash-border))] p-5 text-left" style={{ background: "hsl(var(--dash-surface) / 0.35)" }}>
            <p className="text-sm font-semibold" style={{ color: "hsl(var(--dash-text))" }}>{b.title}</p>
            <p className="mt-2 text-sm" style={{ color: "hsl(var(--dash-text-muted))" }}>{b.desc}</p>
          </div>
        ))}
      </div>

      <p className="mt-6 text-center text-xs" style={{ color: "hsl(var(--dash-text-muted))" }}>
        A Home é um "mapa do sistema": orienta o usuário e reforça propósito — não é um mural de recados.
      </p>
    </div>
  );
}
