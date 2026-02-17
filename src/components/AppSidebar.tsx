import { useEffect, useState } from "react";
import {
  Home,
  FolderKanban,
  ListTodo,
  BarChart3,
  Users,
  Package,
  LogOut,
  ChevronDown,
  Plug,
  HelpCircle,
  PanelLeft,
  Shield,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabaseExt } from "@/lib/supabase";

/** Set auth session on the shared client so storage/DB calls work */
async function ensureSession(accessToken?: string, refreshToken?: string) {
  if (!accessToken || !refreshToken) return;
  const { data } = await supabaseExt.auth.getSession();
  if (!data.session) {
    await supabaseExt.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  }
}

function UserAvatar({ name, email, collapsed, avatarUrl }: { name?: string; email?: string; collapsed?: boolean; avatarUrl?: string | null }) {
  const initials = (name || email || "U")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const avatar = avatarUrl ? (
    <img src={avatarUrl} alt="Avatar" className="h-full w-full rounded-full object-cover" />
  ) : (
    <span className="text-xs font-bold text-white">{initials}</span>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center justify-center py-1 cursor-pointer">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[hsl(234_89%_64%)] to-[hsl(280_70%_55%)] text-[10px] font-bold text-white shadow-lg shadow-[hsl(234_89%_50%/0.4)] overflow-hidden">
              {avatar}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">{name || email || "Usuário"}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/[0.06] border border-white/[0.08] px-3 py-3 transition-all hover:bg-white/[0.1] cursor-pointer group">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[hsl(234_89%_64%)] to-[hsl(280_70%_55%)] text-xs font-bold text-white shadow-lg shadow-[hsl(234_89%_50%/0.4)] overflow-hidden">
        {avatar}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-white">
          {name || "Usuário"}
        </p>
        <p className="truncate text-[11px] text-white/50">{email || ""}</p>
      </div>
    </div>
  );
}

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  end?: boolean;
}

function SidebarNavItem({ to, icon: Icon, label, end }: NavItemProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const link = (
    <NavLink
      to={to}
      end={end}
      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium text-white/60 transition-all duration-200 hover:bg-white/[0.08] hover:text-white whitespace-nowrap ${collapsed ? "justify-center !px-0" : ""}`}
      activeClassName="!bg-white/[0.15] !text-white shadow-lg shadow-[hsl(234_89%_50%/0.2)] !rounded-xl hover:!bg-white/[0.15] hover:!text-white"
    >
      <Icon className="h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110" />
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

function ToggleButton() {
  const { toggleSidebar } = useSidebar();
  return (
    <button
      onClick={toggleSidebar}
      className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/[0.08] hover:text-white/70"
    >
      <PanelLeft className="h-4 w-4" />
    </button>
  );
}

type AppSidebarProps = {
  notificationBell?: React.ReactNode;
};

export function AppSidebar({ notificationBell }: AppSidebarProps) {
  const { session, logout, canAccess } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Load avatar on mount
  useEffect(() => {
    if (!session?.accessToken) return;
    let cancelled = false;
    const loadAvatar = async () => {
      try {
        await ensureSession(session.accessToken, session.refreshToken);
        const { data: { user } } = await supabaseExt.auth.getUser();
        if (!user || cancelled) return;
        const { data: userData, error } = await supabaseExt
          .from("users")
          .select("avatar_url")
          .eq("auth_user_id", user.id)
          .maybeSingle();
        if (!cancelled && !error && userData?.avatar_url) {
          setAvatarUrl(userData.avatar_url);
        }
      } catch { /* ignore - non-critical */ }
    };
    loadAvatar();
    return () => { cancelled = true; };
  }, [session?.accessToken, session?.refreshToken]);

  const [projectsOpen, setProjectsOpen] = useState(() => {
    return ["/tarefas", "/analiticas"].some((p) =>
      location.pathname.startsWith(p)
    );
  });
  const [adminOpen, setAdminOpen] = useState(() => {
    return ["/usuarios", "/integracoes"].some((p) =>
      location.pathname.startsWith(p)
    );
  });

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isProjectsActive = ["/tarefas", "/analiticas"].some((p) =>
    location.pathname.startsWith(p)
  );

  const isAdminActive = ["/usuarios", "/integracoes"].some((p) =>
    location.pathname.startsWith(p)
  );

  const showAdminSection = canAccess("usuarios");

   return (
    <Sidebar
      collapsible="icon"
      className="!border-r-0 ml-0 shadow-[4px_0_30px_-4px_rgba(0,0,0,0.7)]"
      style={{
        zIndex: 20,
        borderRadius: 0,
        background: "linear-gradient(180deg, hsl(234 50% 12%) 0%, hsl(260 45% 10%) 50%, hsl(234 45% 8%) 100%)",
      }}
    >
      {/* Logo + notifications + toggle */}
      <div className={`flex items-center ${collapsed ? "justify-center px-1 pt-4 pb-1" : "justify-between px-4 pt-5 pb-1"}`}>
        {!collapsed && (
          <img
            src="/resouce/ISP-Consulte-v3-branco.png"
            alt="ISP Consulte"
            className="h-9 w-auto object-contain transition-all duration-500 hover:brightness-125 hover:drop-shadow-[0_0_8px_hsl(234_89%_64%/0.5)]"
          />
        )}
        <div className="flex items-center gap-1">
          {notificationBell}
          <ToggleButton />
        </div>
      </div>

      <SidebarContent className={`${collapsed ? "px-1" : "px-3"} pt-5`}>
        {/* MENU section */}
        <div className="mb-5">
          {!collapsed && (
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-white/25">
              Menu
            </p>
          )}
          <nav className="flex flex-col gap-0.5">
            <SidebarNavItem to="/" icon={Home} label="Página Inicial" end />

            {/* Projetos collapsible — only show if user can access tarefas or analiticas */}
            {(canAccess("tarefas") || canAccess("analiticas")) && (
              collapsed ? (
                <>
                  {canAccess("tarefas") && <SidebarNavItem to="/tarefas" icon={ListTodo} label="Tarefas" />}
                  {canAccess("analiticas") && <SidebarNavItem to="/analiticas" icon={BarChart3} label="Analíticas" />}
                </>
              ) : (
                <>
                  <button
                    onClick={() => setProjectsOpen((o) => !o)}
                    className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-all duration-200 ${
                      isProjectsActive
                        ? "bg-white/[0.15] text-white shadow-lg shadow-[hsl(234_89%_50%/0.2)]"
                        : "text-white/60 hover:bg-white/[0.08] hover:text-white"
                    }`}
                  >
                    <FolderKanban className="h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110" />
                    <span className="flex-1 text-left">Projetos</span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 opacity-60 transition-transform duration-200 ${
                        projectsOpen ? "rotate-0" : "-rotate-90"
                      }`}
                    />
                  </button>

                  {(projectsOpen || isProjectsActive) && (
                    <div className="ml-[18px] mt-0.5 flex flex-col gap-0.5 border-l-2 border-white/10 pl-3">
                      {canAccess("tarefas") && (
                        <NavLink
                          to="/tarefas"
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-white/50 transition-all duration-200 hover:bg-white/[0.06] hover:text-white"
                          activeClassName="!text-white !bg-white/[0.1] !rounded-xl"
                        >
                          <ListTodo className="h-4 w-4" />
                          <span>Tarefas</span>
                        </NavLink>
                      )}
                      {canAccess("analiticas") && (
                        <NavLink
                          to="/analiticas"
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-white/50 transition-all duration-200 hover:bg-white/[0.06] hover:text-white"
                          activeClassName="!text-white !bg-white/[0.1] !rounded-xl"
                        >
                          <BarChart3 className="h-4 w-4" />
                          <span>Analíticas</span>
                        </NavLink>
                      )}
                    </div>
                  )}
                </>
              )
            )}

            {canAccess("comodato") && <SidebarNavItem to="/comodato" icon={Package} label="Comodato" />}
          </nav>
        </div>

        {/* ADMIN section — only for admins */}
        {showAdminSection && (
          <div className="mb-5">
            {!collapsed && (
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-white/25">
                Administração
              </p>
            )}
            <nav className="flex flex-col gap-0.5">
              {collapsed ? (
                <>
                  <SidebarNavItem to="/usuarios" icon={Users} label="Usuários" />
                  <SidebarNavItem to="/integracoes" icon={Plug} label="Integrações" />
                </>
              ) : (
                <>
                  <button
                    onClick={() => setAdminOpen((o) => !o)}
                    className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-all duration-200 ${
                      isAdminActive
                        ? "bg-white/[0.15] text-white shadow-lg shadow-[hsl(234_89%_50%/0.2)]"
                        : "text-white/60 hover:bg-white/[0.08] hover:text-white"
                    }`}
                  >
                    <Shield className="h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110" />
                    <span className="flex-1 text-left">Painel Admin</span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 opacity-60 transition-transform duration-200 ${
                        adminOpen ? "rotate-0" : "-rotate-90"
                      }`}
                    />
                  </button>

                  {(adminOpen || isAdminActive) && (
                    <div className="ml-[18px] mt-0.5 flex flex-col gap-0.5 border-l-2 border-white/10 pl-3">
                      <NavLink
                        to="/usuarios"
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-white/50 transition-all duration-200 hover:bg-white/[0.06] hover:text-white"
                        activeClassName="!text-white !bg-white/[0.1] !rounded-xl"
                      >
                        <Users className="h-4 w-4" />
                        <span>Usuários</span>
                      </NavLink>
                      <NavLink
                        to="/integracoes"
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-white/50 transition-all duration-200 hover:bg-white/[0.06] hover:text-white"
                        activeClassName="!text-white !bg-white/[0.1] !rounded-xl"
                      >
                        <Plug className="h-4 w-4" />
                        <span>Integrações</span>
                      </NavLink>
                    </div>
                  )}
                </>
              )}
            </nav>
          </div>
        )}

        {/* SUPPORT section */}
        <div>
          {!collapsed && (
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-white/25">
              Suporte
            </p>
          )}
          <nav className="flex flex-col gap-0.5">
            <SidebarNavItem to="/suporte" icon={HelpCircle} label="Ajuda" />
          </nav>
        </div>
      </SidebarContent>

      <SidebarFooter className={`!border-t-0 ${collapsed ? "px-1" : "px-3"} pb-4 pt-2 space-y-2`}>
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <UserAvatar
          name={session?.name}
          email={session?.email}
          collapsed={collapsed}
          avatarUrl={avatarUrl}
        />
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleLogout}
                className="flex w-full items-center justify-center rounded-xl py-2 text-white/40 transition-all duration-200 hover:bg-white/[0.06] hover:text-rose-400"
              >
                <LogOut className="h-[18px] w-[18px]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Sair</TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[14px] font-medium text-white/40 transition-all duration-200 hover:bg-white/[0.06] hover:text-rose-400"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Sair
          </button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
