import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth, type AccessArea } from "@/modules/auth/hooks/useAuth";
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
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  UserPlus,
  Mail,
  User,
  Key,
  
  Lock,
} from "lucide-react";

/* ─── Types ─── */
const perfis = ["Administrador", "Consultor"] as const;
type Perfil = (typeof perfis)[number];

const ALL_AREAS: AccessArea[] = ["home", "comodato", "integracoes", "tarefas", "usuarios"];
const AREA_LABELS: Record<AccessArea, string> = { home: "Início", comodato: "Comodato", integracoes: "Integrações", tarefas: "Tarefas", usuarios: "Usuários" };

type UserRow = {
  id: string;
  auth_user_id: string;
  email: string;
  name: string;
  user_profile: string;
  
  allowed_areas?: AccessArea[];
  active?: boolean;
};

/* ─── Helpers ─── */
const safeJson = async (res: Response) => {
  const text = await res.text();
  try { return text ? JSON.parse(text) : null; } catch { return { raw: text }; }
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
  const [editingId, setEditingId] = useState<string | null>(null);

  const token = session?.accessToken;

  /* ─── Load users from public.users table via REST API ─── */
  const loadUsers = useCallback(async () => {
    if (!token) return;
    setLoadingList(true);
    setFeedback(null);
    try {
      const base = SUPABASE_URL.replace(/\/$/, "");
      const res = await fetch(
        `${base}/rest/v1/users?select=id,auth_user_id,email,name,user_profile,active&order=name.asc&limit=200`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!res.ok) {
        const data = await safeJson(res);
        throw new Error(data?.message ?? data?.error ?? `HTTP ${res.status}`);
      }
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
      setFeedback({ type: "error", message: err instanceof Error ? err.message : "Falha ao carregar usuários." });
    } finally {
      setLoadingList(false);
    }
  }, [token]);

  useEffect(() => {
    if (!loadingSession && token && isAdmin) loadUsers();
  }, [loadingSession, token, isAdmin, loadUsers]);

  const filteredUsers = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return users;
    return users.filter(u =>
      u.email.toLowerCase().includes(term) ||
      u.name.toLowerCase().includes(term) ||
      u.user_profile.toLowerCase().includes(term) ||
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
          <button onClick={() => loadUsers()} disabled={loadingList}
            className="flex items-center gap-1.5 rounded-xl border border-[hsl(var(--task-border))] bg-[hsl(var(--task-surface))] px-3 py-2 text-xs font-medium text-[hsl(var(--task-text-muted))] transition hover:border-[hsl(var(--task-purple)/0.4)] hover:text-[hsl(var(--task-purple))] disabled:opacity-40"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingList ? "animate-spin" : ""}`} />
            Atualizar
          </button>
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

        {/* ═══ STATS ═══ */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {[
            { label: "Total", value: stats.total, icon: Users, color: "purple" },
            { label: "Administradores", value: stats.admins, icon: Shield, color: "yellow" },
            { label: "Consultores", value: stats.consultors, icon: User, color: "blue" },
            { label: "Ativos", value: stats.active, icon: CheckCircle2, color: "green" },
          ].map((s, i) => (
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

          {/* Loading state */}
          {loadingList && users.length === 0 && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-[hsl(var(--task-purple))]" />
              <span className="ml-2 text-sm text-[hsl(var(--task-text-muted))]">Carregando...</span>
            </div>
          )}

          {/* Empty state */}
          {!loadingList && filteredUsers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-10 w-10 text-[hsl(var(--task-text-muted)/0.15)] mb-3" />
              <p className="text-sm font-medium text-[hsl(var(--task-text-muted))]">
                {users.length === 0 ? "Nenhum usuário encontrado na tabela." : "Nenhum resultado para o filtro."}
              </p>
              {users.length === 0 && (
                <p className="text-xs text-[hsl(var(--task-text-muted)/0.5)] mt-1 max-w-xs">
                  Verifique se a tabela <code className="text-[hsl(var(--task-purple))]">public.users</code> existe e tem dados. As políticas RLS devem permitir leitura para admins.
                </p>
              )}
            </div>
          )}

          {/* User cards */}
          {filteredUsers.length > 0 && (
            <div className="divide-y divide-[hsl(var(--task-border)/0.4)]">
              {filteredUsers.map((user, idx) => {
                const initials = (user.name || user.email || "U")
                  .split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
                const isEditing = editingId === user.auth_user_id;
                const profileColor = (user.user_profile === "Administrador" || user.user_profile === "admin")
                  ? "text-[hsl(var(--task-yellow))] bg-[hsl(var(--task-yellow)/0.1)] border-[hsl(var(--task-yellow)/0.2)]"
                  : "text-[hsl(var(--task-purple))] bg-[hsl(var(--task-purple)/0.1)] border-[hsl(var(--task-purple)/0.2)]";

                return (
                  <motion.div
                    key={user.auth_user_id || user.id}
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
                      {/* Areas badges */}
                      {user.allowed_areas && user.allowed_areas.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {user.allowed_areas.map(area => (
                            <span key={area} className="rounded-md bg-[hsl(var(--task-bg))] border border-[hsl(var(--task-border))] px-1.5 py-0.5 text-[9px] text-[hsl(var(--task-text-muted))] capitalize">
                              {AREA_LABELS[area] || area}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Info badge — shows on hover */}
                    <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] text-[hsl(var(--task-text-muted)/0.5)]">
                        ID: {(user.auth_user_id || user.id).slice(0, 8)}…
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* ═══ INFO CARD ═══ */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
          className="rounded-xl border border-[hsl(var(--task-border)/0.5)] bg-[hsl(var(--task-surface)/0.4)] p-4"
        >
          <div className="flex items-start gap-3">
            <Lock className="h-4 w-4 shrink-0 text-[hsl(var(--task-yellow))] mt-0.5" />
            <div className="text-xs text-[hsl(var(--task-text-muted))] space-y-1">
              <p className="font-semibold text-[hsl(var(--task-text))]">Operações administrativas</p>
              <p>
                A criação, edição e remoção de usuários requer uma <strong>Edge Function</strong> no Supabase com acesso à <code className="text-[hsl(var(--task-purple))]">service_role_key</code>.
                Atualmente, esta tela exibe os dados da tabela <code className="text-[hsl(var(--task-purple))]">public.users</code> via REST API.
              </p>
              <p>
                Para habilitar operações CRUD, é necessário criar uma Edge Function <code className="text-[hsl(var(--task-purple))]">admin-users</code> baseada na API route do projeto Consulta.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
