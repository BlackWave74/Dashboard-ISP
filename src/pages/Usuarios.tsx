import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth, type AccessArea, ACCESS_RULES } from "@/modules/auth/hooks/useAuth";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase";
import {
  UserPlus,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  Save,
  X,
  Shield,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
} from "lucide-react";

/* ─── Types ─── */
const perfis = ["Administrador", "Consultor"] as const;
type Perfil = (typeof perfis)[number];

const ALL_AREAS: AccessArea[] = ["home", "comodato", "integracoes", "tarefas", "usuarios"];

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

/* ─── Helpers ─── */
const safeJson = async (res: Response) => {
  const text = await res.text();
  try { return text ? JSON.parse(text) : null; } catch { return { raw: text }; }
};

const inferClientName = (name: string) => {
  const parts = name.trim().split(/[-_:]/). map(s => s.trim()).filter(Boolean);
  const last = parts.length > 1 ? parts[parts.length - 1].split(/\s+/)[0] : "";
  if (last) return last;
  const words = name.trim().split(/\s+/);
  return words.length > 1 ? words[words.length - 1] : "";
};

/* ─── Styles ─── */
const inputClass = "h-9 rounded-lg border border-[hsl(var(--task-border))] bg-[hsl(var(--task-bg))] px-3 text-sm text-[hsl(var(--task-text))] outline-none transition focus:border-[hsl(var(--task-purple)/0.6)] focus:ring-1 focus:ring-[hsl(var(--task-purple)/0.2)] placeholder:text-[hsl(var(--task-text-muted)/0.4)]";
const selectClass = `${inputClass} appearance-none cursor-pointer`;
const btnPrimary = "flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50";
const btnSecondary = "flex items-center gap-1.5 rounded-lg border border-[hsl(var(--task-border))] bg-[hsl(var(--task-surface))] px-3 py-2 text-xs font-medium text-[hsl(var(--task-text-muted))] transition hover:border-[hsl(var(--task-purple)/0.4)] hover:text-[hsl(var(--task-text))]";

export default function UsuariosPage() {
  const navigate = useNavigate();
  const { session, loadingSession, canAccess } = useAuth();
  const isAdmin = session?.role === "admin" || session?.role === "gerente" || session?.role === "coordenador";

  // Redirect non-admins
  useEffect(() => {
    if (!loadingSession && !session) { navigate("/login"); return; }
    if (!loadingSession && session && !isAdmin) { navigate("/"); return; }
  }, [loadingSession, session, isAdmin, navigate]);

  /* ─── Form state ─── */
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    perfil: "Consultor" as Perfil,
    clientName: "",
    allowedAreas: ["home", "tarefas"] as AccessArea[],
  });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; message: string } | null>(null);

  /* ─── Users list state ─── */
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [removingId, setRemovingId] = useState<string | null>(null);

  /* ─── Edit state ─── */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", perfil: "Consultor" as Perfil, password: "", clientName: "", allowedAreas: [] as AccessArea[] });
  const [editAreasOpen, setEditAreasOpen] = useState(false);
  const editAreasRef = useRef<HTMLDivElement>(null);
  const [createAreasOpen, setCreateAreasOpen] = useState(false);
  const createAreasRef = useRef<HTMLDivElement>(null);

  const suggestedClient = useMemo(() => inferClientName(form.name), [form.name]);

  useEffect(() => {
    if (form.perfil === "Administrador" || form.clientName.trim()) return;
    if (suggestedClient) setForm(p => ({ ...p, clientName: suggestedClient }));
  }, [suggestedClient, form.perfil, form.clientName]);

  const ready = useMemo(() => {
    const basic = form.email.trim() && form.password.trim().length >= 8 && form.name.trim();
    return form.perfil === "Administrador" ? basic : basic && form.clientName.trim().length > 0;
  }, [form]);

  // Close dropdowns on outside click
  useEffect(() => {
    if (!createAreasOpen) return;
    const handler = (e: MouseEvent) => { if (createAreasRef.current && !createAreasRef.current.contains(e.target as Node)) setCreateAreasOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [createAreasOpen]);

  useEffect(() => {
    if (!editAreasOpen) return;
    const handler = (e: MouseEvent) => { if (editAreasRef.current && !editAreasRef.current.contains(e.target as Node)) setEditAreasOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [editAreasOpen]);

  /* ─── API calls ─── */
  const token = session?.accessToken;
  const headers = useMemo(() => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  const loadUsers = useCallback(async (p = 1) => {
    if (!token) return;
    setLoadingList(true);
    setFeedback(null);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-users?page=${p}&per_page=50`, { headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY } });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.error ?? "Falha ao listar usuários.");
      const raw = Array.isArray(data?.users) ? (data.users as RawUser[]) : [];
      setUsers(raw.map(item => ({
        id: item.auth_user_id ?? item.id ?? "",
        email: item.email ?? "",
        user_metadata: (item.user_metadata ?? {}) as UserRow["user_metadata"],
        public: item.public ?? {},
      })));
      setPage(p);
    } catch (err) {
      setFeedback({ type: "error", message: err instanceof Error ? err.message : "Falha ao listar." });
    } finally {
      setLoadingList(false);
    }
  }, [token]);

  useEffect(() => { if (!loadingSession && token && isAdmin) loadUsers(1); }, [loadingSession, token, isAdmin, loadUsers]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ready || !token) return;
    setFeedback(null);
    setSubmitting(true);
    try {
      const body = {
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
      };
      const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-users`, {
        method: "POST",
        headers: { ...headers, apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify(body),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.error ?? "Falha ao criar usuário.");
      setFeedback({ type: "ok", message: "Usuário criado com sucesso." });
      setForm(p => ({ ...p, password: "", email: "", name: "", clientName: "" }));
      loadUsers(1);
    } catch (err) {
      setFeedback({ type: "error", message: err instanceof Error ? err.message : "Erro." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!token) return;
    setFeedback(null);
    setRemovingId(id);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-users`, {
        method: "DELETE",
        headers: { ...headers, apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify({ target_auth_user_id: id }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.error ?? "Erro ao remover.");
      setUsers(prev => prev.filter(u => u.id !== id));
      setFeedback({ type: "ok", message: "Usuário removido." });
    } catch (err) {
      setFeedback({ type: "error", message: err instanceof Error ? err.message : "Erro." });
    } finally {
      setRemovingId(null);
    }
  };

  const startEdit = (user: UserRow) => {
    setEditingId(user.id);
    const perfil = (user.user_metadata?.user_profile as Perfil) || "Consultor";
    setEditForm({
      name: user.user_metadata?.name || "",
      perfil,
      password: "",
      clientName: user.user_metadata?.client_name || (user.public?.client_name as string) || "",
      allowedAreas: perfil === "Administrador" ? ALL_AREAS : (user.user_metadata?.allowed_areas || ["home", "tarefas"]),
    });
    setEditAreasOpen(false);
  };

  const cancelEdit = () => { setEditingId(null); setEditAreasOpen(false); };

  const saveEdit = async () => {
    if (!editingId || !token) return;
    setFeedback(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-users`, {
        method: "PATCH",
        headers: { ...headers, apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify({
          target_auth_user_id: editingId,
          auth: {
            user_metadata: {
              name: editForm.name,
              user_profile: editForm.perfil,
              allowed_areas: editForm.perfil === "Administrador" ? ALL_AREAS : editForm.allowedAreas,
              client_name: editForm.perfil === "Administrador" ? undefined : editForm.clientName.trim() || undefined,
            },
            ...(editForm.password.trim() ? { password: editForm.password.trim() } : {}),
          },
          public: {
            name: editForm.name,
            user_profile: editForm.perfil,
            allowed_areas: editForm.perfil === "Administrador" ? ALL_AREAS : editForm.allowedAreas,
            client_name: editForm.perfil === "Administrador" ? undefined : editForm.clientName.trim() || undefined,
          },
        }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.error ?? "Erro ao atualizar.");
      setUsers(prev => prev.map(u => u.id !== editingId ? u : {
        ...u,
        user_metadata: { ...(u.user_metadata ?? {}), name: editForm.name, user_profile: editForm.perfil },
        public: data?.public ?? u.public,
      }));
      setFeedback({ type: "ok", message: "Perfil atualizado." });
      cancelEdit();
    } catch (err) {
      setFeedback({ type: "error", message: err instanceof Error ? err.message : "Erro." });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return users;
    return users.filter(u => {
      const name = (u.user_metadata?.name ?? "").toLowerCase();
      const profile = (u.user_metadata?.user_profile ?? "").toLowerCase();
      return u.email.toLowerCase().includes(term) || name.includes(term) || profile.includes(term);
    });
  }, [filter, users]);

  if (loadingSession || (!session && !loadingSession)) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--task-purple))]" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] w-full" style={{ background: "linear-gradient(165deg, hsl(270 60% 10%), hsl(234 45% 6%))" }}>
      <div className="mx-auto w-full max-w-[1400px] space-y-6 p-5 md:p-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(262_83%_58%)] to-[hsl(234_89%_64%)] shadow-lg shadow-[hsl(262_83%_58%/0.25)]">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[hsl(var(--task-text))]">Gestão de Usuários</h1>
              <p className="text-sm text-[hsl(var(--task-text-muted))]">Criar, editar e gerenciar acessos dos usuários do sistema.</p>
            </div>
          </div>
        </motion.div>

        {/* Feedback */}
        {feedback && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
            className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
              feedback.type === "ok"
                ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border border-rose-500/30 bg-rose-500/10 text-rose-300"
            }`}
          >
            {feedback.type === "error" && <AlertCircle className="h-4 w-4 shrink-0" />}
            {feedback.message}
          </motion.div>
        )}

        {/* Create user form */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl border border-[hsl(var(--task-border))] bg-[hsl(var(--task-surface))] p-6"
        >
          <div className="flex items-center gap-2 mb-5">
            <UserPlus className="h-5 w-5 text-[hsl(var(--task-purple))]" />
            <h2 className="text-lg font-bold text-[hsl(var(--task-text))]">Criar novo usuário</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-medium text-[hsl(var(--task-text-muted))]">
                E-mail
                <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} type="email" required className={inputClass} placeholder="usuario@empresa.com" />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-[hsl(var(--task-text-muted))]">
                Senha
                <input value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} type="password" required className={inputClass} placeholder="Mínimo 8 caracteres" />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-medium text-[hsl(var(--task-text-muted))]">
                Nome completo
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required className={inputClass} placeholder="Nome e sobrenome" />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-[hsl(var(--task-text-muted))]">
                Perfil
                <select value={form.perfil} onChange={e => setForm(p => ({
                  ...p,
                  perfil: e.target.value as Perfil,
                  allowedAreas: e.target.value === "Administrador" ? ALL_AREAS : p.allowedAreas,
                }))} className={selectClass}>
                  {perfis.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
            </div>

            {form.perfil !== "Administrador" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs font-medium text-[hsl(var(--task-text-muted))]">
                  Cliente (associação)
                  <input value={form.clientName} onChange={e => setForm(p => ({ ...p, clientName: e.target.value }))} required className={inputClass} placeholder="Ex.: Loga, Dinâmica..." />
                  {suggestedClient && <span className="text-[10px] text-[hsl(var(--task-text-muted)/0.5)]">Sugerido: <strong>{suggestedClient}</strong></span>}
                </label>
                <div className="flex flex-col gap-1 text-xs font-medium text-[hsl(var(--task-text-muted))]">
                  Acessos permitidos
                  <div className="relative" ref={createAreasRef}>
                    <button type="button" onClick={() => setCreateAreasOpen(o => !o)}
                      className={`${inputClass} w-full text-left flex items-center justify-between`}
                    >
                      <span>{form.allowedAreas.length} selecionados</span>
                      <span className="text-[hsl(var(--task-text-muted))]">▼</span>
                    </button>
                    {createAreasOpen && (
                      <div className="absolute left-0 z-30 mt-1 w-full rounded-lg border border-[hsl(var(--task-border))] bg-[hsl(var(--task-surface))] p-2 shadow-xl">
                        {ALL_AREAS.map(area => (
                          <label key={area} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-[hsl(var(--task-text))] hover:bg-[hsl(var(--task-bg))] cursor-pointer">
                            <input type="checkbox" checked={form.allowedAreas.includes(area)}
                              onChange={e => setForm(p => {
                                const set = new Set(p.allowedAreas);
                                e.target.checked ? set.add(area) : set.delete(area);
                                return { ...p, allowedAreas: Array.from(set) as AccessArea[] };
                              })}
                            />
                            <span className="capitalize">{area}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-[hsl(var(--task-text-muted)/0.5)]">Após criar, o usuário já pode logar.</p>
              <button type="submit" disabled={!ready || submitting} className={btnPrimary}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                <UserPlus className="h-4 w-4" />
                Criar usuário
              </button>
            </div>
          </form>
        </motion.div>

        {/* Users list */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-2xl border border-[hsl(var(--task-border))] bg-[hsl(var(--task-surface))] p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-[hsl(var(--task-text))]">Usuários cadastrados</h2>
              <p className="text-xs text-[hsl(var(--task-text-muted))]">Busca por e-mail, nome ou perfil.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[hsl(var(--task-text-muted))]" />
                <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filtrar..." className={`${inputClass} pl-8 w-44`} />
              </div>
              <button type="button" onClick={() => loadUsers(page)} className={btnSecondary}>
                <RefreshCw className={`h-3.5 w-3.5 ${loadingList ? "animate-spin" : ""}`} />
                {loadingList ? "..." : "Atualizar"}
              </button>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center gap-2 mb-3 text-xs text-[hsl(var(--task-text-muted))]">
            <span>Página {page}</span>
            <button onClick={() => loadUsers(Math.max(1, page - 1))} disabled={page <= 1} className={`${btnSecondary} !px-2 !py-1 disabled:opacity-30`}>
              <ChevronLeft className="h-3 w-3" />
            </button>
            <button onClick={() => loadUsers(page + 1)} className={`${btnSecondary} !px-2 !py-1`}>
              <ChevronRight className="h-3 w-3" />
            </button>
            <span className="text-[hsl(var(--task-text-muted)/0.4)]">(50/página)</span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-[hsl(var(--task-border))]">
            {/* Header */}
            <div className="grid grid-cols-[1fr_1.2fr_auto] gap-3 border-b border-[hsl(var(--task-border))] bg-[hsl(var(--task-bg))] px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--task-text-muted))]">
              <span>E-mail</span>
              <span className="text-center">Perfil / Nome</span>
              <span className="text-center">Ações</span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-[hsl(var(--task-border)/0.5)]">
              {filteredUsers.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-[hsl(var(--task-text-muted))]">
                  {loadingList ? "Carregando..." : "Nenhum usuário encontrado."}
                </div>
              ) : filteredUsers.map(user => (
                <div key={user.id} className="grid grid-cols-[1fr_1.2fr_auto] items-center gap-3 px-4 py-3 hover:bg-[hsl(var(--task-bg)/0.5)] transition">
                  <span className="truncate text-sm text-[hsl(var(--task-text))]">{user.email}</span>

                  {editingId === user.id ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} placeholder="Nome" className={`${inputClass} min-w-[140px] flex-1`} />
                      <select value={editForm.perfil} onChange={e => setEditForm(p => ({ ...p, perfil: e.target.value as Perfil }))} className={`${selectClass} min-w-[130px]`}>
                        {perfis.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <input value={editForm.password} onChange={e => setEditForm(p => ({ ...p, password: e.target.value }))} type="password" placeholder="Nova senha (opcional)" className={`${inputClass} min-w-[160px] flex-1`} />
                      {editForm.perfil !== "Administrador" && (
                        <input value={editForm.clientName} onChange={e => setEditForm(p => ({ ...p, clientName: e.target.value }))} placeholder="Cliente" className={`${inputClass} min-w-[130px] flex-1`} />
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <span className="text-sm font-semibold text-[hsl(var(--task-text))]">{user.user_metadata?.name || "Sem nome"}</span>
                      <span className="rounded-md border border-[hsl(var(--task-border))] bg-[hsl(var(--task-bg))] px-2 py-0.5 text-xs text-[hsl(var(--task-text-muted))]">
                        {user.user_metadata?.user_profile || "Consultor"}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-2">
                    {editingId === user.id ? (
                      <>
                        {editForm.perfil !== "Administrador" && (
                          <div className="relative" ref={editAreasRef}>
                            <button type="button" onClick={() => setEditAreasOpen(o => !o)}
                              className={`${btnSecondary} !text-[10px]`}
                            >
                              {editForm.allowedAreas.length} acessos ▼
                            </button>
                            {editAreasOpen && (
                              <div className="absolute right-0 z-30 mt-1 w-48 rounded-lg border border-[hsl(var(--task-border))] bg-[hsl(var(--task-surface))] p-2 shadow-xl">
                                {ALL_AREAS.map(area => (
                                  <label key={area} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-[hsl(var(--task-text))] hover:bg-[hsl(var(--task-bg))] cursor-pointer">
                                    <input type="checkbox" checked={editForm.allowedAreas.includes(area)}
                                      onChange={e => setEditForm(p => {
                                        const set = new Set(p.allowedAreas);
                                        e.target.checked ? set.add(area) : set.delete(area);
                                        return { ...p, allowedAreas: Array.from(set) as AccessArea[] };
                                      })}
                                    />
                                    <span className="capitalize">{area}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        <button onClick={saveEdit} disabled={submitting} className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-400 disabled:opacity-50">
                          <Save className="h-3 w-3" />
                          {submitting ? "..." : "Salvar"}
                        </button>
                        <button onClick={cancelEdit} className={btnSecondary}>
                          <X className="h-3 w-3" /> Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(user)} className="flex items-center gap-1 rounded-lg border border-[hsl(var(--task-purple)/0.3)] bg-[hsl(var(--task-purple)/0.1)] px-3 py-1.5 text-xs font-medium text-[hsl(var(--task-purple))] hover:bg-[hsl(var(--task-purple)/0.2)] transition">
                          <Pencil className="h-3 w-3" /> Editar
                        </button>
                        <button onClick={() => handleRemove(user.id)} disabled={removingId === user.id}
                          className="flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-400 hover:bg-rose-500/20 transition disabled:opacity-50"
                        >
                          <Trash2 className="h-3 w-3" /> {removingId === user.id ? "..." : "Remover"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
