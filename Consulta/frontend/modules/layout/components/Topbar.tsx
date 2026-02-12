"use client";

import Image from "next/image";
import Link from "next/link";
import logoTopbar from "@/public/resouce/logo.png";

type TopbarProps = {
  userName: string;
  onLogout: () => void;
  current?: "integracoes" | "tarefas";
  userRole?: "admin" | "consultor" | "gerente" | "coordenador" | "cliente";
};

export function Topbar({ userName, onLogout, current = "integracoes", userRole = "consultor" }: TopbarProps) {
  const navClasses = (isActive: boolean) =>
    `flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
      isActive
        ? "border border-indigo-400/60 bg-slate-800 text-white shadow-[0_0_0_4px_rgba(99,102,241,0.08)]"
        : "border border-slate-700 text-white hover:border-indigo-400 hover:text-indigo-200"
    }`;

  const panelLabel =
    userRole === "admin" || userRole === "gerente" || userRole === "coordenador" ? "Painel Admin" : "Painel";

  return (
    <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-8 rounded-2xl border border-slate-800 bg-slate-900/70 px-10 py-4 backdrop-blur">
      <div className="flex flex-wrap items-center gap-6">
        <Image
          src={logoTopbar}
          alt="ISP Consulte"
          width={148}
          height={32}
          className="h-10 w-auto"
          unoptimized
          priority
        />
        <div className="leading-tight pl-2">
          <p className="text-[11px] uppercase tracking-[0.3em] text-indigo-300">{panelLabel}</p>
          <p className="text-base font-semibold text-white">
            {current === "tarefas" ? "Tarefas" : "Integrações"}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 ml-auto">
        <Link href="/integracoes" className={navClasses(current === "integracoes")}>
          <svg
            aria-hidden
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="none"
          >
            <path
              d="M4 10h12M10 4v12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          Integrações
        </Link>
        <Link href="/tarefas" className={navClasses(current === "tarefas")}>
          <svg
            aria-hidden
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="none"
          >
            <rect
              x="3"
              y="4"
              width="14"
              height="12"
              rx="2"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M7 2h6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          Tarefas
        </Link>
        <div className="rounded-full bg-slate-800 px-4 py-2 text-sm text-slate-200">
          Olá, {userName}
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:border-red-400 hover:text-red-200"
        >
          <svg
            aria-hidden
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="none"
          >
            <path
              d="M11 4h-1a4 4 0 0 0-4 4v0a4 4 0 0 0 4 4h1m3-4H8m6 0-2-2m2 2-2 2"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Sair
        </button>
      </div>
    </header>
  );
}
