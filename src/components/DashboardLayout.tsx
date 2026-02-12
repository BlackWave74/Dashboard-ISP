import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { PanelLeft } from "lucide-react";

function FloatingToggle() {
  const { open, toggleSidebar } = useSidebar();
  if (open) return null;
  return (
    <button
      onClick={toggleSidebar}
      className="fixed left-4 top-4 z-50 flex h-9 w-9 items-center justify-center rounded-xl border border-border/50 bg-card/80 text-muted-foreground shadow-lg backdrop-blur-sm transition-all hover:bg-card hover:text-foreground hover:shadow-xl"
    >
      <PanelLeft className="h-4 w-4" />
    </button>
  );
}

export default function DashboardLayout() {
  const { isAuthenticated, loadingSession } = useAuth();

  if (loadingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <FloatingToggle />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  );
}
