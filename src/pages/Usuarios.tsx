import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useUsersApi } from "@/modules/users/api/useUsersApi";
import { PERFIS, ALL_AREAS, type Perfil, type UserRow, type AuditRow } from "@/modules/users/types";
import {
  Users, Search, RefreshCw, Pencil, Trash2, Save, X, Shield,
  Loader2, AlertCircle, CheckCircle2, UserPlus, Mail, User,
  Eye, EyeOff, FolderOpen, Clock, ChevronDown,
  History, MapPin, Key, Copy, Power, Check, Building2,
} from "lucide-react";

/* ─── Password generator ─── */
function generatePassword(length = 14): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const specials = "!@#$%&*?";
  const all = upper + lower + digits + specials;
  // Ensure at least one from each
  let pw = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    specials[Math.floor(Math.random() * specials.length)],
  ];
  for (let i = pw.length; i < length; i++) {
    pw.push(all[Math.floor(Math.random() * all.length)]);
  }
  // Shuffle
  for (let i = pw.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pw[i], pw[j]] = [pw[j], pw[i]];
  }
  return pw.join("");
}

/* ─── MultiSelect Dropdown ─── */
function MultiSelectDropdown({
  label,
  icon: Icon,
  options,
  selected,
  onToggle,
  renderOption,
  emptyText = "Nenhuma opção.",
  searchable = false,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  options: { value: string | number; label: string }[];
  selected: (string | number)[];
  onToggle: (value: string | number) => void;
  renderOption?: (opt: { value: string | number; label: string }, isSelected: boolean) => React.ReactNode;
  emptyText?: string;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = searchable && search.trim()
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <div className="space-y-1.5" ref={ref}>
      <label className="text-[10px] uppercase tracking-wider text-[hsl(var(--task-text-muted))] font-semibold flex items-center gap-1.5">
        <Icon className="h-3 w-3" /> {label}
        <span className="text-[hsl(var(--task-text-muted)/0.5)]">({selected.length})</span>
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex h-9 w-full items-center justify-between rounded-lg border border-[hsl(var(--task-border))] bg-[hsl(var(--task-bg))] px-3 text-xs text-[hsl(var(--task-text))] transition hover:border-[hsl(var(--task-purple)/0.4)]"
        >
          <span className="truncate">
            {selected.length === 0
              ? "Selecionar..."
              : `${selected.length} selecionado${selected.length > 1 ? "s" : ""}`}
          </span>
          <ChevronDown className={`h-3.5 w-3.5 text-[hsl(var(--task-text-muted))] transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50 mt-1 w-full max-h-52 overflow-y-auto rounded-lg border border-[hsl(var(--task-border))] bg-[hsl(var(--task-surface))] shadow-xl shadow-black/30"
            >
              {searchable && (
                <div className="sticky top-0 border-b border-[hsl(var(--task-border))] bg-[hsl(var(--task-surface))] p-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-[hsl(var(--task-text-muted))]" />
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Buscar..."
                      className="h-7 w-full rounded-md border border-[hsl(var(--task-border))] bg-[hsl(var(--task-bg))] pl-7 pr-2 text-[11px] text-[hsl(var(--task-text))] outline-none focus:border-[hsl(var(--task-purple)/0.5)] placeholder:text-[hsl(var(--task-text-muted)/0.4)]"
                      autoFocus
                    />
                  </div>
                </div>
              )}
              {filtered.length === 0 && (
                <p className="px-3 py-4 text-center text-[11px] text-[hsl(var(--task-text-muted))]">{emptyText}</p>
              )}
              {filtered.map(opt => {
                const isSelected = selected.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onToggle(opt.value)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] transition hover:bg-[hsl(var(--task-surface-hover))] ${
                      isSelected ? "text-[hsl(var(--task-purple))]" : "text-[hsl(var(--task-text))]"
                    }`}
                  >
                    <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                      isSelected
                        ? "border-[hsl(var(--task-purple))] bg-[hsl(var(--task-purple)/0.2)]"
                        : "border-[hsl(var(--task-border-light))]"
                    }`}>
                      {isSelected && <Check className="h-2.5 w-2.5" />}
                    </div>
                    {renderOption ? renderOption(opt, isSelected) : <span className="truncate">{opt.label}</span>}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════ */
/* ─── Main Component ─── */
/* ═══════════════════════════════════════════════ */
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
  const [clienteFilter, setClienteFilter] = useState<number | "all">("all");
  const [profileFilter, setProfileFilter] = useState<string>("all");
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
  const [createForm, setCreateForm] = useState({ name: "", email: "", user_profile: "Consultor" as Perfil, password: "", cliente_id: null as number | null });
  const [createAreas, setCreateAreas] = useState<string[]>(["home"]);
  const [createProjects, setCreateProjects] = useState<number[]>([]);
  const [creating, setCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedPw, setCopiedPw] = useState(false);

  // Delete
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Audit
  const [auditLog, setAuditLog] = useState<AuditRow[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const auditLoadedRef = useRef(false);

  const showFeedback = (type: "ok" | "error", message: string) => {
    setFeedback({ type, message });
    if (type === "ok") setTimeout(() => setFeedback(null), 4000);
  };

  /* ─── Password helpers ─── */
  const handleGeneratePassword = () => {
    const pw = generatePassword();
    setCreateForm(p => ({ ...p, password: pw }));
    setShowPassword(true);
  };

  const handleCopyPassword = async () => {
    if (createForm.password) {
      await navigator.clipboard.writeText(createForm.password);
      setCopiedPw(true);
      setTimeout(() => setCopiedPw(false), 2000);
    }
  };

  /* ─── Start edit ─── */
  const startEdit = useCallback(async (user: UserRow) => {
    setEditingUser(user);
    setEditForm({ name: user.name, email: user.email, user_profile: user.user_profile, active: user.active, cliente_id: user.cliente_id ?? null });
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
      const currentUser = api.users.find(u => u.email === session.email);
      const performedBy = currentUser?.auth_user_id || "";
      await api.saveUser(editingUser.id, editingUser.auth_user_id, editForm, editAreas, editProjects, performedBy);
      showFeedback("ok", "Usuário atualizado com sucesso.");
      cancelEdit();
      api.loadUsers();
    } catch (err) {
      showFeedback("error", err instanceof Error ? err.message : "Falha ao atualizar.");
    } finally {
      setLoadingEdit(false);
    }
  };

  /* ─── Create user via Edge Function ─── */
  const handleCreate = async () => {
    if (!token || !session) return;
    const { name, email, user_profile, password, cliente_id } = createForm;
    if (!name.trim() || !email.trim()) {
      showFeedback("error", "Nome e e-mail são obrigatórios.");
      return;
    }
    if (!password.trim()) {
      showFeedback("error", "Gere ou insira uma senha para o usuário.");
      return;
    }
    setCreating(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const res = await fetch(`${supabaseUrl}/functions/v1/manage-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: supabaseKey,
        },
        body: JSON.stringify({
          action: "create",
          email: email.trim(),
          password: password.trim(),
          name: name.trim(),
          user_profile,
          cliente_id: cliente_id || null,
          areas: createAreas,
          projects: createProjects,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.ok === false) {
        throw new Error(data.error || `Erro ${res.status}`);
      }

      showFeedback("ok", `Usuário "${name.trim()}" criado com sucesso! Login habilitado.`);
      setCreateForm({ name: "", email: "", user_profile: "Consultor", password: "", cliente_id: null });
      setCreateAreas(["home"]);
      setCreateProjects([]);
      setShowCreate(false);
      setShowPassword(false);
      api.loadUsers();
    } catch (err) {
      showFeedback("error", err instanceof Error ? err.message : "Falha ao criar usuário.");
    } finally {
      setCreating(false);
    }
  };

  /* ─── Delete via Edge Function ─── */
  const handleDelete = async (user: UserRow) => {
    if (!session || !token) return;
    setDeletingId(user.id);
    try {
      if (user.auth_user_id) {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const res = await fetch(`${supabaseUrl}/functions/v1/manage-user`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: supabaseKey,
          },
          body: JSON.stringify({ action: "delete", authUserId: user.auth_user_id }),
        });
        const data = await res.json();
        if (!res.ok || data.ok === false) {
          throw new Error(data.error || `Erro ${res.status}`);
        }
      } else {
        // Fallback for users without auth_user_id
        const currentUser = api.users.find(u => u.email === session.email);
        await api.deleteUser(user.id, user.auth_user_id, currentUser?.auth_user_id || "");
      }
      showFeedback("ok", "Usuário removido com sucesso.");
      setConfirmDeleteId(null);
      api.loadUsers();
    } catch (err) {
      showFeedback("error", err instanceof Error ? err.message : "Falha ao remover.");
    } finally {
      setDeletingId(null);
    }
  };

  /* ─── Deactivate / Disconnect ─── */
  const handleDeactivate = async (user: UserRow) => {
    if (!session) return;
    try {
      const currentUser = api.users.find(u => u.email === session.email);
      await api.saveUser(
        user.id, user.auth_user_id,
        { active: false },
        [], // clear areas = disconnect
        [], // clear projects
        currentUser?.auth_user_id || "",
      );
      showFeedback("ok", `Usuário "${user.name}" desconectado.`);
      api.loadUsers();
    } catch (err) {
      showFeedback("error", err instanceof Error ? err.message : "Falha ao desconectar.");
    }
  };

  /* ─── Load audit (stable, no flicker) ─── */
  const getAuditLogRef = useRef(api.getAuditLog);
  getAuditLogRef.current = api.getAuditLog;

  const loadAudit = useCallback(async () => {
    setLoadingAudit(true);
    const data = await getAuditLogRef.current();
    setAuditLog(data);
    setLoadingAudit(false);
  }, []);

  useEffect(() => {
    if (activeTab === "audit" && !auditLoadedRef.current) {
      auditLoadedRef.current = true;
      loadAudit();
    }
  }, [activeTab, loadAudit]);

  // Reset audit loaded flag when switching away
  useEffect(() => {
    if (activeTab !== "audit") auditLoadedRef.current = false;
  }, [activeTab]);

  /* ─── Filter ─── */
  const filteredUsers = useMemo(() => {
    let list = api.users;
    if (clienteFilter !== "all") {
      list = list.filter(u => u.cliente_id === clienteFilter);
    }
    if (profileFilter !== "all") {
      list = list.filter(u => u.user_profile === profileFilter);
    }
    const term = filter.trim().toLowerCase();
    if (term) {
      list = list.filter(u =>
        u.email.toLowerCase().includes(term) ||
        u.name.toLowerCase().includes(term) ||
        u.user_profile.toLowerCase().includes(term)
      );
    }
    return list;
  }, [filter, clienteFilter, profileFilter, api.users]);

  const clienteMap = useMemo(() => {
    const m = new Map<number, string>();
    api.clientes.forEach(c => m.set(c.cliente_id, c.nome));
    return m;
  }, [api.clientes]);

  const stats = useMemo(() => ({
    total: api.users.length,
    admins: api.users.filter(u => u.user_profile === "Administrador").length,
    consultors: api.users.filter(u => u.user_profile === "Consultor").length,
    active: api.users.filter(u => u.active !== false).length,
  }), [api.users]);

  /* ─── Dropdown helpers ─── */
  const areaOptions = ALL_AREAS.map(a => ({ value: a.value, label: a.label }));
  const projectOptions = api.projects.map(p => ({ value: p.id, label: p.name }));
  const clienteOptions = api.clientes.filter(c => c.Ativo).map(c => ({ value: c.cliente_id, label: c.nome }));

  const toggleInList = <T extends string | number>(val: T, list: T[], setter: (v: T[]) => void) => {
    setter(list.includes(val) ? list.filter(v => v !== val) : [...list, val]);
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
    <div className="page-gradient w-full">
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
        <div className="flex gap-1 rounded-2xl bg-[hsl(var(--task-surface))] p-1.5 border border-[hsl(var(--task-border))]">
          {([
            { key: "users" as const, label: "Usuários", icon: Users },
            { key: "audit" as const, label: "Auditoria", icon: History },
          ]).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition ${
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
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-visible">
                  <div className="task-card p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-[hsl(var(--task-text))] flex items-center gap-2">
                        <UserPlus className="h-4 w-4 text-[hsl(var(--task-purple))]" />
                        Criar Novo Usuário
                      </h3>
                      <button onClick={() => setShowCreate(false)} className="text-[hsl(var(--task-text-muted))] hover:text-[hsl(var(--task-text))]"><X className="h-4 w-4" /></button>
                    </div>

                    {/* Row 1: Name + Email */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                    </div>

                    {/* Row 2: Profile + Password (aligned) */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 items-end">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider text-[hsl(var(--task-text-muted))] font-semibold">Perfil</label>
                        <select value={createForm.user_profile} onChange={e => setCreateForm(p => ({ ...p, user_profile: e.target.value as Perfil }))}
                          className="h-9 w-full rounded-lg border border-[hsl(var(--task-border))] bg-[hsl(var(--task-bg))] px-3 text-xs text-[hsl(var(--task-text))] outline-none focus:border-[hsl(var(--task-purple)/0.5)]">
                          {PERFIS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider text-[hsl(var(--task-text-muted))] font-semibold flex items-center gap-1">
                          <Key className="h-3 w-3" /> Senha *
                        </label>
                        <div className="flex gap-1 h-9">
                          <div className="relative flex-1 min-w-0">
                            <input
                              type={showPassword ? "text" : "password"}
                              value={createForm.password}
                              onChange={e => setCreateForm(p => ({ ...p, password: e.target.value }))}
                              placeholder="Gere uma senha"
                              className="h-9 w-full rounded-lg border border-[hsl(var(--task-border))] bg-[hsl(var(--task-bg))] pl-3 pr-8 text-xs text-[hsl(var(--task-text))] outline-none focus:border-[hsl(var(--task-purple)/0.5)] placeholder:text-[hsl(var(--task-text-muted)/0.4)]"
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-[hsl(var(--task-text-muted))] hover:text-[hsl(var(--task-text))]">
                              {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </button>
                          </div>
                          <button type="button" onClick={handleGeneratePassword} title="Gerar senha"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[hsl(var(--task-border))] bg-[hsl(var(--task-bg))] text-[hsl(var(--task-text-muted))] hover:border-[hsl(var(--task-purple)/0.4)] hover:text-[hsl(var(--task-purple))] transition">
                            <RefreshCw className="h-3.5 w-3.5" />
                          </button>
                          {createForm.password && (
                            <button type="button" onClick={handleCopyPassword} title="Copiar senha"
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[hsl(var(--task-border))] bg-[hsl(var(--task-bg))] text-[hsl(var(--task-text-muted))] hover:border-emerald-500/40 hover:text-emerald-400 transition">
                              {copiedPw ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Row 3: Cliente dropdown */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider text-[hsl(var(--task-text-muted))] font-semibold flex items-center gap-1">
                          <Building2 className="h-3 w-3" /> Cliente
                        </label>
                        <select value={createForm.cliente_id ?? ""} onChange={e => setCreateForm(p => ({ ...p, cliente_id: e.target.value ? Number(e.target.value) : null }))}
                          className="h-9 w-full rounded-lg border border-[hsl(var(--task-border))] bg-[hsl(var(--task-bg))] px-3 text-xs text-[hsl(var(--task-text))] outline-none focus:border-[hsl(var(--task-purple)/0.5)]">
                          <option value="">Nenhum cliente</option>
                          {clienteOptions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                      </div>
                      <div /> {/* spacer */}
                    </div>

                    {/* Row 4: Areas & Projects dropdowns */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <MultiSelectDropdown
                        label="Áreas Permitidas"
                        icon={MapPin}
                        options={areaOptions}
                        selected={createAreas}
                        onToggle={(v) => toggleInList(v as string, createAreas, setCreateAreas)}
                      />
                      <MultiSelectDropdown
                        label="Projetos Acessíveis"
                        icon={FolderOpen}
                        options={projectOptions}
                        selected={createProjects}
                        onToggle={(v) => toggleInList(v as number, createProjects, setCreateProjects)}
                        emptyText="Nenhum projeto encontrado."
                        searchable
                      />
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
                <div key={s.label} className="task-card flex items-center gap-3 p-3 sm:p-4 min-w-0 overflow-hidden">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    s.color === "purple" ? "bg-[hsl(var(--task-purple)/0.15)] text-[hsl(var(--task-purple))]" :
                    s.color === "yellow" ? "bg-[hsl(var(--task-yellow)/0.15)] text-[hsl(var(--task-yellow))]" :
                    s.color === "blue" ? "bg-[hsl(220_90%_56%/0.15)] text-[hsl(220_90%_56%)]" :
                    "bg-emerald-500/15 text-emerald-400"
                  }`}>
                    <s.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase tracking-[0.15em] text-[hsl(var(--task-text-muted))] truncate">{s.label}</p>
                    <p className="text-xl font-extrabold text-[hsl(var(--task-text))]">{s.value}</p>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* ═══ MAIN CONTENT ═══ */}
            <div className={`grid gap-5 ${showEditPanel ? "lg:grid-cols-[1fr_420px]" : "grid-cols-1"}`}>
              {/* ─── USER LIST ─── */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="task-card overflow-visible"
              >
                {/* ── Header com busca ── */}
                <div className="p-5 pb-4 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-base font-bold text-[hsl(var(--task-text))] flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[hsl(var(--task-purple)/0.15)]">
                        <Users className="h-3.5 w-3.5 text-[hsl(var(--task-purple))]" />
                      </div>
                      Usuários Cadastrados
                      <span className="ml-1 inline-flex items-center justify-center rounded-full bg-[hsl(var(--task-purple)/0.15)] px-2 py-0.5 text-[10px] font-bold text-[hsl(var(--task-purple))]">
                        {filteredUsers.length}
                      </span>
                    </h2>
                  </div>

                  {/* Search + Client filter row */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--task-text-muted)/0.5)]" />
                      <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Buscar por nome, e-mail..."
                        className="h-10 w-full rounded-xl border border-[hsl(var(--task-border))] bg-[hsl(var(--task-bg)/0.6)] pl-10 pr-3 text-xs text-[hsl(var(--task-text))] outline-none transition-all focus:border-[hsl(var(--task-purple)/0.5)] focus:bg-[hsl(var(--task-bg))] focus:shadow-[0_0_0_3px_hsl(var(--task-purple)/0.08)] placeholder:text-[hsl(var(--task-text-muted)/0.4)]" />
                    </div>
                    <select value={clienteFilter === "all" ? "" : clienteFilter} onChange={e => setClienteFilter(e.target.value ? Number(e.target.value) : "all")}
                      className="h-10 w-full sm:w-48 rounded-xl border border-[hsl(var(--task-border))] bg-[hsl(var(--task-bg)/0.6)] px-3 text-xs text-[hsl(var(--task-text))] outline-none transition-all focus:border-[hsl(var(--task-purple)/0.5)] focus:shadow-[0_0_0_3px_hsl(var(--task-purple)/0.08)]">
                      <option value="">Todos os clientes</option>
                      {clienteOptions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>

                  {/* Profile filter chips */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: "all", label: "Todos" },
                      ...PERFIS.map(p => ({ key: p, label: p })),
                    ].map(chip => {
                      const isActive = profileFilter === chip.key;
                      const count = chip.key === "all" ? api.users.length : api.users.filter(u => u.user_profile === chip.key).length;
                      return (
                        <button key={chip.key} onClick={() => setProfileFilter(chip.key)}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all duration-200 ${
                            isActive
                              ? "bg-[hsl(var(--task-purple)/0.2)] text-[hsl(var(--task-purple))] border border-[hsl(var(--task-purple)/0.3)] shadow-[0_0_8px_hsl(var(--task-purple)/0.15)]"
                              : "bg-[hsl(var(--task-bg)/0.5)] text-[hsl(var(--task-text-muted))] border border-[hsl(var(--task-border)/0.5)] hover:border-[hsl(var(--task-purple)/0.25)] hover:text-[hsl(var(--task-text))] hover:bg-[hsl(var(--task-bg))]"
                          }`}>
                          {chip.label}
                          <span className={`inline-flex items-center justify-center rounded-full px-1.5 min-w-[18px] h-[18px] text-[9px] font-bold ${
                            isActive 
                              ? "bg-[hsl(var(--task-purple)/0.25)] text-[hsl(var(--task-purple))]" 
                              : "bg-[hsl(var(--task-border)/0.3)] text-[hsl(var(--task-text-muted)/0.6)]"
                          }`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Divider */}
                <div className="mx-5 border-t border-[hsl(var(--task-border)/0.3)]" />

                {api.loading && api.users.length === 0 && (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-5 w-5 animate-spin text-[hsl(var(--task-purple))]" />
                    <span className="ml-2 text-sm text-[hsl(var(--task-text-muted))]">Carregando...</span>
                  </div>
                )}

                {!api.loading && filteredUsers.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--task-bg))] border border-[hsl(var(--task-border)/0.3)] mb-4">
                      <Users className="h-6 w-6 text-[hsl(var(--task-text-muted)/0.25)]" />
                    </div>
                    <p className="text-sm font-medium text-[hsl(var(--task-text-muted))]">
                      {api.users.length === 0 ? "Nenhum usuário encontrado." : "Nenhum resultado para o filtro."}
                    </p>
                    <p className="text-xs text-[hsl(var(--task-text-muted)/0.5)] mt-1">Tente ajustar os filtros acima.</p>
                    {api.error && (
                      <p className="text-xs text-rose-400 mt-2">{api.error}</p>
                    )}
                  </div>
                )}

                {filteredUsers.length > 0 && (
                  <div className="p-3 space-y-2">
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
                          className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group cursor-pointer ${
                            isSelected 
                              ? "bg-[hsl(var(--task-purple)/0.08)] border border-[hsl(var(--task-purple)/0.25)] shadow-[0_0_12px_hsl(var(--task-purple)/0.08)]" 
                              : "bg-[hsl(var(--task-bg)/0.3)] border border-transparent hover:bg-[hsl(var(--task-bg)/0.6)] hover:border-[hsl(var(--task-border)/0.4)]"
                          }`}
                          onClick={() => startEdit(user)}
                        >
                          <div className="relative">
                            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition-all ${
                              isSelected
                                ? "bg-gradient-to-br from-[hsl(262_83%_58%)] to-[hsl(234_89%_64%)] text-white shadow-lg shadow-[hsl(262_83%_58%/0.3)]"
                                : "bg-[hsl(var(--task-purple)/0.12)] text-[hsl(var(--task-purple))]"
                            }`}>
                              {initials}
                            </div>
                            <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[hsl(var(--task-surface))] ${
                              user.active !== false ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.4)]" : "bg-rose-400"
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-[hsl(var(--task-text))] truncate">{user.name || "Sem nome"}</p>
                              <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[10px] font-semibold ${profileColor(user.user_profile)}`}>
                                {user.user_profile || "Consultor"}
                              </span>
                              {user.active === false && (
                                <span className="inline-flex items-center rounded-lg border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-400">Inativo</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-[11px] text-[hsl(var(--task-text-muted)/0.7)]">
                              <span className="flex items-center gap-1.5 truncate"><Mail className="h-3 w-3 shrink-0 opacity-50" />{user.email}</span>
                              {user.cliente_id && clienteMap.get(user.cliente_id) && (
                                <span className="flex items-center gap-1.5 truncate"><Building2 className="h-3 w-3 shrink-0 opacity-50" />{clienteMap.get(user.cliente_id)}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                            <button onClick={() => startEdit(user)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-[hsl(var(--task-text-muted))] hover:bg-[hsl(var(--task-purple)/0.12)] hover:text-[hsl(var(--task-purple))] transition" title="Editar">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => handleDeactivate(user)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-[hsl(var(--task-text-muted))] hover:bg-amber-500/10 hover:text-amber-400 transition" title="Desconectar">
                              <Power className="h-3.5 w-3.5" />
                            </button>
                            {confirmDeleteId === user.id ? (
                              <div className="flex items-center gap-1">
                                <button onClick={() => handleDelete(user)} disabled={deletingId === user.id}
                                  className="flex h-8 items-center gap-1 rounded-lg bg-rose-500/20 border border-rose-500/30 px-2.5 text-[10px] font-semibold text-rose-400 hover:bg-rose-500/30 transition disabled:opacity-50">
                                  {deletingId === user.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />} Confirmar
                                </button>
                                <button onClick={() => setConfirmDeleteId(null)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[hsl(var(--task-text-muted))] hover:text-[hsl(var(--task-text))]">
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => setConfirmDeleteId(user.id)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-[hsl(var(--task-text-muted))] hover:bg-rose-500/10 hover:text-rose-400 transition" title="Excluir">
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
                    className="task-card p-5 space-y-4 h-fit sticky top-20 overflow-visible"
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

                    {/* Cliente dropdown */}
                    <div className="pt-2 border-t border-[hsl(var(--task-border))]">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider text-[hsl(var(--task-text-muted))] font-semibold flex items-center gap-1">
                          <Building2 className="h-3 w-3" /> Cliente
                        </label>
                        <select value={editForm.cliente_id ?? ""} onChange={e => setEditForm(p => ({ ...p, cliente_id: e.target.value ? Number(e.target.value) : null }))}
                          className="h-9 w-full rounded-lg border border-[hsl(var(--task-border))] bg-[hsl(var(--task-bg))] px-3 text-xs text-[hsl(var(--task-text))] outline-none focus:border-[hsl(var(--task-purple)/0.5)]">
                          <option value="">Nenhum cliente</option>
                          {clienteOptions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Areas dropdown */}
                    <div className="pt-2 border-t border-[hsl(var(--task-border))]">
                      <MultiSelectDropdown
                        label="Áreas Permitidas"
                        icon={MapPin}
                        options={areaOptions}
                        selected={editAreas}
                        onToggle={(v) => toggleInList(v as string, editAreas, setEditAreas)}
                      />
                    </div>

                    {/* Projects dropdown */}
                    <div className="pt-2 border-t border-[hsl(var(--task-border))]">
                      <MultiSelectDropdown
                        label="Projetos Acessíveis"
                        icon={FolderOpen}
                        options={projectOptions}
                        selected={editProjects}
                        onToggle={(v) => toggleInList(v as number, editProjects, setEditProjects)}
                        emptyText="Nenhum projeto encontrado."
                        searchable
                      />
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

            {!loadingAudit && auditLog.length > 0 && (
              <div className="divide-y divide-[hsl(var(--task-border)/0.4)]">
                {auditLog.map((log) => {
                  const actionLabel = log.action === "update_user" ? "Atualizou usuário" :
                    log.action === "delete_user" ? "Removeu usuário" :
                    log.action === "create_user" ? "Criou usuário" : log.action;
                  const actionColor = log.action === "delete_user" ? "text-rose-400" :
                    log.action === "create_user" ? "text-emerald-400" : "text-[hsl(var(--task-purple))]";
                  const details = log.details as Record<string, unknown> | null;
                  const changes = details?.changes as Record<string, unknown> | undefined;

                  return (
                    <div key={log.id} className="px-4 py-3 flex items-start gap-3">
                      <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                        log.action === "delete_user" ? "bg-rose-500/10" :
                        log.action === "create_user" ? "bg-emerald-500/10" : "bg-[hsl(var(--task-purple)/0.1)]"
                      }`}>
                        {log.action === "delete_user" ? <Trash2 className="h-3.5 w-3.5 text-rose-400" /> :
                         log.action === "create_user" ? <UserPlus className="h-3.5 w-3.5 text-emerald-400" /> :
                         <Pencil className="h-3.5 w-3.5 text-[hsl(var(--task-purple))]" />}
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
