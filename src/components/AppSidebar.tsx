import { useState } from "react";
import {
  Home,
  FolderKanban,
  ListTodo,
  BarChart3,
  UserPlus,
  Package,
  LogOut,
  ChevronDown,
  Settings,
  HelpCircle,
  MoreVertical,
  PanelLeft,
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

function UserAvatar({ name, email }: { name?: string; email?: string }) {
  const initials = (name || email || "U")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/[0.06] border border-white/[0.08] px-3 py-3 transition-all hover:bg-white/[0.1] cursor-pointer group">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[hsl(234_89%_64%)] to-[hsl(280_70%_55%)] text-xs font-bold text-white shadow-lg shadow-[hsl(234_89%_50%/0.4)]">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-white">
          {name || "Usuário"}
        </p>
        <p className="truncate text-[11px] text-white/50">{email || ""}</p>
      </div>
      <MoreVertical className="h-4 w-4 text-white/30 group-hover:text-white/60 transition-colors shrink-0" />
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
  return (
    <NavLink
      to={to}
      end={end}
      className="group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-white/60 transition-all duration-200 hover:bg-white/[0.08] hover:text-white whitespace-nowrap"
      activeClassName="!bg-white/[0.15] !text-white shadow-lg shadow-[hsl(234_89%_50%/0.2)] hover:!bg-white/[0.15] hover:!text-white"
    >
      <Icon className="h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110" />
      <span className="truncate">{label}</span>
    </NavLink>
  );
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

export function AppSidebar() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [projectsOpen, setProjectsOpen] = useState(() => {
    return ["/tarefas", "/analiticas"].some((p) =>
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

  return (
    <Sidebar
      collapsible="offcanvas"
      className="!border-r-0 ml-0 rounded-br-2xl shadow-[4px_0_30px_-4px_rgba(0,0,0,0.7)]"
      style={{
        zIndex: 20,
        background: "linear-gradient(180deg, hsl(234 50% 12%) 0%, hsl(260 45% 10%) 50%, hsl(234 45% 8%) 100%)",
      }}
    >
      {/* Logo + toggle */}
      <div className="flex items-center justify-between px-4 pt-5 pb-1">
        <img
          src="/resouce/ISP-Consulte-v3-branco.png"
          alt="ISP Consulte"
          className="h-9 w-auto object-contain transition-all duration-500 hover:brightness-125 hover:drop-shadow-[0_0_8px_hsl(234_89%_64%/0.5)]"
        />
        <ToggleButton />
      </div>

      <SidebarContent className="px-3 pt-5">
        {/* MENU section */}
        <div className="mb-5">
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-white/25">
            Menu
          </p>
          <nav className="flex flex-col gap-0.5">
            <SidebarNavItem to="/" icon={Home} label="Página Inicial" end />

            {/* Projetos collapsible */}
            <button
              onClick={() => setProjectsOpen((o) => !o)}
              className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200 ${
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
                <NavLink
                  to="/tarefas"
                  className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] font-medium text-white/50 transition-all duration-200 hover:bg-white/[0.06] hover:text-white"
                  activeClassName="!text-white !bg-white/[0.1]"
                >
                  <ListTodo className="h-4 w-4" />
                  <span>Tarefas</span>
                </NavLink>
                <NavLink
                  to="/analiticas"
                  className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[13px] font-medium text-white/50 transition-all duration-200 hover:bg-white/[0.06] hover:text-white"
                  activeClassName="!text-white !bg-white/[0.1]"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>Analíticas</span>
                </NavLink>
              </div>
            )}

            <SidebarNavItem to="/usuarios" icon={UserPlus} label="Usuários" />
            <SidebarNavItem to="/comodato" icon={Package} label="Comodato" />
          </nav>
        </div>

        {/* MANAGE section */}
        <div>
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-white/25">
            Gerenciar
          </p>
          <nav className="flex flex-col gap-0.5">
            <SidebarNavItem to="/configuracoes" icon={Settings} label="Configurações" />
            <SidebarNavItem to="/suporte" icon={HelpCircle} label="Suporte" />
          </nav>
        </div>
      </SidebarContent>

      <SidebarFooter className="!border-t-0 px-3 pb-4 pt-2 space-y-2">
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <UserAvatar name={session?.name} email={session?.email} />
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-white/40 transition-all duration-200 hover:bg-white/[0.06] hover:text-rose-400"
        >
          <LogOut className="h-[18px] w-[18px]" />
          Sair
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
