"use client";



import { useEffect } from "react";

import { useRouter } from "next/navigation";

import { AuthCard } from "@/modules/auth/components/AuthCard";

import { useAuth } from "@/modules/auth/hooks/useAuth";

import "../../styles/pages/auth.css";



export default function AuthPage() {

  const router = useRouter();

  const { session, loadingSession, login } = useAuth();



  useEffect(() => {

    if (!loadingSession && session) {

      router.replace("/home");

    }

  }, [loadingSession, session, router]);



  if (loadingSession || session) {

    return (

      <div className="page page--auth flex min-h-screen items-center justify-center bg-slate-950">

        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/50 border-t-transparent" />

      </div>

    );

  }



  return (

    <div className="page page--auth relative min-h-screen overflow-hidden">



      <main className="mx-auto flex min-h-screen w-full items-center justify-center px-6 py-14 lg:px-12">

        <div className="grid w-full max-w-[1100px] grid-cols-1 gap-8 lg:grid-cols-2 lg:items-stretch">

          <section className="auth-hero hidden h-full min-h-[520px] flex-col gap-5 rounded-3xl border border-slate-800/60 bg-slate-900/60 p-10 shadow-[0_30px_90px_-60px_rgba(0,0,0,0.8)] lg:flex">

            <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">Acesse sua dashboard</p>

            <h2 className="text-3xl font-semibold text-white leading-tight">Tudo em um só lugar!</h2>

            <p className="text-base text-slate-300">
              Entre para acompanhar chamados, rotinas e informações do seu ambiente — com uma interface clara, rápida e segura.
            </p>

            <ul className="mt-1 space-y-2 text-sm text-slate-300">

              <li className="flex items-start gap-2">

                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-indigo-300" />

                <span>Acesso rápido às principais telas e ações.</span>

              </li>

              <li className="flex items-start gap-2">

                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-indigo-300" />

                <span>Acompanhamento simples de status e prazos, sem perder tempo.</span>

              </li>

            </ul>



            <div className="mt-2 grid grid-cols-2 gap-4 text-sm text-slate-300">

              <div className="rounded-2xl border border-slate-800/60 bg-slate-950/60 p-4">

                <p className="text-xs uppercase tracking-[0.2em] text-indigo-300">Acesso rápido</p>
                <p className="mt-1 text-[13px] font-semibold text-white leading-snug whitespace-normal break-words">Atalhos para as telas principais</p>

              </div>



              <div className="rounded-2xl border border-slate-800/60 bg-slate-950/60 p-4">

                <p className="text-xs uppercase tracking-[0.2em] text-indigo-300">Acompanhamento</p>
                <p className="mt-1 text-[13px] font-semibold text-white leading-snug whitespace-normal break-words">
                  Status e prazos em tempo real
                </p>

              </div>



              <div className="rounded-2xl border border-slate-800/60 bg-slate-950/60 p-4">

                <p className="text-xs uppercase tracking-[0.2em] text-indigo-300">Organização</p>
                <p className="mt-1 text-[13px] font-semibold text-white leading-snug whitespace-normal break-words">Tudo centralizado e fácil de achar</p>

              </div>



              <div className="rounded-2xl border border-slate-800/60 bg-slate-950/60 p-4">

                <p className="text-xs uppercase tracking-[0.2em] text-indigo-300">Agilidade</p>
                <p className="mt-1 text-[13px] font-semibold text-white leading-snug whitespace-normal break-words">Tudo rápido e no mesmo lugar</p>

              </div>

            </div>

          </section>



          <section className="w-full h-full lg:justify-self-end">

            <div className="auth-login-wrap h-full min-h-[520px]">

              <AuthCard onLogin={login} onSuccess={() => router.push("/home")} />

            </div>

          </section>

        </div>

      </main>

    </div>

  );

}






























