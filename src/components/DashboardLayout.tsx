import { useMemo, useEffect, useRef } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth, type AccessArea } from "@/modules/auth/hooks/useAuth";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { motion, AnimatePresence } from "framer-motion";
import { useTasks } from "@/modules/tasks/api/useTasks";
import SyncIndicator from "@/components/SyncIndicator";
import { useTrackPresence } from "@/hooks/useUserPresence";
import { useNotifications } from "@/hooks/useNotifications";
import NotificationBell from "@/components/NotificationBell";
import AssistantReminder from "@/components/AssistantReminder";
import MobileHeader from "@/components/MobileHeader";
import {
  parseDateValue,
  isDeadlineSoon,
  normalizeTaskTitle,
} from "@/modules/tasks/utils";


/** Map route paths to access areas */
const ROUTE_TO_AREA: Record<string, AccessArea> = {
  "/tarefas": "tarefas",
  "/analiticas": "analiticas",
  "/comodato": "comodato",
  "/integracoes": "integracoes",
  "/usuarios": "usuarios",
  "/calendario": "calendario",
  "/gamificacao": "gamificacao",
  "/ferramentas": "ferramentas",
  "/suporte": "suporte",
};

/** Lightweight task normalization for notification purposes only */
function toNotifTask(task: Record<string, any>) {
  const title = normalizeTaskTitle(
    String(task.title ?? task.nome ?? task.name ?? "Tarefa")
  );
  const project = String(
    task.projects?.name ?? task.project_name ?? task.project ?? task.projeto ?? ""
  );
  const consultant = String(
    task.responsible_name ?? task.consultant ?? task.consultor ?? task.responsavel ?? task.responsible ?? ""
  );
  const statusRaw = String(task.status ?? task.situacao ?? "").toLowerCase();
  const deadline =
    parseDateValue(task.due_date) ??
    parseDateValue(task.dueDate) ??
    parseDateValue(task.deadline) ??
    null;

  const isDone = ["5", "done", "concluido", "concluído", "completed", "finalizado"].includes(statusRaw);
  const isOverdue = !isDone && deadline !== null && deadline < new Date();
  const deadlineIsSoon = !isDone && !isOverdue && isDeadlineSoon(deadline, new Date());

  return {
    title,
    project,
    consultant,
    statusKey: isDone ? "done" : isOverdue ? "overdue" : "pending",
    deadlineDate: deadline,
    deadlineIsSoon,
  };
}

/** Normalize a string for flexible comparison */
const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

// Sidebar width constants — must match sidebar.tsx
const SIDEBAR_WIDTH = "15.5rem";
const SIDEBAR_WIDTH_ICON = "3rem";

function DashboardInner() {
  const { session, isAuthenticated, loadingSession, canAccess } = useAuth();
  const location = useLocation();
  const { state: sidebarState, isMobile } = useSidebar();
  const isAdmin =
    session?.role === "admin" ||
    session?.role === "gerente" ||
    session?.role === "coordenador";

  const companyName = session?.company?.trim();
  const accessibleProjectNames = session?.accessibleProjectNames;

  // Track presence for the logged-in user so admins can see who's online
  // We use email as the presence key since it's always available in the session
  useTrackPresence(
    session?.email,
    session?.name,
    session?.email,
  );

  const { tasks, loading, reload } = useTasks({
    accessToken: session?.accessToken,
    period: "30d",
  });

  // Auto-refresh a cada 5 minutos
  const reloadRef = useRef(reload);
  reloadRef.current = reload;
  useEffect(() => {
    const id = setInterval(() => reloadRef.current(), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const accessFilteredTasks = useMemo(() => {
    if (isAdmin) return tasks;

    const hasExplicitNames = accessibleProjectNames && accessibleProjectNames.length > 0;
    const hasCompanyName = !!companyName;

    if (!hasExplicitNames && !hasCompanyName) return [];

    const allowedNames = hasExplicitNames ? accessibleProjectNames!.map(norm) : null;
    const needle = hasCompanyName ? norm(companyName!) : null;

    return tasks.filter((t) => {
      const projectNorm = norm(
        String(t.projects?.name ?? t.project_name ?? t.project ?? t.projeto ?? "")
      );

      if (allowedNames) {
        const match = allowedNames.some(
          (name) =>
            projectNorm === name ||
            projectNorm.includes(name) ||
            name.includes(projectNorm)
        );
        if (match) return true;
      }

      if (needle && projectNorm.includes(needle)) return true;

      return false;
    });
  }, [tasks, isAdmin, accessibleProjectNames, companyName]);

  const notifTasks = useMemo(
    () => accessFilteredTasks.map(toNotifTask),
    [accessFilteredTasks]
  );

  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications(notifTasks, session?.name, session?.role);

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

  const requiredArea = ROUTE_TO_AREA[location.pathname];
  if (requiredArea && !canAccess(requiredArea)) {
    return <Navigate to="/" replace />;
  }

  const sidebarWidth = isMobile
    ? "0px"
    : sidebarState === "collapsed"
    ? SIDEBAR_WIDTH_ICON
    : SIDEBAR_WIDTH;

  const notificationBellEl = (
    <NotificationBell
      notifications={notifications}
      unreadCount={unreadCount}
      onMarkAsRead={markAsRead}
      onMarkAllAsRead={markAllAsRead}
    />
  );

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `${sidebarWidth} 1fr`,
        minHeight: "100vh",
        transition: "grid-template-columns 200ms linear",
        background: "hsl(222 47% 5%)",
        alignItems: "stretch",
      }}
    >
      <SyncIndicator syncing={loading} />

      {/* Sidebar column (hidden on mobile — uses Sheet overlay instead) */}
      {!isMobile && (
        <div
          style={{
            background: "linear-gradient(180deg, hsl(234 50% 12%) 0%, hsl(260 45% 10%) 50%, hsl(234 45% 8%) 100%)",
            boxShadow: "4px 0 30px -4px rgba(0,0,0,0.7)",
            zIndex: 20,
            position: "relative",
            alignSelf: "stretch",
          }}
        >
          <div
            style={{
              position: "sticky",
              top: 0,
              height: "100vh",
              overflowY: "auto",
              overflowX: "hidden",
              scrollbarWidth: "none",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <AppSidebar notificationBell={notificationBellEl} />
          </div>
        </div>
      )}

      {/* Main content column */}
      <main style={{ minWidth: 0, overflowX: "hidden", gridColumn: isMobile ? "1 / -1" : undefined }}>
        {/* Mobile top bar with hamburger */}
        <MobileHeader notificationBell={notificationBellEl} />

        {/* Mobile sidebar (Sheet overlay) — rendered here so it's in the DOM */}
        {isMobile && <AppSidebar notificationBell={notificationBellEl} />}

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Virtual Assistant Reminder */}
      <AssistantReminder notifTasks={notifTasks} />
    </div>
  );
}

export default function DashboardLayout() {
  return (
    <SidebarProvider>
      <DashboardInner />
    </SidebarProvider>
  );
}

