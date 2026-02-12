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
    <div className="flex items-center gap-3 rounded-xl bg-muted/30 px-3 py-2.5 transition-colors hover:bg-muted/50">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-xs font-bold text-primary-foreground shadow-md shadow-primary/25">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-foreground">
          {name || "Usuário"}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">{email || ""}</p>
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
      className="group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground transition-all duration-200 hover:bg-foreground/5 hover:text-foreground"
      activeClassName="!bg-primary !text-primary-foreground shadow-lg shadow-primary/30 hover:!bg-primary hover:!text-primary-foreground"
    >
      <Icon className="h-[18px] w-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110" />
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
    <Sidebar
      className="!border-r-0 ml-0 rounded-br-2xl bg-[hsl(228_42%_7%)] shadow-[4px_0_30px_-4px_rgba(0,0,0,0.7)] animate-slide-in-right"
      style={{ zIndex: 20 }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 pt-5 pb-1">
        <img
          src="/resouce/ISP-Consulte-v3-branco.png"
          alt="ISP Consulte"
          className="h-7 w-auto object-contain"
        />
      </div>

      <SidebarContent className="px-3 pt-5">
        {/* MENU section */}
        <div className="mb-5">
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/40">
            Menu
          </p>
          <nav className="flex flex-col gap-0.5">
            <SidebarNavItem to="/" icon={Home} label="Página Inicial" end />

            {/* Projetos collapsible */}
            <button
              onClick={() => setProjectsOpen((o) => !o)}
              className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200 ${
                isProjectsActive
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                  : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
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
              <div className="ml-[18px] mt-0.5 flex flex-col gap-0.5 border-l-2 border-primary/25 pl-3">
                <NavLink
                  to="/tarefas"
                  className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-all duration-200 hover:bg-foreground/5 hover:text-foreground"
                  activeClassName="!text-primary !bg-primary/10"
                >
                  <ListTodo className="h-3.5 w-3.5" />
                  <span>Tarefas</span>
                </NavLink>
                <NavLink
                  to="/analiticas"
                  className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-all duration-200 hover:bg-foreground/5 hover:text-foreground"
                  activeClassName="!text-primary !bg-primary/10"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
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
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/40">
            Gerenciar
          </p>
          <nav className="flex flex-col gap-0.5">
            <SidebarNavItem to="/configuracoes" icon={Settings} label="Configurações" />
            <SidebarNavItem to="/suporte" icon={HelpCircle} label="Suporte" />
          </nav>
        </div>
      </SidebarContent>

      <SidebarFooter className="!border-t-0 px-3 pb-4 pt-2 space-y-2">
        <div className="h-px bg-gradient-to-r from-transparent via-foreground/8 to-transparent" />
        <UserAvatar name={session?.name} email={session?.email} />
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-muted-foreground transition-all duration-200 hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-[18px] w-[18px]" />
          Sair
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
