"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/modules/layout/components/Sidebar";
import "../../styles/pages/usuarios.css";
import { useAuth, type AccessArea } from "@/modules/auth/hooks/useAuth";
import { useRef } from "react";

const safeJson = async (res: Response) => {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { raw: text };
  }
};

const perfis = ["Administrador", "Consultor"] as const;

const CLIENT_NAME_DELIMITERS = /[-_:]/;

const inferClientNameFromUserName = (name: string) => {
  const trimmed = name.trim();
  if (!trimmed) return "";

  const parts = trimmed
    .split(CLIENT_NAME_DELIMITERS)
    .map((segment) => segment.trim())
    .filter(Boolean);

  const lastPart = parts.length > 1 ? parts[parts.length - 1] : "";
  const lastCandidate = lastPart
    .split(/\s+/)
    .map((segment) => segment.trim())
    .filter(Boolean)[0];

  if (lastCandidate) {
    return lastCandidate;
  }

  const fallbackWords = trimmed
    .split(/\s+/)
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (fallbackWords.length > 1) {
    return fallbackWords[fallbackWords.length - 1];
  }

  return "";
};

type UserRow = {
  id: string;
  email: string;
  created_at?: string;
  user_metadata?: { name?: string; user_profile?: string; allowed_areas?: AccessArea[]; client_name?: string };
  public?: Record<string, unknown>;
};
type RawUser = {
  auth_user_id?: string;
  id?: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  public?: Record<string, unknown>;
};

const ALL_AREAS: AccessArea[] = ["home", "comodato", "integracoes", "tarefas", "usuarios"];

export default function UsuariosPage() {
  const router = useRouter();
  const { session, loadingSession, logout, canAccess } = useAuth();

  const [form, setForm] = useState<{
    email: string;
    password: string;
    name: string;
    perfil: (typeof perfis)[number];
    clientName: string;
    allowedAreas: AccessArea[];
  }>({
    email: "",
    password: "",
    name: "",
    perfil: perfis[0],
    clientName: "",
    allowedAreas: ["home", "tarefas"],
  });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; message: string } | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPerfil, setEditingPerfil] = useState<typeof perfis[number]>("Consultor");
  const [editingName, setEditingName] = useState("");
  const [editingPassword, setEditingPassword] = useState("");
  const [allowedDropdownOpen, setAllowedDropdownOpen] = useState(false);
  const allowedDropdownRef = useRef<HTMLDivElement | null>(null);
  const [editingAllowedAreas, setEditingAllowedAreas] = useState<AccessArea[]>([]);
  const [editingAllowedOpen, setEditingAllowedOpen] = useState(false);
  const editingAllowedRef = useRef<HTMLDivElement | null>(null);
  const [editingClientName, setEditingClientName] = useState("");

  useEffect(() => {
    if (form.perfil === "Administrador") {
      setAllowedDropdownOpen(false);
    }
  }, [form.perfil]);

  useEffect(() => {
    if (!allowedDropdownOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (allowedDropdownRef.current && !allowedDropdownRef.current.contains(event.target as Node)) {
        setAllowedDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [allowedDropdownOpen]);

  useEffect(() => {
    if (!editingAllowedOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (editingAllowedRef.current && !editingAllowedRef.current.contains(event.target as Node)) {
        setEditingAllowedOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [editingAllowedOpen]);

  const ready = useMemo(() => {
    const basic = form.email.trim() && form.password.trim().length >= 8 && form.name.trim();
    if (form.perfil !== "Administrador") {
      return basic && form.clientName.trim().length > 0;
    }
    return basic;
  }, [form]);

  const suggestedClientName = useMemo(() => inferClientNameFromUserName(form.name), [form.name]);

  useEffect(() => {
    if (form.perfil === "Administrador") return;
    if (form.clientName.trim()) return;
    if (!suggestedClientName) return;
    setForm((prev) => ({ ...prev, clientName: suggestedClientName }));
  }, [form.clientName, form.perfil, suggestedClientName]);

  const loadUsers = async (pageToLoad = page) => {
    setLoadingList(true);
    setFeedback(null);
    try {
      const token = session?.accessToken;
      if (!token) {
        throw new Error("missing_bearer");
      }
      const response = await fetch(`/api/admin/users?page=${pageToLoad}&per_page=50`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await safeJson(response);
      if (!response.ok) {
        throw new Error(data?.error ?? "Falha ao listar usuários.");
      }
      const raw = Array.isArray(data?.users) ? (data.users as RawUser[]) : [];
      const list: UserRow[] = raw.map((item) => ({
        id: item.auth_user_id ?? item.id ?? "",
        email: item.email ?? "",
        user_metadata: item.user_metadata ?? {},
        public: item.public ?? {},
      }));
      setUsers(list);
      setPage(pageToLoad);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao listar usuários.";
      setFeedback({ type: "error", message });
    } finally {
      setLoadingList(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFeedback(null);
    const emailValid = /\S+@\S+\.\S+/.test(form.email);
    if (!emailValid) {
      setFeedback({ type: "error", message: "E-mail inválido." });
      return;
    }
    if (form.password.trim().length < 8) {
      setFeedback({ type: "error", message: "A senha deve ter ao menos 8 caracteres." });
      return;
    }
    if (!ready) return;
    setSubmitting(true);
    try {
      const token = session?.accessToken;
      if (!token) {
        throw new Error("missing_bearer");
      }
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password.trim(),
          name: form.name.trim(),
          user_profile: form.perfil,
          auth: {
            user_metadata: {
              name: form.name.trim(),
              user_profile: form.perfil,
              client_name: form.perfil === "Administrador" ? undefined : form.clientName.trim(),
              allowed_areas: form.allowedAreas,
            },
          },
          public: {
            name: form.name.trim(),
            user_profile: form.perfil,
            client_name: form.perfil === "Administrador" ? undefined : form.clientName.trim(),
            allowed_areas: form.allowedAreas,
          },
        }),
      });
      const data = await safeJson(response);
      if (!response.ok) {
        throw new Error(data?.error ?? "Falha ao criar usuário.");
      }
      setFeedback({ type: "ok", message: "Usuário criado com sucesso." });
      setForm((prev) => ({ ...prev, password: "" }));
      loadUsers(1);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao criar usuário.";
      setFeedback({ type: "error", message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (id: string) => {
    setFeedback(null);
    setRemovingId(id);
    try {
      const token = session?.accessToken;
      if (!token) {
        throw new Error("missing_bearer");
      }
      const response = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ target_auth_user_id: id }),
      });
      const data = await safeJson(response);
      if (!response.ok) {
        throw new Error(data?.error ?? "Erro ao remover usuário.");
      }
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setFeedback({ type: "ok", message: "Usuário removido." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao remover usuário.";
      setFeedback({ type: "error", message });
    } finally {
      setRemovingId(null);
    }
  };

  const startEdit = (user: UserRow) => {
    setEditingId(user.id);
    const perfil =
      (user.user_metadata?.user_profile as typeof perfis[number] | undefined) ||
      (user.public?.user_profile as typeof perfis[number] | undefined) ||
      "Consultor";
    const nome = (user.user_metadata?.name as string | undefined) || (user.public?.name as string | undefined) || "";
    const client =
      (user.user_metadata?.client_name as string | undefined) ||
      (user.public?.client_name as string | undefined) ||
      "";
    const areasRaw =
      (user.user_metadata?.allowed_areas as AccessArea[] | undefined) ||
      (user.public?.allowed_areas as AccessArea[] | undefined) ||
      ["home", "tarefas"];
    setEditingPerfil(perfil);
    setEditingName(nome);
    setEditingPassword("");
    setEditingClientName(client);
    setEditingAllowedAreas(perfil === "Administrador" ? ALL_AREAS : areasRaw.filter((a) => ALL_AREAS.includes(a)));
    setEditingAllowedOpen(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingPerfil("Consultor");
    setEditingName("");
    setEditingPassword("");
    setEditingClientName("");
    setEditingAllowedOpen(false);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setFeedback(null);
    setSubmitting(true);
    try {
      const token = session?.accessToken;
      if (!token) {
        throw new Error("missing_bearer");
      }
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          target_auth_user_id: editingId,
          auth: {
            user_metadata: {
              name: editingName,
              user_profile: editingPerfil,
              allowed_areas: editingPerfil === "Administrador" ? ALL_AREAS : editingAllowedAreas,
              client_name: editingPerfil === "Administrador" ? undefined : editingClientName.trim() || undefined,
            },
            ...(editingPassword.trim() ? { password: editingPassword.trim() } : {}),
          },
          public: {
            name: editingName,
            user_profile: editingPerfil,
            allowed_areas: editingPerfil === "Administrador" ? ALL_AREAS : editingAllowedAreas,
            client_name: editingPerfil === "Administrador" ? undefined : editingClientName.trim() || undefined,
          },
        }),
      });
      const data = await safeJson(response);
      if (!response.ok) {
        throw new Error(data?.error ?? "Erro ao atualizar usuário.");
      }
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id !== editingId) return u;
          return {
            ...u,
            user_metadata: {
              ...(u.user_metadata ?? {}),
              ...(data?.auth?.user_metadata ?? {}),
              name: editingName,
              user_profile: editingPerfil,
            },
            public: data?.public ?? u.public,
          };
        })
      );
      setFeedback({ type: "ok", message: "Perfil atualizado." });
      cancelEdit();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao atualizar usuário.";
      setFeedback({ type: "error", message });
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!loadingSession && !session) {
      router.replace("/auth");
      return;
    }
    if (!loadingSession && session && !canAccess("usuarios")) {
      router.replace("/tarefas");
      return;
    }
    if (!loadingSession && session?.accessToken) {
      loadUsers(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingSession, session, canAccess, router]);

  const filteredUsers = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return users;
    return users.filter((u) => {
      const name = (u.user_metadata?.name ?? "").toLowerCase();
      const profile = (u.user_metadata?.user_profile ?? "").toLowerCase();
      return u.email.toLowerCase().includes(term) || name.includes(term) || profile.includes(term);
    });
  }, [filter, users]);

  const gridTemplateColumns =
    "minmax(220px,1.2fr) minmax(420px,1.5fr) minmax(300px,1.1fr)";

  if (loadingSession || (!session && !loadingSession)) {
    return (
      <div className="page page--usuarios flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/50 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="page page--usuarios">
      <main className="flex min-h-screen w-full bg-slate-950">
        <Sidebar
          userName={session?.name ?? "Administrador"}
          userRole={session?.role ?? "consultor"}
          onLogout={logout}
          current="usuarios"
        />

      <div className="min-h-screen flex-1 pl-72 pr-8 py-10">
        <section className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.8)]">
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="text-sm uppercase tracking-[0.25em] text-indigo-300">Admin</p>
            <h1 className="text-2xl font-semibold text-white">Criar novo usuário</h1>
            <p className="text-slate-300">
              Somente administradores. Os dados são enviados direto para o Supabase (rota admin/users).
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm text-slate-200">
                E-mail
                <input
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  type="email"
                  required
                  className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none ring-2 ring-transparent transition focus:border-indigo-400 focus:ring-indigo-500/30"
                  placeholder="usuario@empresa.com"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-200">
                Senha
                <input
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  type="password"
                  required
                  className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none ring-2 ring-transparent transition focus:border-indigo-400 focus:ring-indigo-500/30"
                  placeholder="Mínimo 8 caracteres"
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm text-slate-200">
                Nome completo
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  required
                  className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none ring-2 ring-transparent transition focus:border-indigo-400 focus:ring-indigo-500/30"
                  placeholder="Nome e sobrenome"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-200">
                Perfil
                <select
                  value={form.perfil}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      perfil: e.target.value as typeof perfis[number],
                      allowedAreas:
                        e.target.value === "Administrador"
                          ? ALL_AREAS
                          : prev.allowedAreas.length
                            ? prev.allowedAreas.filter((area) => ALL_AREAS.includes(area))
                            : ["tarefas"],
                    }))
                  }
                  className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none ring-2 ring-transparent transition focus:border-indigo-400 focus:ring-indigo-500/30"
                >
                  {perfis.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              {form.perfil !== "Administrador" && (
                <label className="flex flex-col gap-1 text-sm text-slate-200">
                  Cliente (associação para filtro)
                  <input
                    value={form.clientName}
                    onChange={(e) => setForm((prev) => ({ ...prev, clientName: e.target.value }))}
                    required
                    className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none ring-2 ring-transparent transition focus:border-indigo-400 focus:ring-indigo-500/30"
                    placeholder="Ex.: Loga, Dinâmica, ..."
                  />
                  <span className="text-[11px] text-slate-500">
                    Usado para filtrar tarefas automaticamente para usuários cliente.
                  </span>
                  {suggestedClientName && (
                    <p className="text-[11px] text-slate-500">
                      Cliente sugerido pelo nome: <strong>{suggestedClientName}</strong>.
                    </p>
                  )}
                </label>
              )}
              <div className="md:col-span-2 rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-3 text-sm text-slate-200">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="mb-1 text-xs uppercase tracking-[0.2em] text-indigo-300">Acessos permitidos</p>
                    <p className="text-[11px] text-slate-500">Escolha as áreas liberadas para este usuário.</p>
                  </div>
                  <div className="relative" ref={allowedDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setAllowedDropdownOpen((open) => !open)}
                      disabled={form.perfil === "Administrador"}
                      className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-indigo-400/60 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {form.perfil === "Administrador"
                        ? "Todos habilitados (admin)"
                        : form.allowedAreas.length
                          ? `${form.allowedAreas.length} selecionados`
                          : "Selecionar acessos"}
                      <span className="text-slate-400">▼</span>
                    </button>
                    {allowedDropdownOpen && form.perfil !== "Administrador" ? (
                      <div className="absolute right-0 z-20 mt-2 w-64 rounded-lg border border-slate-800 bg-slate-900/95 p-2 shadow-lg">
                        {ALL_AREAS.map((area) => {
                          const checked = form.allowedAreas.includes(area);
                          return (
                            <label
                              key={area}
                              className="flex items-center gap-2 rounded-md px-2 py-2 text-xs text-slate-200 transition hover:bg-slate-800/80"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  const value = e.target.checked;
                                  setForm((prev) => {
                                    if (prev.perfil === "Administrador") return prev;
                                    const next = new Set(prev.allowedAreas);
                                    if (value) next.add(area);
                                    else next.delete(area);
                                    return { ...prev, allowedAreas: Array.from(next) as AccessArea[] };
                                  });
                                }}
                              />
                              <span className="capitalize">{area}</span>
                            </label>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-slate-400">
                <p>Após criar, o usuário já consegue logar com e-mail e senha informados.</p>
              </div>
              <button
                type="submit"
                disabled={!ready || submitting}
                className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-500/60"
              >
                {submitting && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
                )}
                Criar usuário
              </button>
            </div>
          </form>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-[0_15px_50px_-40px_rgba(0,0,0,0.8)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-indigo-300">Usuários cadastrados</p>
                <p className="text-sm text-slate-300">Busca rápida por e-mail, nome ou perfil.</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Filtrar..."
                  className="w-44 rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none ring-2 ring-transparent transition focus:border-indigo-400 focus:ring-indigo-500/30"
                />
                <button
                  type="button"
                  onClick={() => loadUsers(page)}
                  className="rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm font-semibold text-white transition hover:border-indigo-400/40"
                >
                  {loadingList ? "Atualizando..." : "Atualizar"}
                </button>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
              <span>Página: {page}</span>
              <button
                type="button"
                onClick={() => loadUsers(Math.max(1, page - 1))}
                className="rounded-md border border-slate-700 bg-slate-800/70 px-2 py-1 font-semibold text-white transition hover:border-indigo-400/40 disabled:opacity-50"
                disabled={page <= 1}
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => loadUsers(page + 1)}
                className="rounded-md border border-slate-700 bg-slate-800/70 px-2 py-1 font-semibold text-white transition hover:border-indigo-400/40"
              >
                Próxima
              </button>
              <span className="text-slate-500">(50 por página)</span>
            </div>

            <div className="mt-4 overflow-x-auto overflow-y-visible rounded-xl border border-slate-800 users-table">
              <div
                className="grid gap-2 border-b border-slate-800 bg-slate-900/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 text-center justify-items-center users-grid"
                style={{ gridTemplateColumns }}
              >
                <span className="w-full pl-2 text-left">E-mail</span>
                <span>Perfil</span>
                <span>Ações</span>
              </div>
              <div className="divide-y divide-slate-800">
                {filteredUsers.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-slate-400">
                    {loadingList ? "Carregando usuários..." : "Nenhum usuário listado."}
                  </div>
                ) : (
                  filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className="grid items-center gap-3 px-4 py-3 text-base text-slate-100 text-center justify-items-center users-grid"
                      style={{ gridTemplateColumns }}
                    >
                      <span className="w-full truncate text-left text-[15px] font-medium">{user.email}</span>
                      <div className="flex w-full flex-col items-center justify-center gap-2">
                        {editingId === user.id ? (
                          <div className="flex w-full max-w-[780px] flex-wrap items-center justify-center gap-2">
                            <input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              placeholder="Nome"
                              className="min-w-[160px] flex-1 rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm text-white outline-none text-center ring-2 ring-transparent transition focus:border-indigo-400 focus:ring-indigo-500/30"
                            />
                            <select
                              value={editingPerfil}
                              onChange={(e) =>
                                setEditingPerfil(e.target.value as typeof perfis[number])
                              }
                              className="min-w-[160px] flex-1 rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm text-white outline-none text-center ring-2 ring-transparent transition focus:border-indigo-400 focus:ring-indigo-500/30"
                            >
                              {perfis.map((p) => (
                                <option key={p} value={p}>
                                  {p}
                                </option>
                              ))}
                            </select>
                            <input
                              value={editingPassword}
                              onChange={(e) => setEditingPassword(e.target.value)}
                              type="password"
                              placeholder="Nova senha (opcional)"
                              className="min-w-[180px] flex-1 rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm text-white outline-none text-center ring-2 ring-transparent transition focus:border-indigo-400 focus:ring-indigo-500/30"
                            />
                            {editingPerfil !== "Administrador" ? (
                              <input
                                value={editingClientName}
                                onChange={(e) => setEditingClientName(e.target.value)}
                                placeholder="Cliente (associação)"
                                className="min-w-[180px] flex-1 rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm text-white outline-none text-center ring-2 ring-transparent transition focus:border-indigo-400 focus:ring-indigo-500/30"
                              />
                            ) : null}
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            <span className="truncate text-center text-[15px] font-semibold text-white">
                              {(user.user_metadata?.name as string | undefined) ||
                                (user.public?.name as string | undefined) ||
                                "Sem nome"}
                            </span>
                            <span className="truncate rounded-md border border-slate-700 bg-slate-800/70 px-3 py-1.5 text-sm font-medium text-slate-100">
                              {(user.user_metadata?.user_profile as string | undefined) ||
                                (user.public?.user_profile as string | undefined) ||
                                "Consultor"}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        {editingId === user.id ? (
                          <>
                            <div className="relative" ref={editingAllowedRef}>
                              <button
                                type="button"
                                onClick={() => setEditingAllowedOpen((open) => !open)}
                                disabled={editingPerfil === "Administrador"}
                                className="min-w-[140px] whitespace-nowrap rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:border-indigo-400/50 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {editingPerfil === "Administrador"
                                  ? "Todos (admin)"
                                  : `${editingAllowedAreas.length || 0} acessos`}
                                <span className="ml-2 text-slate-400">▼</span>
                              </button>
                              {editingAllowedOpen && editingPerfil !== "Administrador" ? (
                                <div className="absolute left-0 z-30 mt-2 max-h-56 w-56 overflow-auto rounded-lg border border-slate-700 bg-slate-900/98 p-2 shadow-xl editing-areas-menu">
                                  {ALL_AREAS.map((area) => {
                                    const checked = editingAllowedAreas.includes(area);
                                    return (
                                      <label
                                        key={area}
                                        className="flex items-center gap-2 rounded-md px-2 py-2 text-xs text-slate-200 transition hover:bg-slate-800/80"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={(e) => {
                                            const value = e.target.checked;
                                            setEditingAllowedAreas((prev) => {
                                              const next = new Set(prev);
                                              if (value) next.add(area);
                                              else next.delete(area);
                                              return Array.from(next) as AccessArea[];
                                            });
                                          }}
                                        />
                                        <span className="capitalize">{area}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={saveEdit}
                                disabled={submitting}
                                className="min-w-[110px] rounded-lg border border-emerald-400/60 bg-emerald-600/80 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                {submitting ? "Salvando..." : "Salvar"}
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="min-w-[110px] rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:border-slate-500/60 hover:bg-slate-800"
                              >
                                Cancelar
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(user)}
                              className="min-w-[110px] rounded-lg border border-indigo-400/60 bg-indigo-600/80 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemove(user.id)}
                              disabled={removingId === user.id}
                              className="min-w-[110px] rounded-lg border border-red-500/60 bg-red-600/80 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              {removingId === user.id ? "Removendo..." : "Remover"}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {feedback && (
            <div
              className={`rounded-lg px-4 py-3 text-sm ${
                feedback.type === "ok"
                  ? "border border-emerald-500/50 bg-emerald-500/10 text-emerald-100"
                  : "border border-red-500/50 bg-red-500/10 text-red-100"
              }`}
            >
              {feedback.message}
            </div>
          )}
        </section>
      </div>
      </main>
    </div>
  );
}





