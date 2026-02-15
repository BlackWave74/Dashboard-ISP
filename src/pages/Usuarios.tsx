import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useUsersApi } from "@/modules/users/api/useUsersApi";
import { PERFIS, ALL_AREAS, type Perfil, type UserRow, type AuditRow } from "@/modules/users/types";
import {
  Users, Search, RefreshCw, Pencil, Trash2, Save, X, Shield,
  Loader2, AlertCircle, CheckCircle2, UserPlus, Mail, User,
  Eye, EyeOff, FolderOpen, Clock, ChevronDown, ChevronUp,
  History, MapPin, Briefcase,
} from "lucide-react";

/* ─── Component ─── */
export default function UsuariosPage() {
  const navigate = useNavigate();
  const { session, loadingSession } = useAuth();
  const isAdmin = session?.role === "admin" || session?.role === "gerente" || session?.role === "coordenador";
  const token = session?.accessToken;
  const api = useUsersApi(token);

  useEffect(() => {
    if (!loadingSession && !session) { navigate("/login"); return; }
    if (!loadingSession && session && !isAdmin) { navigate("/"); return; }
  }, [loadingSession, session, isAdmin, navigate]);

  const [filter, setFilter] = useState("");
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"users" | "audit">("users");

  // Edit state
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState<Partial<UserRow>>({});
  const [editAreas, setEditAreas] = useState<string[]>([]);
  const [editProjects, setEditProjects] = useState<number[]>([]);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [showEditPanel, setShowEditPanel] = useState(false);

  // Create state
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", email: "", user_profile: "Consultor" as Perfil });
  const [createAreas, setCreateAreas] = useState<string[]>(["home"]);
  const [createProjects, setCreateProjects] = useState<number[]>([]);
  const [creating, setCreating] = useState(false);

  // Delete
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Audit
  const [auditLog, setAuditLog] = useState<AuditRow[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const showFeedback = (type: "ok" | "error", message: string) => {
    setFeedback({ type, message });
    if (type === "ok") setTimeout(() => setFeedback(null), 4000);
  };

  /* ─── Start edit ─── */
  const startEdit = useCallback(async (user: UserRow) => {
    setEditingUser(user);
    setEditForm({ name: user.name, email: user.email, user_profile: user.user_profile, active: user.active });
    setShowEditPanel(true);
    setShowCreate(false);

    if (user.auth_user_id) {
      const [areas, projects] = await Promise.all([
        api.getUserAreas(user.auth_user_id),
        api.getUserProjects(user.auth_user_id),
      ]);
      setEditAreas(areas);
      setEditProjects(projects);
    } else {
      setEditAreas([]);
      setEditProjects([]);
    }
  }, [api]);

  const cancelEdit = () => {
    setEditingUser(null);
    setEditForm({});
    setEditAreas([]);
    setEditProjects([]);
    setShowEditPanel(false);
  };

  /* ─── Save edit ─── */
  const saveEdit = async () => {
    if (!editingUser || !session) return;
    setLoadingEdit(true);
    try {
      // Get current auth user id for performedBy
      // We need the auth_user_id from the users table for the current session user
      const currentUser = api.users.find(u => u.email === session.email);
      const performedBy = currentUser?.auth_user_id || "";

      await api.saveUser(
        editingUser.id,
        editingUser.auth_user_id,
        editForm,
        editAreas,
        editProjects,
        performedBy,
      );
      showFeedback("ok", "Usuário atualizado com sucesso.");
      cancelEdit();
      api.loadUsers();
    } catch (err) {
      showFeedback("error", err instanceof Error ? err.message : "Falha ao atualizar.");
    } finally {
      setLoadingEdit(false);
    }
  };

  /* ─── Create user ─── */
  const handleCreate = async () => {
    if (!token || !session) return;
    const { name, email, user_profile } = createForm;
    if (!name.trim() || !email.trim()) {
      showFeedback("error", "Nome e e-mail são obrigatórios.");
      return;
    }
    setCreating(true);
    try {
      const { supabaseRest } = await import("@/modules/users/api/supabaseRest");
      await supabaseRest("users", token, {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), name: name.trim(), user_profile, active: true }),
      });
      showFeedback("ok", `Usuário "${name.trim()}" criado com sucesso.`);
      setCreateForm({ name: "", email: "", user_profile: "Consultor" });
      setCreateAreas(["home"]);
      setCreateProjects([]);
      setShowCreate(false);
      api.loadUsers();
    } catch (err) {
      showFeedback("error", err instanceof Error ? err.message : "Falha ao criar usuário.");
    } finally {
      setCreating(false);
    }
  };

  /* ─── Delete ─── */
  const handleDelete = async (user: UserRow) => {
    if (!session) return;
    setDeletingId(user.id);
    try {
      const currentUser = api.users.find(u => u.email === session.email);
      await api.deleteUser(user.id, user.auth_user_id, currentUser?.auth_user_id || "");
      showFeedback("ok", "Usuário removido com sucesso.");
      setConfirmDeleteId(null);
      api.loadUsers();
    } catch (err) {
      showFeedback("error", err instanceof Error ? err.message : "Falha ao remover.");
    } finally {
      setDeletingId(null);
    }
  };

  /* ─── Load audit ─── */
  const loadAudit = useCallback(async () => {
    setLoadingAudit(true);
    const data = await api.getAuditLog();
    setAuditLog(data);
    setLoadingAudit(false);
  }, [api]);

  useEffect(() => {
    if (activeTab === "audit") loadAudit();
  }, [activeTab, loadAudit]);

  /* ─── Filter ─── */
  const filteredUsers = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return api.users;
    return api.users.filter(u =>
      u.email.toLowerCase().includes(term) ||
      u.name.toLowerCase().includes(term) ||
      u.user_profile.toLowerCase().includes(term)
    );
  }, [filter, api.users]);

  const stats = useMemo(() => ({
    total: api.users.length,
    admins: api.users.filter(u => u.user_profile === "Administrador").length,
    consultors: api.users.filter(u => u.user_profile === "Consultor").length,
    active: api.users.filter(u => u.active !== false).length,
  }), [api.users]);

  /* ─── Helpers ─── */
  const toggleArea = (area: string, list: string[], setter: (v: string[]) => void) => {
    setter(list.includes(area) ? list.filter(a => a !== area) : [...list, area]);
  };

  const toggleProject = (pid: number, list: number[], setter: (v: number[]) => void) => {
    setter(list.includes(pid) ? list.filter(p => p !== pid) : [...list, pid]);
  };

  const profileColor = (profile: string) => {
    if (profile === "Administrador") return "text-[hsl(var(--task-yellow))] bg-[hsl(var(--task-yellow)/0.1)] border-[hsl(var(--task-yellow)/0.2)]";
    if (profile === "Gerente") return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (profile === "Coordenador") return "text-sky-400 bg-sky-500/10 border-sky-500/20";
    if (profile === "Cliente") return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    return "text-[hsl(var(--task-purple))] bg-[hsl(var(--task-purple)/0.1)] border-[hsl(var(--task-purple)/0.2)]";
  };

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
              <p className="text-sm text-[hsl(var(--task-text-muted))]">Gerencie acessos, permissões e projetos.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setShowCreate(!showCreate); setShowEditPanel(false); }}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[hsl(262_83%_58%)] to-[hsl(234_89%_64%)] px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-[hsl(262_83%_58%/0.3)] transition hover:shadow-[hsl(262_83%_58%/0.5)] hover:scale-[1.02] active:scale-[0.98]"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Novo Usuário
            </button>
            <button onClick={() => api.loadUsers()} disabled={api.loading}
              className="flex items-center gap-1.5 rounded-xl border border-[hsl(var(--task-border))] bg-[hsl(var(--task-surface))] px-3 py-2 text-xs font-medium text-[hsl(var(--task-text-muted))] transition hover:border-[hsl(var(--task-purple)/0.4)] hover:text-[hsl(var(--task-purple))] disabled:opacity-40"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${api.loading ? "animate-spin" : ""}`} />
              Atualizar
            </button>
          </div>
        </motion.div>

        {/* ═══ FEEDBACK ═══ */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: -8, height: 0 }}
              className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
                feedback.type === "ok"
                  ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                  : "border border-rose-500/20 bg-rose-500/10 text-rose-300"
              }`}
            >
              {feedback.type === "ok" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
              <span className="flex-1">{feedback.message}</span>
              <button onClick={() => setFeedback(null)} className="text-white/30 hover:text-white/60"><X className="h-3.5 w-3.5" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ TABS ═══ */}
        <div className="flex gap-1 rounded-xl bg-[hsl(var(--task-surface))] p-1 border border-[hsl(var(--task-border))]">
          {[
            { key: "users" as const, label: "Usuários", icon: Users },
            { key: "audit" as const, label: "Auditoria", icon: History },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition ${
                activeTab === tab.key
                  ? "bg-[hsl(var(--task-purple)/0.15)] text-[hsl(var(--task-purple))]"
                  : "text-[hsl(var(--task-text-muted))] hover:text-[hsl(var(--task-text))]"
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "users" && (
          <>
            {/* ═══ CREATE FORM ═══ */}
            <AnimatePresence>
              {showCreate && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="task-card p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-[hsl(var(--task-text))] flex items-center gap-2">
                        <UserPlus className="h-4 w-4 text-[hsl(var(--task-purple))]" />
                        Criar Novo Usuário
                      </h3>
                      <button onClick={() => setShowCreate(false)} className="text-[hsl(var(--task-text-muted))] hover:text-[hsl(var(--task-text))]"><X className="h-4 w-4" /></button>
                    </div>

                    {/* Basic info */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider text-[hsl(var(--task-text-muted))] font-semibold">Nome *</label>
                        <div className="relative">
                          <User className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[hsl(var(--task-text-muted))]" />
                          <input value={createForm.name} onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))} placeholder="Nome completo"
                            className="h-9 w-full rounded-lg border border-[hsl(var(--task-border))] bg-[hsl(var(--task-bg))] pl-8 pr-3 text-xs text-[hsl(var(--task-text))] outline-none focus:border-[hsl(var(--task-purple)/0.5)] placeholder:text-[hsl(var(--task-text-muted)/0.4)]" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider text-[hsl(var(--task-text-muted))] font-semibold">E-mail *</label>
                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[hsl(var(--task-text-muted))]" />
                          <input value={createForm.email} onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))} placeholder="usuario@email.com" type="email"
                            className="h-9 w-full rounded-lg border border-[hsl(var(--task-border))] bg-[hsl(var(--task-bg))] pl-8 pr-3 text-xs text-[hsl(var(--task-text))] outline-none focus:border-[hsl(var(--task-purple)/0.5)] placeholder:text-[hsl(var(--task-text-muted)/0.4)]" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider text-[hsl(var(--task-text-muted))] font-semibold">Perfil</label>
                        <select value={createForm.user_profile} onChange={e => setCreateForm(p => ({ ...p, user_profile: e.target.value as Perfil }))}
                          className="h-9 w-full rounded-lg border border-[hsl(var(--task-border))] bg-[hsl(var(--task-bg))] px-3 text-xs text-[hsl(var(--task-text))] outline-none focus:border-[hsl(var(--task-purple)/0.5)]">
                          {PERFIS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Areas */}
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-wider text-[hsl(var(--task-text-muted))] font-semibold flex items-center gap-1.5">
                        <MapPin className="h-3 w-3" /> Áreas Permitidas
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {ALL_AREAS.map(area => (
                          <button key={area.value} onClick={() => toggleArea(area.value, createAreas, setCreateAreas)}
                            className={`rounded-lg px-3 py-1.5 text-[11px] font-medium border transition ${
                              createAreas.includes(area.value)
                                ? "border-[hsl(var(--task-purple)/0.4)] bg-[hsl(var(--task-purple)/0.15)] text-[hsl(var(--task-purple))]"
                                : "border-[hsl(var(--task-border))] bg-[hsl(var(--task-bg))] text-[hsl(var(--task-text-muted))] hover:border-[hsl(var(--task-purple)/0.3)]"
                            }`}>
                            {area.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Projects */}
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-wider text-[hsl(var(--task-text-muted))] font-semibold flex items-center gap-1.5">
                        <FolderOpen className="h-3 w-3" /> Projetos Acessíveis
                      </label>
                      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                        {api.projects.length === 0 && <span className="text-[11px] text-[hsl(var(--task-text-muted))]">Nenhum projeto encontrado.</span>}
                        {api.projects.map(proj => (
                          <button key={proj.id} onClick={() => toggleProject(proj.id, createProjects, setCreateProjects)}
                            className={`rounded-lg px-3 py-1.5 text-[11px] font-medium border transition ${
                              createProjects.includes(proj.id)
                                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
                                : "border-[hsl(var(--task-border))] bg-[hsl(var(--task-bg))] text-[hsl(var(--task-text-muted))] hover:border-emerald-500/30"
                            }`}>
                            {proj.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <button onClick={() => setShowCreate(false)}
                        className="rounded-lg border border-[hsl(var(--task-border))] px-4 py-2 text-xs font-medium text-[hsl(var(--task-text-muted))] hover:text-[hsl(var(--task-text))] transition">
                        Cancelar
                      </button>
                      <button onClick={handleCreate} disabled={creating}
                        className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[hsl(262_83%_58%)] to-[hsl(234_89%_64%)] px-4 py-2 text-xs font-semibold text-white transition hover:shadow-lg disabled:opacity-50">
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
              ].map(s => (
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

            {/* ═══ MAIN CONTENT ═══ */}
            <div className={`grid gap-5 ${showEditPanel ? "lg:grid-cols-[1fr_400px]" : "grid-cols-1"}`}>
              {/* ─── USER LIST ─── */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="task-card overflow-hidden"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 pb-3 border-b border-[hsl(var(--task-border))]">
                  <h2 className="text-base font-bold text-[hsl(var(--task-text))] flex items-center gap-2">
                    <Users className="h-4 w-4 text-[hsl(var(--task-purple))]" />
                    Usuários Cadastrados
                    <span className="text-xs font-normal text-[hsl(var(--task-text-muted))]">({filteredUsers.length})</span>
                  </h2>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[hsl(var(--task-text-muted))]" />
                    <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Buscar por nome, e-mail..."
                      className="h-8 w-56 rounded-lg border border-[hsl(var(--task-border))] bg-[hsl(var(--task-bg))] pl-8 pr-3 text-xs text-[hsl(var(--task-text))] outline-none transition focus:border-[hsl(var(--task-purple)/0.5)] placeholder:text-[hsl(var(--task-text-muted)/0.4)]" />
                  </div>
                </div>

                {api.loading && api.users.length === 0 && (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-5 w-5 animate-spin text-[hsl(var(--task-purple))]" />
                    <span className="ml-2 text-sm text-[hsl(var(--task-text-muted))]">Carregando...</span>
                  </div>
                )}

                {!api.loading && filteredUsers.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Users className="h-10 w-10 text-[hsl(var(--task-text-muted)/0.15)] mb-3" />
                    <p className="text-sm font-medium text-[hsl(var(--task-text-muted))]">
                      {api.users.length === 0 ? "Nenhum usuário encontrado." : "Nenhum resultado para o filtro."}
                    </p>
                  </div>
                )}

                {filteredUsers.length > 0 && (
                  <div className="divide-y divide-[hsl(var(--task-border)/0.4)]">
                    {filteredUsers.map((user, idx) => {
                      const initials = (user.name || user.email || "U")
                        .split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
                      const isSelected = editingUser?.id === user.id;

                      return (
                        <motion.div
                          key={user.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                          className={`flex items-center gap-4 px-4 py-3.5 transition group cursor-pointer ${
                            isSelected ? "bg-[hsl(var(--task-purple)/0.06)]" : "hover:bg-[hsl(var(--task-bg)/0.4)]"
                          }`}
                          onClick={() => startEdit(user)}
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--task-purple)/0.15)] text-xs font-bold text-[hsl(var(--task-purple))]">
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-[hsl(var(--task-text))] truncate">{user.name || "Sem nome"}</p>
                              <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold ${profileColor(user.user_profile)}`}>
                                {user.user_profile || "Consultor"}
                              </span>
                              {user.active === false && (
                                <span className="inline-flex items-center rounded-md border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-400">Inativo</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 text-[11px] text-[hsl(var(--task-text-muted))]">
                              <span className="flex items-center gap-1 truncate"><Mail className="h-3 w-3 shrink-0" />{user.email}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                            <button onClick={() => startEdit(user)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-[hsl(var(--task-text-muted))] hover:bg-[hsl(var(--task-purple)/0.1)] hover:text-[hsl(var(--task-purple))] transition" title="Editar">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            {confirmDeleteId === user.id ? (
                              <div className="flex items-center gap-1">
                                <button onClick={() => handleDelete(user)} disabled={deletingId === user.id}
                                  className="flex h-7 items-center gap-1 rounded-lg bg-rose-500/20 border border-rose-500/30 px-2 text-[10px] font-semibold text-rose-400 hover:bg-rose-500/30 transition disabled:opacity-50">
                                  {deletingId === user.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />} Confirmar
                                </button>
                                <button onClick={() => setConfirmDeleteId(null)} className="flex h-7 w-7 items-center justify-center rounded-lg text-[hsl(var(--task-text-muted))] hover:text-[hsl(var(--task-text))]">
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => setConfirmDeleteId(user.id)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-[hsl(var(--task-text-muted))] hover:bg-rose-500/10 hover:text-rose-400 transition" title="Excluir">
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

              {/* ─── EDIT PANEL ─── */}
              <AnimatePresence>
                {showEditPanel && editingUser && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                    className="task-card p-5 space-y-4 h-fit sticky top-20"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-[hsl(var(--task-text))] flex items-center gap-2">
                        <Pencil className="h-4 w-4 text-[hsl(var(--task-purple))]" />
                        Editar Usuário
                      </h3>
                      <button onClick={cancelEdit} className="text-[hsl(var(--task-text-muted))] hover:text-[hsl(var(--task-text))]"><X className="h-4 w-4" /></button>
                    </div>

                    {/* User avatar & name */}
                    <div className="flex items-center gap-3 pb-3 border-b border-[hsl(var(--task-border))]">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--task-purple)/0.15)] text-sm font-bold text-[hsl(var(--task-purple))]">
                        {(editingUser.name || "U").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[hsl(var(--task-text))]">{editingUser.name}</p>
                        <p className="text-[11px] text-[hsl(var(--task-text-muted))]">{editingUser.email}</p>
                      </div>
                    </div>

                    {/* Basic fields */}
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider text-[hsl(var(--task-text-muted))] font-semibold">Nome</label>
                        <input value={editForm.name ?? ""} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                          className="h-9 w-full rounded-lg border border-[hsl(var(--task-border))] bg-[hsl(var(--task-bg))] px-3 text-xs text-[hsl(var(--task-text))] outline-none focus:border-[hsl(var(--task-purple)/0.5)]" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider text-[hsl(var(--task-text-muted))] font-semibold">E-mail</label>
                        <input value={editForm.email ?? ""} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))}
                          className="h-9 w-full rounded-lg border border-[hsl(var(--task-border))] bg-[hsl(var(--task-bg))] px-3 text-xs text-[hsl(var(--task-text))] outline-none focus:border-[hsl(var(--task-purple)/0.5)]" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase tracking-wider text-[hsl(var(--task-text-muted))] font-semibold">Perfil</label>
                          <select value={editForm.user_profile ?? "Consultor"} onChange={e => setEditForm(p => ({ ...p, user_profile: e.target.value }))}
                            className="h-9 w-full rounded-lg border border-[hsl(var(--task-border))] bg-[hsl(var(--task-bg))] px-3 text-xs text-[hsl(var(--task-text))] outline-none focus:border-[hsl(var(--task-purple)/0.5)]">
                            {PERFIS.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase tracking-wider text-[hsl(var(--task-text-muted))] font-semibold">Status</label>
                          <button onClick={() => setEditForm(p => ({ ...p, active: !p.active }))}
                            className={`h-9 w-full flex items-center justify-center gap-1.5 rounded-lg border text-xs font-medium transition ${
                              editForm.active
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                : "border-rose-500/30 bg-rose-500/10 text-rose-400"
                            }`}>
                            {editForm.active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                            {editForm.active ? "Ativo" : "Inativo"}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Areas */}
                    <div className="space-y-2 pt-2 border-t border-[hsl(var(--task-border))]">
                      <label className="text-[10px] uppercase tracking-wider text-[hsl(var(--task-text-muted))] font-semibold flex items-center gap-1.5">
                        <MapPin className="h-3 w-3" /> Áreas Permitidas
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {ALL_AREAS.map(area => (
                          <button key={area.value} onClick={() => toggleArea(area.value, editAreas, setEditAreas)}
                            className={`rounded-lg px-2.5 py-1 text-[10px] font-medium border transition ${
                              editAreas.includes(area.value)
                                ? "border-[hsl(var(--task-purple)/0.4)] bg-[hsl(var(--task-purple)/0.15)] text-[hsl(var(--task-purple))]"
                                : "border-[hsl(var(--task-border))] bg-[hsl(var(--task-bg))] text-[hsl(var(--task-text-muted))] hover:border-[hsl(var(--task-purple)/0.3)]"
                            }`}>
                            {area.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Projects */}
                    <div className="space-y-2 pt-2 border-t border-[hsl(var(--task-border))]">
                      <label className="text-[10px] uppercase tracking-wider text-[hsl(var(--task-text-muted))] font-semibold flex items-center gap-1.5">
                        <FolderOpen className="h-3 w-3" /> Projetos Acessíveis
                        <span className="text-[hsl(var(--task-text-muted)/0.5)]">({editProjects.length}/{api.projects.length})</span>
                      </label>
                      <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                        {api.projects.map(proj => (
                          <button key={proj.id} onClick={() => toggleProject(proj.id, editProjects, setEditProjects)}
                            className={`rounded-lg px-2.5 py-1 text-[10px] font-medium border transition ${
                              editProjects.includes(proj.id)
                                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
                                : "border-[hsl(var(--task-border))] bg-[hsl(var(--task-bg))] text-[hsl(var(--task-text-muted))] hover:border-emerald-500/30"
                            }`}>
                            {proj.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-3 border-t border-[hsl(var(--task-border))]">
                      <button onClick={cancelEdit}
                        className="rounded-lg border border-[hsl(var(--task-border))] px-3 py-1.5 text-xs text-[hsl(var(--task-text-muted))] hover:text-[hsl(var(--task-text))] transition">
                        Cancelar
                      </button>
                      <button onClick={saveEdit} disabled={loadingEdit}
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-4 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/30 transition disabled:opacity-50">
                        {loadingEdit ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Salvar
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}

        {/* ═══ AUDIT TAB ═══ */}
        {activeTab === "audit" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="task-card overflow-hidden">
            <div className="flex items-center justify-between p-4 pb-3 border-b border-[hsl(var(--task-border))]">
              <h2 className="text-base font-bold text-[hsl(var(--task-text))] flex items-center gap-2">
                <History className="h-4 w-4 text-[hsl(var(--task-purple))]" />
                Log de Auditoria
              </h2>
              <button onClick={loadAudit} disabled={loadingAudit}
                className="flex items-center gap-1.5 rounded-lg border border-[hsl(var(--task-border))] px-3 py-1.5 text-xs text-[hsl(var(--task-text-muted))] hover:text-[hsl(var(--task-purple))] transition disabled:opacity-40">
                <RefreshCw className={`h-3 w-3 ${loadingAudit ? "animate-spin" : ""}`} /> Atualizar
              </button>
            </div>

            {loadingAudit && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin text-[hsl(var(--task-purple))]" />
              </div>
            )}

            {!loadingAudit && auditLog.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <History className="h-10 w-10 text-[hsl(var(--task-text-muted)/0.15)] mb-3" />
                <p className="text-sm font-medium text-[hsl(var(--task-text-muted))]">Nenhum registro de auditoria.</p>
              </div>
            )}

            {auditLog.length > 0 && (
              <div className="divide-y divide-[hsl(var(--task-border)/0.4)]">
                {auditLog.map((log) => {
                  const actionLabel = log.action === "update_user" ? "Atualizou usuário" :
                    log.action === "delete_user" ? "Removeu usuário" : log.action;
                  const actionColor = log.action === "delete_user" ? "text-rose-400" : "text-[hsl(var(--task-purple))]";
                  const details = log.details as Record<string, unknown> | null;
                  const changes = details?.changes as Record<string, unknown> | undefined;

                  return (
                    <div key={log.id} className="px-4 py-3 flex items-start gap-3">
                      <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                        log.action === "delete_user" ? "bg-rose-500/10" : "bg-[hsl(var(--task-purple)/0.1)]"
                      }`}>
                        {log.action === "delete_user" ? <Trash2 className="h-3.5 w-3.5 text-rose-400" /> : <Pencil className="h-3.5 w-3.5 text-[hsl(var(--task-purple))]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs">
                          <span className={`font-semibold ${actionColor}`}>{actionLabel}</span>
                        </p>
                        {changes && (
                          <p className="text-[11px] text-[hsl(var(--task-text-muted))] mt-0.5 truncate">
                            {Object.entries(changes).map(([k, v]) => `${k}: ${v}`).join(", ")}
                          </p>
                        )}
                        <p className="text-[10px] text-[hsl(var(--task-text-muted)/0.5)] mt-0.5 flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {new Date(log.created_at).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
