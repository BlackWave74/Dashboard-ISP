import { useMemo } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth, type AccessArea } from "@/modules/auth/hooks/useAuth";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { motion, AnimatePresence } from "framer-motion";
import { useTasks } from "@/modules/tasks/api/useTasks";
import SyncIndicator from "@/components/SyncIndicator";
import { useNotifications } from "@/hooks/useNotifications";
import NotificationBell from "@/components/NotificationBell";
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

  const { tasks, loading } = useTasks({
    accessToken: session?.accessToken,
    period: "30d",
  });

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

  // marginLeft drives the main content offset — avoids the flex+fixed+overflow-hidden
  // containing-block trap that breaks position:fixed on some browsers/builds.
  const marginLeft = isMobile
    ? "0px"
    : sidebarState === "collapsed"
    ? SIDEBAR_WIDTH_ICON
    : SIDEBAR_WIDTH;

  return (
    <div style={{ minHeight: "100vh", background: "hsl(222 47% 5%)" }}>
      <SyncIndicator syncing={loading} />

      {/* Fixed visual sidebar panel */}
      <AppSidebar
        notificationBell={
          <NotificationBell
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAsRead={markAsRead}
            onMarkAllAsRead={markAllAsRead}
          />
        }
      />

      {/*
       * margin-left approach: pushes main content away from the fixed sidebar
       * without using a flex spacer div. This avoids the containing-block issue
       * caused by overflow-x:hidden on html/body in index.css.
       */}
      <main
        style={{
          marginLeft,
          minHeight: "100vh",
          transition: "margin-left 200ms linear",
          overflowX: "hidden",
        }}
      >
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

