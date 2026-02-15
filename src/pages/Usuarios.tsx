import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase";
import {
  Users,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  Save,
  X,
  Shield,
  Loader2,
  AlertCircle,
  CheckCircle2,
  UserPlus,
  Mail,
  User,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";

/* ─── Types ─── */
const perfis = ["Administrador", "Consultor", "Gerente", "Coordenador", "Cliente"] as const;
type Perfil = (typeof perfis)[number];

const perfilToRole: Record<Perfil, string> = {
  Administrador: "admin",
  Consultor: "consultor",
  Gerente: "gerente",
  Coordenador: "coordenador",
  Cliente: "cliente",
};

type UserRow = {
  id: string;
  auth_user_id: string;
  email: string;
  name: string;
  user_profile: string;
  active: boolean;
  role?: string; // from user_roles
};

/* ─── Helpers ─── */
const safeJson = async (res: Response) => {
  const text = await res.text();
  try { return text ? JSON.parse(text) : null; } catch { return { raw: text }; }
};

const supabaseRest = async (
  path: string,
  token: string,
  options: RequestInit = {}
) => {
  const base = SUPABASE_URL.replace(/\/$/, "");
  const res = await fetch(`${base}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers as Record<string, string> || {}),
    },
  });
  if (!res.ok) {
    const data = await safeJson(res);
    throw new Error(data?.message ?? data?.error ?? `HTTP ${res.status}`);
  }
  return res;
};

/* ─── Component ─── */
export default function UsuariosPage() {
  const navigate = useNavigate();
  const { session, loadingSession } = useAuth();
  const isAdmin = session?.role === "admin" || session?.role === "gerente" || session?.role === "coordenador";

  useEffect(() => {
    if (!loadingSession && !session) { navigate("/login"); return; }
    if (!loadingSession && session && !isAdmin) { navigate("/"); return; }
  }, [loadingSession, session, isAdmin, navigate]);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [filter, setFilter] = useState("");
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; message: string } | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<UserRow>>({});

  // Create state
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", email: "", user_profile: "Consultor" as Perfil });
  const [creating, setCreating] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const token = session?.accessToken;

  const showFeedback = (type: "ok" | "error", message: string) => {
    setFeedback({ type, message });
    if (type === "ok") setTimeout(() => setFeedback(null), 4000);
  };

  /* ─── Load users ─── */
  const loadUsers = useCallback(async () => {
    if (!token) return;
    setLoadingList(true);
    setFeedback(null);
    try {
      const res = await supabaseRest(
        "users?select=id,auth_user_id,email,name,user_profile,active&order=name.asc&limit=200",
        token,
        { method: "GET" }
      );
      const data = await res.json();
      if (Array.isArray(data)) {
        setUsers(data.map((u: Record<string, unknown>) => ({
          id: String(u.id ?? u.auth_user_id ?? ""),
          auth_user_id: String(u.auth_user_id ?? u.id ?? ""),
          email: String(u.email ?? ""),
          name: String(u.name ?? ""),
          user_profile: String(u.user_profile ?? "Consultor"),
          active: u.active !== false,
        })));
      }
    } catch (err) {
      showFeedback("error", err instanceof Error ? err.message : "Falha ao carregar usuários.");
    } finally {
      setLoadingList(false);
    }
  }, [token]);

  useEffect(() => {
    if (!loadingSession && token && isAdmin) loadUsers();
  }, [loadingSession, token, isAdmin, loadUsers]);

  /* ─── Create user ─── */
  const handleCreate = async () => {
    if (!token) return;
    const { name, email, user_profile } = createForm;
    if (!name.trim() || !email.trim()) {
      showFeedback("error", "Nome e e-mail são obrigatórios.");
      return;
    }
    setCreating(true);
    try {
      await supabaseRest("users", token, {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          user_profile,
          active: true,
        }),
      });
      showFeedback("ok", `Usuário "${name.trim()}" criado com sucesso.`);
      setCreateForm({ name: "", email: "", user_profile: "Consultor" });
      setShowCreate(false);
      loadUsers();
    } catch (err) {
      showFeedback("error", err instanceof Error ? err.message : "Falha ao criar usuário.");
    } finally {
      setCreating(false);
    }
  };

  /* ─── Edit user ─── */
  const startEdit = (user: UserRow) => {
    setEditingId(user.id);
    setEditForm({ name: user.name, email: user.email, user_profile: user.user_profile, active: user.active });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async () => {
    if (!token || !editingId) return;
    try {
      const payload: Record<string, unknown> = {};
      if (editForm.name !== undefined) payload.name = editForm.name;
      if (editForm.email !== undefined) payload.email = editForm.email;
      if (editForm.user_profile !== undefined) payload.user_profile = editForm.user_profile;
      if (editForm.active !== undefined) payload.active = editForm.active;

      await supabaseRest(`users?id=eq.${editingId}`, token, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      // Sync role to user_roles table
      const editedUser = users.find(u => u.id === editingId);
      if (editedUser?.auth_user_id && editForm.user_profile) {
        const appRole = perfilToRole[editForm.user_profile as Perfil] ?? "consultor";
        try {
          // Delete existing role then insert new one
          await supabaseRest(`user_roles?user_id=eq.${editedUser.auth_user_id}`, token, {
            method: "DELETE",
          });
          await supabaseRest("user_roles", token, {
            method: "POST",
            body: JSON.stringify({ user_id: editedUser.auth_user_id, role: appRole }),
          });
        } catch {
          // non-critical: role sync failed
        }
      }

      showFeedback("ok", "Usuário atualizado com sucesso.");
      cancelEdit();
      loadUsers();
    } catch (err) {
      showFeedback("error", err instanceof Error ? err.message : "Falha ao atualizar.");
    }
  };

  /* ─── Delete user ─── */
  const handleDelete = async (id: string) => {
    if (!token) return;
    setDeletingId(id);
    try {
      await supabaseRest(`users?id=eq.${id}`, token, { method: "DELETE" });
      showFeedback("ok", "Usuário removido com sucesso.");
      setConfirmDeleteId(null);
      loadUsers();
    } catch (err) {
      showFeedback("error", err instanceof Error ? err.message : "Falha ao remover.");
    } finally {
      setDeletingId(null);
    }
  };

  /* ─── Filter ─── */
  const filteredUsers = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return users;
    return users.filter(u =>
      u.email.toLowerCase().includes(term) ||
      u.name.toLowerCase().includes(term) ||
      u.user_profile.toLowerCase().includes(term)
    );
  }, [filter, users]);

  const stats = useMemo(() => ({
    total: users.length,
    admins: users.filter(u => u.user_profile === "Administrador" || u.user_profile === "admin").length,
    consultors: users.filter(u => u.user_profile === "Consultor" || u.user_profile === "consultor").length,
    active: users.filter(u => u.active !== false).length,
  }), [users]);

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
      <div className="mx-auto w-full max-w-[1400px] space-y-5 p-5 md:p-8">

        {/* ═══ HEADER ═══ */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="flex flex-wrap items-end justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(262_83%_58%)] to-[hsl(234_89%_64%)] shadow-lg shadow-[hsl(262_83%_58%/0.25)]">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[hsl(var(--task-text))]">Gestão de Usuários</h1>
              <p className="text-sm text-[hsl(var(--task-text-muted))]">Gerencie acessos e permissões do sistema.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowCreate(!showCreate)}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[hsl(262_83%_58%)] to-[hsl(234_89%_64%)] px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-[hsl(262_83%_58%/0.3)] transition hover:shadow-[hsl(262_83%_58%/0.5)] hover:scale-[1.02] active:scale-[0.98]"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Novo Usuário
            </button>
            <button onClick={() => loadUsers()} disabled={loadingList}
              className="flex items-center gap-1.5 rounded-xl border border-[hsl(var(--task-border))] bg-[hsl(var(--task-surface))] px-3 py-2 text-xs font-medium text-[hsl(var(--task-text-muted))] transition hover:border-[hsl(var(--task-purple)/0.4)] hover:text-[hsl(var(--task-purple))] disabled:opacity-40"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingList ? "animate-spin" : ""}`} />
              Atualizar
            </button>
          </div>
        </motion.div>

        {/* ═══ FEEDBACK ═══ */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
                feedback.type === "ok"
                  ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                  : "border border-rose-500/20 bg-rose-500/10 text-rose-300"
              }`}
            >
              {feedback.type === "ok" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
              <span className="flex-1">{feedback.message}</span>
              <button onClick={() => setFeedback(null)} className="text-white/30 hover:text-white/60">
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ CREATE FORM ═══ */}
        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="task-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[hsl(var(--task-text))] flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-[hsl(var(--task-purple))]" />
                    Criar Novo Usuário
                  </h3>
                  <button onClick={() => setShowCreate(false)} className="text-[hsl(var(--task-text-muted))] hover:text-[hsl(var(--task-text))]">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-[hsl(var(--task-text-muted))] font-semibold">Nome *</label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[hsl(var(--task-text-muted))]" />
                      <input
                        value={createForm.name}
                        onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))}
                        placeholder="Nome completo"
                        className="h-9 w-full rounded-lg border border-[hsl(var(--task-border))] bg-[hsl(var(--task-bg))] pl-8 pr-3 text-xs text-[hsl(var(--task-text))] outline-none focus:border-[hsl(var(--task-purple)/0.5)] placeholder:text-[hsl(var(--task-text-muted)/0.4)]"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-[hsl(var(--task-text-muted))] font-semibold">E-mail *</label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[hsl(var(--task-text-muted))]" />
                      <input
                        value={createForm.email}
                        onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))}
                        placeholder="usuario@email.com"
                        type="email"
                        className="h-9 w-full rounded-lg border border-[hsl(var(--task-border))] bg-[hsl(var(--task-bg))] pl-8 pr-3 text-xs text-[hsl(var(--task-text))] outline-none focus:border-[hsl(var(--task-purple)/0.5)] placeholder:text-[hsl(var(--task-text-muted)/0.4)]"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-[hsl(var(--task-text-muted))] font-semibold">Perfil</label>
                    <select
                      value={createForm.user_profile}
                      onChange={e => setCreateForm(p => ({ ...p, user_profile: e.target.value as Perfil }))}
                      className="h-9 w-full rounded-lg border border-[hsl(var(--task-border))] bg-[hsl(var(--task-bg))] px-3 text-xs text-[hsl(var(--task-text))] outline-none focus:border-[hsl(var(--task-purple)/0.5)]"
                    >
                      {perfis.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowCreate(false)}
                    className="rounded-lg border border-[hsl(var(--task-border))] px-4 py-2 text-xs font-medium text-[hsl(var(--task-text-muted))] hover:text-[hsl(var(--task-text))] transition"
                  >
                    Cancelar
                  </button>
                  <button onClick={handleCreate} disabled={creating}
                    className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[hsl(262_83%_58%)] to-[hsl(234_89%_64%)] px-4 py-2 text-xs font-semibold text-white transition hover:shadow-lg disabled:opacity-50"
                  >
                    {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Criar Usuário
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ STATS ═══ */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {[
            { label: "Total", value: stats.total, icon: Users, color: "purple" },
            { label: "Administradores", value: stats.admins, icon: Shield, color: "yellow" },
            { label: "Consultores", value: stats.consultors, icon: User, color: "blue" },
            { label: "Ativos", value: stats.active, icon: CheckCircle2, color: "green" },
          ].map((s) => (
            <div key={s.label} className="task-card flex items-center gap-3 p-3 sm:p-4">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                s.color === "purple" ? "bg-[hsl(var(--task-purple)/0.15)] text-[hsl(var(--task-purple))]" :
                s.color === "yellow" ? "bg-[hsl(var(--task-yellow)/0.15)] text-[hsl(var(--task-yellow))]" :
                s.color === "blue" ? "bg-[hsl(220_90%_56%/0.15)] text-[hsl(220_90%_56%)]" :
                "bg-emerald-500/15 text-emerald-400"
              }`}>
                <s.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-[0.15em] text-[hsl(var(--task-text-muted))]">{s.label}</p>
                <p className="text-xl font-extrabold text-[hsl(var(--task-text))]">{s.value}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* ═══ USER LIST ═══ */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="task-card overflow-hidden"
        >
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 pb-3 border-b border-[hsl(var(--task-border))]">
            <h2 className="text-base font-bold text-[hsl(var(--task-text))] flex items-center gap-2">
              <Users className="h-4 w-4 text-[hsl(var(--task-purple))]" />
              Usuários Cadastrados
              <span className="text-xs font-normal text-[hsl(var(--task-text-muted))]">({filteredUsers.length})</span>
            </h2>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[hsl(var(--task-text-muted))]" />
              <input
                value={filter} onChange={e => setFilter(e.target.value)}
                placeholder="Buscar por nome, e-mail..."
                className="h-8 w-56 rounded-lg border border-[hsl(var(--task-border))] bg-[hsl(var(--task-bg))] pl-8 pr-3 text-xs text-[hsl(var(--task-text))] outline-none transition focus:border-[hsl(var(--task-purple)/0.5)] focus:ring-1 focus:ring-[hsl(var(--task-purple)/0.15)] placeholder:text-[hsl(var(--task-text-muted)/0.4)]"
              />
            </div>
          </div>

          {/* Loading */}
          {loadingList && users.length === 0 && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-[hsl(var(--task-purple))]" />
              <span className="ml-2 text-sm text-[hsl(var(--task-text-muted))]">Carregando...</span>
            </div>
          )}

          {/* Empty */}
          {!loadingList && filteredUsers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-10 w-10 text-[hsl(var(--task-text-muted)/0.15)] mb-3" />
              <p className="text-sm font-medium text-[hsl(var(--task-text-muted))]">
                {users.length === 0 ? "Nenhum usuário encontrado." : "Nenhum resultado para o filtro."}
              </p>
              {users.length === 0 && (
                <button onClick={() => setShowCreate(true)} className="mt-3 text-xs text-[hsl(var(--task-purple))] hover:underline">
                  + Criar o primeiro usuário
                </button>
              )}
            </div>
          )}

          {/* User rows */}
          {filteredUsers.length > 0 && (
            <div className="divide-y divide-[hsl(var(--task-border)/0.4)]">
              {filteredUsers.map((user, idx) => {
                const initials = (user.name || user.email || "U")
                  .split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
                const isEditing = editingId === user.id;
                const profileColor = (user.user_profile === "Administrador" || user.user_profile === "admin")
                  ? "text-[hsl(var(--task-yellow))] bg-[hsl(var(--task-yellow)/0.1)] border-[hsl(var(--task-yellow)/0.2)]"
                  : "text-[hsl(var(--task-purple))] bg-[hsl(var(--task-purple)/0.1)] border-[hsl(var(--task-purple)/0.2)]";

                if (isEditing) {
                  return (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-4 space-y-3 bg-[hsl(var(--task-purple)/0.03)]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[hsl(var(--task-purple))] flex items-center gap-1.5">
                          <Pencil className="h-3 w-3" /> Editando usuário
                        </span>
                        <button onClick={cancelEdit} className="text-[hsl(var(--task-text-muted))] hover:text-[hsl(var(--task-text))]">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-wider text-[hsl(var(--task-text-muted))] font-semibold">Nome</label>
                          <input
                            value={editForm.name ?? ""}
                            onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                            className="h-8 w-full rounded-lg border border-[hsl(var(--task-border))] bg-[hsl(var(--task-bg))] px-3 text-xs text-[hsl(var(--task-text))] outline-none focus:border-[hsl(var(--task-purple)/0.5)]"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-wider text-[hsl(var(--task-text-muted))] font-semibold">E-mail</label>
                          <input
                            value={editForm.email ?? ""}
                            onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))}
                            className="h-8 w-full rounded-lg border border-[hsl(var(--task-border))] bg-[hsl(var(--task-bg))] px-3 text-xs text-[hsl(var(--task-text))] outline-none focus:border-[hsl(var(--task-purple)/0.5)]"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-wider text-[hsl(var(--task-text-muted))] font-semibold">Perfil</label>
                          <select
                            value={editForm.user_profile ?? "Consultor"}
                            onChange={e => setEditForm(p => ({ ...p, user_profile: e.target.value }))}
                            className="h-8 w-full rounded-lg border border-[hsl(var(--task-border))] bg-[hsl(var(--task-bg))] px-3 text-xs text-[hsl(var(--task-text))] outline-none focus:border-[hsl(var(--task-purple)/0.5)]"
                          >
                            {perfis.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase tracking-wider text-[hsl(var(--task-text-muted))] font-semibold">Status</label>
                          <button
                            onClick={() => setEditForm(p => ({ ...p, active: !p.active }))}
                            className={`h-8 w-full flex items-center justify-center gap-1.5 rounded-lg border text-xs font-medium transition ${
                              editForm.active
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                : "border-rose-500/30 bg-rose-500/10 text-rose-400"
                            }`}
                          >
                            {editForm.active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                            {editForm.active ? "Ativo" : "Inativo"}
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button onClick={cancelEdit}
                          className="rounded-lg border border-[hsl(var(--task-border))] px-3 py-1.5 text-xs text-[hsl(var(--task-text-muted))] hover:text-[hsl(var(--task-text))] transition"
                        >
                          Cancelar
                        </button>
                        <button onClick={saveEdit}
                          className="flex items-center gap-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/30 transition"
                        >
                          <Save className="h-3 w-3" /> Salvar
                        </button>
                      </div>
                    </motion.div>
                  );
                }

                return (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                    className="flex items-center gap-4 px-4 py-3.5 hover:bg-[hsl(var(--task-bg)/0.4)] transition group"
                  >
                    {/* Avatar */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--task-purple)/0.15)] text-xs font-bold text-[hsl(var(--task-purple))]">
                      {initials}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-[hsl(var(--task-text))] truncate">{user.name || "Sem nome"}</p>
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold ${profileColor}`}>
                          {user.user_profile || "Consultor"}
                        </span>
                        {user.active === false && (
                          <span className="inline-flex items-center rounded-md border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-400">
                            Inativo
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-[11px] text-[hsl(var(--task-text-muted))]">
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3 shrink-0" />
                          {user.email}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEdit(user)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-[hsl(var(--task-text-muted))] hover:bg-[hsl(var(--task-purple)/0.1)] hover:text-[hsl(var(--task-purple))] transition"
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {confirmDeleteId === user.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(user.id)}
                            disabled={deletingId === user.id}
                            className="flex h-7 items-center gap-1 rounded-lg bg-rose-500/20 border border-rose-500/30 px-2 text-[10px] font-semibold text-rose-400 hover:bg-rose-500/30 transition disabled:opacity-50"
                          >
                            {deletingId === user.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                            Confirmar
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-[hsl(var(--task-text-muted))] hover:text-[hsl(var(--task-text))]"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(user.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-[hsl(var(--task-text-muted))] hover:bg-rose-500/10 hover:text-rose-400 transition"
                          title="Excluir"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
