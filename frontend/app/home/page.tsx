"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/modules/layout/components/Sidebar";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import "../../styles/pages/home.css";

const slides = [
  {
    id: "s1",
    kicker: "VISÃO GERAL",
    title: "O que é este painel",
    desc: "Um ponto único para entender o fluxo do sistema e acessar o que importa no seu perfil.",
    points: ["Visão rápida do que fazer agora", "Menos troca de contexto", "Decisões com mais clareza"],
    bg: "from-indigo-500/70 via-slate-900 to-slate-950",
  },
  {
    id: "s2",
    kicker: "PADRÃO",
    title: "Fluxos guiados",
    desc: "Processos com a mesma lógica e a mesma saída, para reduzir variação e erro.",
    points: ["Rotinas padronizadas por módulo", "Treinamento mais rápido", "Manutenção mais simples"],
    bg: "from-emerald-500/60 via-slate-900 to-slate-950",
  },
  {
    id: "s3",
    kicker: "SEGURANÇA",
    title: "Acesso por perfil",
    desc: "Cada usuário vê apenas o necessário para o seu trabalho, com rastreabilidade e controle.",
    points: ["Permissões por perfil", "Menos confusão para novos usuários", "Mais segurança operacional"],
    bg: "from-amber-400/60 via-slate-900 to-slate-950",
  },
];

export default function HomePage() {
  const router = useRouter();
  const { session, loadingSession, logout } = useAuth();
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    if (!loadingSession && !session) {
      router.replace("/auth");
    }
  }, [loadingSession, session, router]);

  useEffect(() => {
    const id = setInterval(() => setActiveSlide((prev) => (prev + 1) % slides.length), 5000);
    return () => clearInterval(id);
  }, []);

  if (loadingSession || (!session && !loadingSession)) {
    return (
      <div className="page page--home flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/50 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="page page--home">
      <main className="flex min-h-screen w-full">
        <Sidebar
          userName={session?.name ?? "Usuário"}
          userRole={session?.role ?? "consultor"}
          onLogout={logout}
          current="home"
        />

        <div className="min-h-screen flex-1 pl-72 pr-8 py-10">
          <div className="mx-auto w-full max-w-[1900px] space-y-6">
            <section className="mx-auto flex w-full max-w-[1900px] flex-col gap-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-8 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.8)]">
              <div className="space-y-3 text-center">
                <h1 className="text-4xl font-bold text-white md:text-5xl">Painel ISP Consulte</h1>
                <p className="mx-auto max-w-3xl text-lg text-slate-200">
                  Um painel para centralizar rotinas do dia a dia: comodato, integrações, tarefas e cadastros.
                </p>
                <p className="mx-auto max-w-3xl text-lg text-slate-300">
                  Objetivo: reduzir retrabalho, padronizar processos e dar velocidade ao que é repetitivo.
                </p>
              </div>

              <div className="hero-showcase mx-auto w-full max-w-5xl">
                <div className="relative h-[22rem] md:h-[26rem]">
                  {slides.map((slide, idx) => (
                    <div
                      key={slide.id}
                      className={`absolute inset-0 transition-opacity duration-700 ${idx === activeSlide ? "opacity-100" : "opacity-0"}`}
                    >
                      {/* FUNDO “SOLTO” DO SLIDE (ocupa tudo) */}
                      <div className={`hero-showcase__bg bg-gradient-to-br ${slide.bg}`} aria-hidden="true" />

                      {/* PAINEL ÚNICO (flutuante) */}
                      <div className="hero-showcase__panel">
                        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-indigo-100">{slide.kicker}</p>
                        <p className="mt-2 text-3xl font-semibold text-white md:text-4xl">{slide.title}</p>
                        <p className="mx-auto mt-2 max-w-md text-sm text-slate-200">{slide.desc}</p>

                        <div className="mx-auto mt-5 grid max-w-md gap-2 text-left text-sm text-slate-200">
                          {slide.points.map((p) => (
                            <div key={p} className="flex items-start gap-2">
                              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-indigo-300" />
                              <span>{p}</span>
                            </div>
                          ))}
                        </div>

                        <p className="mt-6 text-sm text-slate-200">
                          Você está na visão geral do sistema. Algumas ações aparecem apenas para perfis autorizados.
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hero-showcase__dots">
                  {slides.map((slide, idx) => (
                    <button
                      key={slide.id}
                      type="button"
                      onClick={() => setActiveSlide(idx)}
                      className={`h-2.5 w-2.5 rounded-full transition ${idx === activeSlide ? "bg-indigo-400" : "bg-slate-600"}`}
                      aria-label={`Ir para o slide ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>
            </section>

            <section className="mx-auto mt-8 w-full max-w-[1900px] space-y-6">
              {/* GUIA RÁPIDO */}
              <div className="rounded-2xl border border-slate-800/70 bg-slate-950/55 p-6">
                <div className="mx-auto max-w-4xl text-center">
                  <p className="text-xs uppercase tracking-[0.2em] text-indigo-300">Primeiros passos</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Guia rápido para começar bem no dia a dia</h2>
                  <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-300">
                    Use a Home como um mapa: entenda o fluxo, acesse seu módulo e siga o passo a passo do seu perfil.
                  </p>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-800/70 bg-slate-900/35 p-5">
                    <div className="flex items-center gap-3">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-indigo-500/20 text-sm font-semibold text-indigo-200">
                        1
                      </span>
                      <p className="text-sm font-semibold text-white">Escolha seu módulo</p>
                    </div>
                    <p className="mt-3 text-sm text-slate-300">
                      Entre no menu lateral e vá direto no que você usa: comodato, cadastros, integrações ou tarefas.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-800/70 bg-slate-900/35 p-5">
                    <div className="flex items-center gap-3">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-500/20 text-sm font-semibold text-emerald-200">
                        2
                      </span>
                      <p className="text-sm font-semibold text-white">Siga o fluxo recomendado</p>
                    </div>
                    <p className="mt-3 text-sm text-slate-300">
                      O sistema te guia para reduzir erro e retrabalho. Menos “onde fica isso?” e mais execução.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-800/70 bg-slate-900/35 p-5">
                    <div className="flex items-center gap-3">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-amber-500/20 text-sm font-semibold text-amber-200">
                        3
                      </span>
                      <p className="text-sm font-semibold text-white">Registre e acompanhe</p>
                    </div>
                    <p className="mt-3 text-sm text-slate-300">
                      Tudo que é rotina precisa de rastreabilidade: resultado consistente, histórico e menos ruído no time.
                    </p>
                  </div>
                </div>
              </div>

              {/* PERFIS */}
              {/* PERFIS */}
              <div className="rounded-2xl border border-slate-800/70 bg-slate-950/55 p-6">
                <div className="mx-auto max-w-4xl text-center">
                  <p className="text-xs uppercase tracking-[0.2em] text-indigo-300">Perfis</p>
                  <h3 className="mt-2 text-2xl font-semibold text-white">O que cada perfil ganha</h3>
                  <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-300">
                    A mesma base, experiências diferentes: cada usuário vê apenas o que faz sentido para o seu trabalho.
                  </p>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-800/70 bg-slate-900/35 p-6">
                    <h4 className="text-center text-xl font-semibold text-white">Cliente</h4>
                    <p className="mt-2 text-center text-sm text-slate-400">Clareza e autonomia</p>
                    <ul className="mt-4 space-y-2 text-sm text-slate-300">
                      <li className="flex items-start gap-2">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-indigo-300" />
                        <span>Entende o que está disponível e como usar, sem depender de suporte.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-indigo-300" />
                        <span>Fluxo mais didático, focado no essencial.</span>
                      </li>
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-slate-800/70 bg-slate-900/35 p-6">
                    <h4 className="text-center text-xl font-semibold text-white">Operação</h4>
                    <p className="mt-2 text-center text-sm text-slate-400">Velocidade e padrão</p>
                    <ul className="mt-4 space-y-2 text-sm text-slate-300">
                      <li className="flex items-start gap-2">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-indigo-300" />
                        <span>Rotinas padronizadas para reduzir variação e ganhar tempo.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-indigo-300" />
                        <span>Mesma lógica, mesma saída: menos erro e menos retrabalho.</span>
                      </li>
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-slate-800/70 bg-slate-900/35 p-6">
                    <h4 className="text-center text-xl font-semibold text-white">Suporte</h4>
                    <p className="mt-2 text-center text-sm text-slate-400">Controle e rastreabilidade</p>
                    <ul className="mt-4 space-y-2 text-sm text-slate-300">
                      <li className="flex items-start gap-2">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-indigo-300" />
                        <span>Mais rastreabilidade para diagnosticar e orientar rápido.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-indigo-300" />
                        <span>Acesso por perfil mantém segurança operacional.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* BENEFÍCIOS (centralizado e mais “premium”) */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-6">
                <div className="mx-auto max-w-4xl text-center">
                  <p className="text-xs uppercase tracking-[0.2em] text-indigo-300">Benefícios</p>
                  <h3 className="mt-2 text-2xl font-semibold text-white">Por que usar</h3>
                  <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-300">
                    Menos improviso, mais padrão. Um painel bonito é legal — mas o que importa é reduzir atrito no dia a dia.
                  </p>
                </div>

                <div className="mx-auto mt-6 grid max-w-5xl gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/35 p-5 text-left">
                    <p className="text-sm font-semibold text-white">Centralização</p>
                    <p className="mt-2 text-sm text-slate-300">
                      O essencial fica em um lugar só. Menos abas, menos perda de tempo procurando informação.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/35 p-5 text-left">
                    <p className="text-sm font-semibold text-white">Padrão</p>
                    <p className="mt-2 text-sm text-slate-300">
                      Rotinas com consistência: reduz erro humano e melhora a previsibilidade do processo.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/35 p-5 text-left">
                    <p className="text-sm font-semibold text-white">Segurança</p>
                    <p className="mt-2 text-sm text-slate-300">
                      Cada perfil acessa apenas o que faz sentido. Sem exposição desnecessária de rotinas sensíveis.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/35 p-5 text-left">
                    <p className="text-sm font-semibold text-white">Rastreabilidade</p>
                    <p className="mt-2 text-sm text-slate-300">
                      Facilita repasse de turno e auditoria do que foi feito, com menos ruído e mais clareza.
                    </p>
                  </div>
                </div>

                <p className="mt-6 text-center text-xs text-slate-400">
                  A Home é um “mapa do sistema”: orienta o usuário e reforça propósito — não é um mural de recados.
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
