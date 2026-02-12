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
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
} from "@/components/ui/sidebar";

function UserAvatar({ name, email }: { name?: string; email?: string }) {
  const initials = (name || email || "U")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {name || "Usuário"}
        </p>
        <p className="truncate text-xs text-muted-foreground">{email || ""}</p>
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
  return (
    <NavLink
      to={to}
      end={end}
      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-all duration-200 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
      activeClassName="bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary hover:text-primary-foreground"
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      <span>{label}</span>
    </NavLink>
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
    <Sidebar className="!border-r-0 ml-0 rounded-br-2xl bg-gradient-to-b from-sidebar to-[hsl(234_40%_8%)] shadow-[4px_0_30px_-4px_rgba(0,0,0,0.7)] animate-slide-in-right" style={{ zIndex: 20 }}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 pt-6 pb-2">
        <img
          src="/resouce/ISP-Consulte-v3-branco.png"
          alt="ISP Consulte"
          className="h-8 w-auto object-contain"
        />
      </div>

      <SidebarContent className="px-3 pt-6">
        {/* MENU section */}
        <div className="mb-6">
          <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/50">
            Menu
          </p>
          <nav className="flex flex-col gap-1">
            <SidebarNavItem to="/" icon={Home} label="Página Inicial" end />

            {/* Projetos collapsible */}
            <button
              onClick={() => setProjectsOpen((o) => !o)}
              className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isProjectsActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              }`}
            >
              <FolderKanban className="h-[18px] w-[18px] shrink-0" />
              <span className="flex-1 text-left">Projetos</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${
                  projectsOpen ? "rotate-0" : "-rotate-90"
                }`}
              />
            </button>

            {(projectsOpen || isProjectsActive) && (
              <div className="ml-4 mt-1 flex flex-col gap-1 border-l border-primary/20 pl-3">
                <NavLink
                  to="/tarefas"
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-sidebar-foreground transition-all duration-200 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                  activeClassName="text-primary bg-primary/10"
                >
                  <ListTodo className="h-4 w-4" />
                  <span>Tarefas</span>
                </NavLink>
                <NavLink
                  to="/analiticas"
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-sidebar-foreground transition-all duration-200 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                  activeClassName="text-primary bg-primary/10"
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
          <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/50">
            Gerenciar
          </p>
          <nav className="flex flex-col gap-1">
            <SidebarNavItem to="/configuracoes" icon={Settings} label="Configurações" />
            <SidebarNavItem to="/suporte" icon={HelpCircle} label="Suporte" />
          </nav>
        </div>
      </SidebarContent>

      <SidebarFooter className="!border-t-0 p-4 space-y-3">
        {/* Subtle purple separator */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent mb-1" />
        <UserAvatar name={session?.name} email={session?.email} />
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-all duration-200 hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-[18px] w-[18px]" />
          Sair
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
