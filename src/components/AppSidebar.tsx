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
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
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
    <div className="flex items-center gap-3 px-1">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
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

export function AppSidebar() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [projectsOpen, setProjectsOpen] = useState(() => {
    return ["/tarefas", "/analiticas"].some((p) => location.pathname.startsWith(p));
  });

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isProjectsActive = ["/tarefas", "/analiticas"].some((p) =>
    location.pathname.startsWith(p)
  );

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex items-center justify-center px-4 py-5">
        <img
          src="/resouce/ISP-Consulte-v3-branco.png"
          alt="ISP Consulte"
          className="h-9 w-auto object-contain"
        />
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Página Inicial */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/"
                    end
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    activeClassName="bg-primary/15 text-primary font-medium"
                  >
                    <Home className="h-4 w-4" />
                    <span>Página Inicial</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Projetos (with submenu) */}
              <SidebarMenuItem>
                <button
                  onClick={() => setProjectsOpen((o) => !o)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isProjectsActive
                      ? "bg-primary/15 text-primary font-medium"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <FolderKanban className="h-4 w-4" />
                  <span className="flex-1 text-left">Projetos</span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${
                      projectsOpen ? "rotate-0" : "-rotate-90"
                    }`}
                  />
                </button>
              </SidebarMenuItem>

              {(projectsOpen || isProjectsActive) && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to="/tarefas"
                        className="flex items-center gap-3 rounded-lg py-2 pl-10 pr-3 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        activeClassName="bg-primary/10 text-primary font-medium"
                      >
                        <ListTodo className="h-4 w-4" />
                        <span>Tarefas</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to="/analiticas"
                        className="flex items-center gap-3 rounded-lg py-2 pl-10 pr-3 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        activeClassName="bg-primary/10 text-primary font-medium"
                      >
                        <BarChart3 className="h-4 w-4" />
                        <span>Analíticas</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}

              {/* Usuários */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/usuarios"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    activeClassName="bg-primary/15 text-primary font-medium"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Usuários</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Comodato */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/comodato"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    activeClassName="bg-primary/15 text-primary font-medium"
                  >
                    <Package className="h-4 w-4" />
                    <span>Comodato</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4 space-y-3">
        <UserAvatar name={session?.name} email={session?.email} />
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
