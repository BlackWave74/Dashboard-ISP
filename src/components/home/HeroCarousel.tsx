import { useState, useEffect } from "react";

const slides = [
  {
    id: "s1",
    kicker: "VISÃO GERAL",
    title: "O que é este painel",
    desc: "Um ponto único para entender o fluxo do sistema e acessar o que importa no seu perfil.",
    points: ["Visão rápida do que fazer agora", "Menos troca de contexto", "Decisões com mais clareza"],
    gradient: "from-[hsl(234,89%,55%,0.7)] via-[hsl(222,47%,6%)] to-[hsl(222,47%,4%)]",
  },
  {
    id: "s2",
    kicker: "PADRÃO",
    title: "Fluxos guiados",
    desc: "Processos com a mesma lógica e a mesma saída, para reduzir variação e erro.",
    points: ["Rotinas padronizadas por módulo", "Treinamento mais rápido", "Manutenção mais simples"],
    gradient: "from-[hsl(160,84%,39%,0.6)] via-[hsl(222,47%,6%)] to-[hsl(222,47%,4%)]",
  },
  {
    id: "s3",
    kicker: "SEGURANÇA",
    title: "Acesso por perfil",
    desc: "Cada usuário vê apenas o necessário para o seu trabalho, com rastreabilidade e controle.",
    points: ["Permissões por perfil", "Menos confusão para novos usuários", "Mais segurança operacional"],
    gradient: "from-[hsl(38,92%,50%,0.6)] via-[hsl(222,47%,6%)] to-[hsl(222,47%,4%)]",
  },
];

export default function HeroCarousel() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActive((p) => (p + 1) % slides.length), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[hsl(var(--dash-border))]" style={{ background: "hsl(var(--dash-surface) / 0.55)" }}>
      <div className="relative h-[22rem] md:h-[26rem]">
        {slides.map((slide, idx) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-700 ${idx === active ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          >
            {/* Background gradient */}
            <div
              className={`absolute -inset-[120px] bg-gradient-to-br ${slide.gradient}`}
              style={{ animation: "heroHue 18s linear infinite" }}
              aria-hidden="true"
            />

            {/* Content panel */}
            <div className="relative z-10 mx-auto mt-12 w-[min(680px,calc(100%-3rem))] rounded-xl border border-white/10 p-8 text-center" style={{ background: "hsl(var(--dash-bg) / 0.5)", backdropFilter: "blur(14px)" }}>
              <p className="text-xs font-semibold uppercase tracking-[0.35em]" style={{ color: "hsl(var(--dash-accent-indigo))" }}>
                {slide.kicker}
              </p>
              <p className="mt-2 text-3xl font-semibold md:text-4xl" style={{ color: "hsl(var(--dash-text))" }}>
                {slide.title}
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: "hsl(var(--dash-text-muted))" }}>
                {slide.desc}
              </p>

              <div className="mx-auto mt-5 grid max-w-md gap-2 text-left text-sm" style={{ color: "hsl(var(--dash-text-muted))" }}>
                {slide.points.map((p) => (
                  <div key={p} className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "hsl(var(--dash-accent-indigo))" }} />
                    <span>{p}</span>
                  </div>
                ))}
              </div>

              <p className="mt-6 text-sm" style={{ color: "hsl(var(--dash-text-muted))" }}>
                Você está na visão geral do sistema. Algumas ações aparecem apenas para perfis autorizados.
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Dots */}
      <div className="relative z-10 flex justify-center gap-2 pb-4">
        {slides.map((slide, idx) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => setActive(idx)}
            className={`h-2.5 w-2.5 rounded-full transition ${idx === active ? "bg-[hsl(var(--dash-accent-indigo))]" : "bg-[hsl(var(--dash-border))]"}`}
            aria-label={`Slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
