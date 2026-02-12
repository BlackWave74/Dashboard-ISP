const profiles = [
  {
    title: "Cliente",
    subtitle: "Clareza e autonomia",
    points: [
      "Entende o que está disponível e como usar, sem depender de suporte.",
      "Fluxo mais didático, focado no essencial.",
    ],
  },
  {
    title: "Operação",
    subtitle: "Velocidade e padrão",
    points: [
      "Rotinas padronizadas para reduzir variação e ganhar tempo.",
      "Mesma lógica, mesma saída: menos erro e menos retrabalho.",
    ],
  },
  {
    title: "Suporte",
    subtitle: "Controle e rastreabilidade",
    points: [
      "Mais rastreabilidade para diagnosticar e orientar rápido.",
      "Acesso por perfil mantém segurança operacional.",
    ],
  },
];

export default function ProfilesSection() {
  return (
    <div className="rounded-2xl border border-[hsl(var(--dash-border)/0.7)] p-6" style={{ background: "hsl(var(--dash-bg) / 0.55)" }}>
      <div className="mx-auto max-w-4xl text-center">
        <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "hsl(var(--dash-accent-indigo))" }}>Perfis</p>
        <h3 className="mt-2 text-2xl font-semibold" style={{ color: "hsl(var(--dash-text))" }}>O que cada perfil ganha</h3>
        <p className="mx-auto mt-2 max-w-2xl text-sm" style={{ color: "hsl(var(--dash-text-muted))" }}>
          A mesma base, experiências diferentes: cada usuário vê apenas o que faz sentido para o seu trabalho.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {profiles.map((p) => (
          <div key={p.title} className="rounded-2xl border border-[hsl(var(--dash-border)/0.7)] p-6" style={{ background: "hsl(var(--dash-surface) / 0.35)" }}>
            <h4 className="text-center text-xl font-semibold" style={{ color: "hsl(var(--dash-text))" }}>{p.title}</h4>
            <p className="mt-2 text-center text-sm" style={{ color: "hsl(var(--dash-text-muted))" }}>{p.subtitle}</p>
            <ul className="mt-4 space-y-2 text-sm" style={{ color: "hsl(var(--dash-text-muted))" }}>
              {p.points.map((pt) => (
                <li key={pt} className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "hsl(var(--dash-accent-indigo))" }} />
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
