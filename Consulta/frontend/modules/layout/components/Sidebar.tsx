"use client";

import Image from "next/image";
import Link from "next/link";
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import type { UserRole } from "@/modules/auth/hooks/useAuth";
import { ACCESS_RULES } from "@/modules/auth/hooks/useAuth";
import logoSidebar from "@/public/resouce/logo.png";

type SidebarProps = {
  userName: string;
  onLogout: () => void;
  userRole?: UserRole;
  current?: "home" | "integracoes" | "comodato" | "tarefas" | "usuarios";
  userEmail?: string;
  userAvatarUrl?: string | null;
};

const navItemClasses = (active: boolean) =>
  `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition ${
    active
      ? "bg-slate-800 text-white shadow-[0_10px_40px_-30px_rgba(99,102,241,0.6)] border border-indigo-400/40"
      : "text-slate-200 border border-slate-800/60 bg-slate-900/40 hover:border-indigo-400/40 hover:bg-slate-900/70"
  }`;

const navGroupClasses = (open: boolean) =>
  `flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition ${
    open
      ? "text-white border border-indigo-400/40 bg-slate-900/70"
      : "text-slate-200 border border-slate-800/60 bg-slate-900/40 hover:border-indigo-400/40 hover:bg-slate-900/70"
  }`;

export function Sidebar({
  userName,
  onLogout,
  userRole = "consultor",
  current = "integracoes",
  userEmail,
  userAvatarUrl,
}: SidebarProps) {
  const access = ACCESS_RULES[userRole] ?? ACCESS_RULES.consultor;
  const panelLabel =
    userRole === "admin" || userRole === "gerente" || userRole === "coordenador" ? "Painel Admin" : "Painel";
  const roleLabel =
    userRole === "admin"
      ? "Administrador"
      : userRole === "gerente"
        ? "Gerente"
        : userRole === "coordenador"
          ? "Coordenador"
      : userRole === "cliente"
        ? "Cliente"
        : "Consultor";

  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<"automacao" | "admin" | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(userAvatarUrl ?? null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [pendingAvatar, setPendingAvatar] = useState<string | null>(null);

  const storageKey = useMemo(
    () => `sidebar_profile:${userEmail || userName || "default"}`,
    [userEmail, userName]
  );

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(`${storageKey}:open_group`);
      if (raw === "automacao" || raw === "admin") {
        setOpenGroup(raw);
      }
      const rawAvatar = window.localStorage.getItem(`${storageKey}:avatar`);
      if (!avatarUrl && rawAvatar) setAvatarUrl(rawAvatar);
    } catch {
      // ignore storage errors
    }
  }, [storageKey, avatarUrl]);

  useEffect(() => {
    try {
      if (openGroup) {
        window.localStorage.setItem(`${storageKey}:open_group`, openGroup);
      } else {
        window.localStorage.removeItem(`${storageKey}:open_group`);
      }
    } catch {
      // ignore storage errors
    }
  }, [storageKey, openGroup]);

const useScrollLock = (active: boolean) => {
  useEffect(() => {
    if (!active) return;
    const original = document.body.style.overflow;
    const originalPadding = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
      document.body.style.paddingRight = originalPadding;
    };
  }, [active]);
};

  const initials = useMemo(() => {
    const parts = (userName || "").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "U";
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
    return (first + last).toUpperCase() || "U";
  }, [userName]);

  const toggleSection = (key: "automacao" | "admin") => {
    setOpenGroup((prev) => (prev === key ? null : key));
  };

  const handleAvatarClick = () => {
    setAvatarError(null);
    setPendingAvatar(null);
    setIsProfileOpen(true);
  };

  const handleAvatarFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setAvatarError("Selecione uma imagem válida.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("A imagem deve ter até 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      setPendingAvatar(result);
      setAvatarError(null);
    };
    reader.readAsDataURL(file);
  };

  const isActive = (key: SidebarProps["current"]) => current === key;
  const showAdmin = access.usuarios || access.integracoes;
  const showAutomacao = access.comodato;
  const showHome = access.home;
  const showTasks = access.tarefas;
  const currentGroup = isActive("comodato") ? "automacao" : (isActive("usuarios") || isActive("integracoes")) ? "admin" : null;

  useScrollLock(isProfileOpen);

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/80 text-white shadow-lg backdrop-blur md:hidden"
        aria-label="Abrir menu"
      >
        <span className="text-lg">≡</span>
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen w-[280px] flex-col gap-6 border-r border-slate-800 bg-slate-950/90 px-5 py-6 backdrop-blur-xl transition-transform md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex items-center justify-center">
          <Image
            src={logoSidebar}
            alt="ISP Consulte"
            width={156}
            height={40}
            className="h-10 w-auto"
            unoptimized
            priority
          />
        </div>
      <div className="flex flex-col gap-4 text-sm text-slate-400">
        <div className="text-xs font-semibold text-slate-500">{panelLabel}</div>
        <nav className="flex flex-col gap-3">
          {showHome && (
            <Link
              href="/home"
              onClick={() => setOpenGroup(null)}
              className={navItemClasses(isActive("home"))}
            >
              <svg aria-hidden className="h-4 w-4" viewBox="0 0 20 20" fill="none">
                <path d="M3 9.5 10 3l7 6.5V17a1 1 0 0 1-1 1h-4v-4H8v4H4a1 1 0 0 1-1-1V9.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Página inicial
            </Link>
          )}

          {showTasks && (
            <Link
              href="/tarefas"
              onClick={() => setOpenGroup(null)}
              className={navItemClasses(isActive("tarefas"))}
            >
              <svg aria-hidden className="h-4 w-4" viewBox="0 0 20 20" fill="none">
                <rect x="3" y="4" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
                <path d="M7 2h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Tarefas
            </Link>
          )}

          {showAutomacao && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => toggleSection("automacao")}
                className={navGroupClasses(openGroup === "automacao")}
                aria-expanded={openGroup === "automacao"}
                aria-controls="submenu-automacao"
              >
                <span className="flex items-center gap-3">
                  <svg aria-hidden className="h-4 w-4" viewBox="0 0 20 20" fill="none">
                    <path d="M4 6h12M4 10h12M4 14h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Automação
                </span>
                <span className={`text-slate-400 transition ${openGroup === "automacao" ? "rotate-0" : "-rotate-90"}`}>
                  ▾
                </span>
              </button>
              {(openGroup === "automacao" || currentGroup === "automacao") && (
                <div id="submenu-automacao" className="flex flex-col gap-2">
                  <Link
                    href="/comodato"
                    onClick={() => setOpenGroup(null)}
                    className={navItemClasses(isActive("comodato"))}
                  >
                    <svg aria-hidden className="h-4 w-4" viewBox="0 0 20 20" fill="none">
                      <path d="M4 11.5a6 6 0 0 1 12 0v2a2.5 2.5 0 0 1-2.5 2.5H6.5A2.5 2.5 0 0 1 4 13.5v-2Z" stroke="currentColor" strokeWidth="2" />
                      <path d="M9 9h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <circle cx="10" cy="5.5" r="1.5" stroke="currentColor" strokeWidth="2" />
                    </svg>
                    Lançador de Comodatos
                  </Link>
                </div>
              )}
            </div>
          )}

          {showAdmin && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => toggleSection("admin")}
                className={navGroupClasses(openGroup === "admin")}
                aria-expanded={openGroup === "admin"}
                aria-controls="submenu-admin"
              >
                <span className="flex items-center gap-3">
                  <svg aria-hidden className="h-4 w-4" viewBox="0 0 20 20" fill="none">
                    <path d="M4 4h12v12H4z" stroke="currentColor" strokeWidth="2" />
                    <path d="M4 9h12M9 4v12" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  Painel administrativo
                </span>
                <span className={`text-slate-400 transition ${openGroup === "admin" ? "rotate-0" : "-rotate-90"}`}>
                  ▾
                </span>
              </button>
              {(openGroup === "admin" || currentGroup === "admin") && (
                <div id="submenu-admin" className="flex flex-col gap-2">
                  {access.usuarios && (
                    <Link
                      href="/usuarios"
                      onClick={() => setOpenGroup(null)}
                      className={navItemClasses(isActive("usuarios"))}
                    >
                      <svg aria-hidden className="h-4 w-4" viewBox="0 0 20 20" fill="none">
                        <path d="M10 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="2" />
                        <path d="M4 17.5c0-2.5 3-4.5 6-4.5s6 2 6 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      Cadastro de Usuários
                    </Link>
                  )}
                  {access.integracoes && (
                    <Link
                      href="/integracoes"
                      onClick={() => setOpenGroup(null)}
                      className={navItemClasses(isActive("integracoes"))}
                    >
                      <svg aria-hidden className="h-4 w-4" viewBox="0 0 20 20" fill="none">
                        <path d="M4 10h12M10 4v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      Integrações
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}
        </nav>
      </div>
      <div className="mt-auto space-y-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-slate-200">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 overflow-hidden rounded-full border border-slate-700 bg-slate-800 text-white">
              {avatarUrl ? (
                <Image src={avatarUrl} alt={userName} fill sizes="48px" className="object-cover" unoptimized />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-semibold">
                  {initials}
                </div>
              )}
            </div>
            <div>
              <p className="font-semibold text-white">{userName}</p>
              <p className="text-xs text-indigo-200">{roleLabel}</p>
            </div>
          </div>
          <div className="mt-3">
            <button
              type="button"
              onClick={handleAvatarClick}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-indigo-400/50"
            >
              Perfil
            </button>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2 text-sm font-semibold text-white transition hover:border-red-400 hover:text-red-200 hover:shadow-[0_10px_40px_-30px_rgba(248,113,113,0.6)]"
        >
          <svg aria-hidden className="h-4 w-4 text-red-300" viewBox="0 0 24 24" fill="none">
            <path d="M10 5h5a2 2 0 0 1 2 2v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path
              d="M15 14v3a2 2 0 0 1-2 2h-3a4 4 0 0 1-4-4V9a4 4 0 0 1 4-4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path d="M16 12h5m-3-3 3 3-3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Sair
        </button>
      </div>
      </aside>

      {isProfileOpen && (
        <div className="fixed inset-0 z-[9999] grid place-items-center bg-black/70 p-4">
          <div className="w-[min(520px,calc(100vw-32px))] max-h-[calc(100vh-32px)] overflow-auto rounded-2xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl backdrop-blur">
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-white">Perfil</h3>
              <p className="text-sm text-slate-400">Você pode alterar sua foto.</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="relative h-16 w-16 overflow-hidden rounded-full border border-slate-700 bg-slate-800 text-white">
                  {pendingAvatar || avatarUrl ? (
                    <Image
                      src={pendingAvatar || avatarUrl || ""}
                      alt={userName}
                      fill
                      sizes="64px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-semibold">
                      {initials}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm text-slate-200">Recomendado: 512×512 ou maior (PNG/JPG)</p>
                  <p className="text-xs text-slate-500">Máximo 2MB.</p>
                </div>
              </div>

              {avatarError && <p className="text-xs text-amber-200">{avatarError}</p>}

              <input
                ref={fileInputRef}
                id="profile-avatar-input"
                type="file"
                accept="image/*"
                onChange={handleAvatarFile}
                className="hidden"
              />
              <label
                htmlFor="profile-avatar-input"
                className="inline-flex w-full items-center justify-center rounded-lg border border-slate-700 bg-slate-800/70 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-indigo-400/50"
              >
                Enviar foto
              </label>
              {pendingAvatar && (
                <p className="text-xs text-slate-400">Arquivo selecionado.</p>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsProfileOpen(false);
                  setPendingAvatar(null);
                  setAvatarError(null);
                }}
                className="rounded-lg border border-slate-700 bg-slate-800/70 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500/60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!pendingAvatar) {
                    setIsProfileOpen(false);
                    return;
                  }
                  const img = new window.Image();
                  img.onload = () => {
                    const size = 256;
                    const canvas = document.createElement("canvas");
                    canvas.width = size;
                    canvas.height = size;
                    const ctx = canvas.getContext("2d");
                    if (!ctx) return;
                    ctx.drawImage(img, 0, 0, size, size);
                    const dataUrl = canvas.toDataURL("image/png");
                    setAvatarUrl(dataUrl);
                    try {
                      window.localStorage.setItem(`${storageKey}:avatar`, dataUrl);
                    } catch {}
                    setIsProfileOpen(false);
                    setPendingAvatar(null);
                  };
                  img.src = pendingAvatar;
                }}
                className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
