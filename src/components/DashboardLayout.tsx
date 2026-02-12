import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { PanelLeft } from "lucide-react";

function FloatingToggle() {
  const { open, toggleSidebar } = useSidebar();
  return (
    <button
      onClick={toggleSidebar}
      className={`fixed top-5 z-50 flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-[hsl(260_40%_15%/0.9)] text-white/50 shadow-lg backdrop-blur-sm transition-all hover:bg-[hsl(260_40%_18%)] hover:text-white hover:shadow-xl ${
        open ? "left-[15rem]" : "left-3"
      }`}
    >
      <PanelLeft className="h-3.5 w-3.5" />
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
