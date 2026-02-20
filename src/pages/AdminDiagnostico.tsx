import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { useTasks } from "@/modules/tasks/api/useTasks";
import { Navigate } from "react-router-dom";
import {
  Unlink,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
  CheckCircle2,
  Bug,
} from "lucide-react";
import {
  parseDateValue,
  formatDatePtBR,
  normalizeTaskTitle,
} from "@/modules/tasks/utils";

const INTERNAL_PROJECT_ALIASES = ["sp", "isp", "interno", "internal"];
const ORPHAN_PAGE_SIZE = 12;

export default function AdminDiagnostico() {
  const { session, loadingSession } = useAuth();
  const isAdmin =
    session?.role === "admin" ||
    session?.role === "gerente" ||
    session?.role === "coordenador";

  const { tasks, loading, reload } = useTasks({
    accessToken: session?.accessToken ?? null,
    period: "30d",
  });

  const [page, setPage] = useState(1);

  const orphanTasks = useMemo(() => {
    if (!tasks.length) return [];
    return tasks
      .map((task) => {
        const rawProjectId = String(task["project_id"] ?? task["projectId"] ?? "").trim();
        const projectFromJoin =
          task.projects && typeof task.projects === "object"
            ? String((task.projects as Record<string, unknown>)?.["name"] ?? "").trim()
            : "";
        const projectName = (
          (task["project_name"] ?? task["project"] ?? task["group_name"] ?? "").toString()
        ).trim();
        const effectiveName = projectFromJoin || projectName;
        const projectNorm = effectiveName
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        const hasNoProject = !effectiveName;
        const isInternalProject = INTERNAL_PROJECT_ALIASES.some(
          (alias) => projectNorm === alias || projectNorm === alias + " consulte"
        );
        if (!hasNoProject && !isInternalProject) return null;
        return {
          task_id: String(task["task_id"] ?? task["id"] ?? ""),
          title: normalizeTaskTitle(String(task["title"] ?? task["nome"] ?? "Sem título")),
          consultant: String(task["responsible_name"] ?? task["consultant"] ?? "—"),
          deadline: parseDateValue(task["deadline"] ?? task["due_date"] ?? task["dueDate"]),
          projectRaw: effectiveName || (rawProjectId ? `#${rawProjectId}` : "—"),
          reason: hasNoProject ? "Sem projeto vinculado" : `Projeto interno: "${effectiveName}"`,
          isInternal: isInternalProject,
        };
      })
      .filter(Boolean) as {
        task_id: string;
        title: string;
        consultant: string;
        deadline: Date | null;
        projectRaw: string;
        reason: string;
        isInternal: boolean;
      }[];
  }, [tasks]);

  const totalPages = Math.max(1, Math.ceil(orphanTasks.length / ORPHAN_PAGE_SIZE));
  const paginated = useMemo(() => {
    const start = (page - 1) * ORPHAN_PAGE_SIZE;
    return orphanTasks.slice(start, start + ORPHAN_PAGE_SIZE);
  }, [orphanTasks, page]);

  // Guard — aguarda sessão antes de redirecionar
  if (loadingSession) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen" style={{ background: "hsl(222 47% 5%)" }}>
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[700px] rounded-full blur-[120px]"
          style={{ background: "hsl(38 92% 50% / 0.04)" }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-8 flex flex-wrap items-start justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
              style={{
                background: "linear-gradient(135deg, hsl(38 92% 50% / 0.2), hsl(38 92% 50% / 0.06))",
                boxShadow: "0 0 0 1px hsl(38 92% 50% / 0.25), 0 8px 24px hsl(38 92% 50% / 0.1)",
              }}
            >
              <Bug className="h-5 w-5" style={{ color: "hsl(38 92% 60%)" }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: "hsl(210 40% 96%)" }}>
                Diagnóstico de Tarefas
              </h1>
              <p className="mt-0.5 text-sm" style={{ color: "hsl(215 20% 50%)" }}>
                Tarefas sem projeto vinculado · últimos 30 dias · somente administradores
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => reload()}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all hover:opacity-80 disabled:opacity-40"
            style={{
              background: "hsl(222 40% 11%)",
              boxShadow: "0 0 0 1px hsl(222 25% 16%)",
              color: "hsl(215 20% 60%)",
            }}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Carregando…" : "Atualizar"}
          </button>
        </motion.div>

        {/* ── Alert banner ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-6 flex items-start gap-3.5 rounded-2xl px-5 py-4"
          style={{
            background: "linear-gradient(135deg, hsl(38 92% 50% / 0.08), hsl(38 92% 50% / 0.03))",
            boxShadow: "0 0 0 1px hsl(38 92% 50% / 0.18)",
          }}
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "hsl(38 92% 60%)" }} />
          <div className="text-xs leading-relaxed" style={{ color: "hsl(38 80% 70% / 0.75)" }}>
            <strong style={{ color: "hsl(38 92% 62%)" }}>O que são tarefas órfãs?</strong>{" "}
            Tarefas cujo{" "}
            <code
              className="rounded px-1.5 py-0.5 font-mono text-[10px]"
              style={{ background: "hsl(38 92% 50% / 0.12)", color: "hsl(38 92% 62%)" }}
            >
              project_id
            </code>{" "}
            no IXC aponta para projeto sem nome ou alias interno como{" "}
            <code
              className="rounded px-1.5 py-0.5 font-mono text-[10px]"
              style={{ background: "hsl(38 92% 50% / 0.12)", color: "hsl(38 92% 62%)" }}
            >
              SP
            </code>
            .{" "}
            <strong style={{ color: "hsl(38 92% 62%)" }}>Ação:</strong> vincule cada tarefa ao
            projeto correto diretamente no IXC.
          </div>
        </motion.div>

        {/* ── Stats row ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.18 }}
          className="mb-5 flex items-center gap-3"
        >
          <span className="text-sm font-medium" style={{ color: "hsl(215 20% 55%)" }}>
            Tarefas sem vínculo
          </span>
          {loading ? (
            <span
              className="animate-pulse rounded-full px-3 py-1 text-xs font-bold"
              style={{ background: "hsl(222 30% 14%)", color: "hsl(215 20% 45%)" }}
            >
              …
            </span>
          ) : orphanTasks.length === 0 ? (
            <span
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
              style={{
                background: "hsl(160 60% 40% / 0.15)",
                boxShadow: "0 0 0 1px hsl(160 60% 40% / 0.25)",
                color: "hsl(160 60% 60%)",
              }}
            >
              <CheckCircle2 className="h-3 w-3" /> Nenhuma encontrada
            </span>
          ) : (
            <span
              className="rounded-full px-3 py-1 text-xs font-bold"
              style={{
                background: "hsl(38 92% 50% / 0.15)",
                boxShadow: "0 0 0 1px hsl(38 92% 50% / 0.25)",
                color: "hsl(38 92% 62%)",
              }}
            >
              {orphanTasks.length}
            </span>
          )}
        </motion.div>

        {/* ── Table card ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.22 }}
          className="overflow-hidden rounded-2xl"
          style={{
            background: "hsl(222 40% 8%)",
            boxShadow: "0 0 0 1px hsl(222 25% 13%), 0 20px 40px hsl(222 47% 3% / 0.5)",
          }}
        >
          {/* Table header */}
          <div
            className="grid grid-cols-[1fr_160px_110px_180px] gap-2 px-5 py-3.5"
            style={{
              background: "hsl(222 40% 10%)",
              borderBottom: "1px solid hsl(222 25% 12%)",
            }}
          >
            {["Tarefa", "Responsável", "Prazo", "Motivo"].map((col) => (
              <span
                key={col}
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: "hsl(215 20% 40%)" }}
              >
                {col}
              </span>
            ))}
          </div>

          {/* Table body */}
          {loading && tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
                className="h-7 w-7 rounded-full"
                style={{ boxShadow: "0 0 0 2px hsl(38 92% 50% / 0.2), inset 0 0 0 2px hsl(38 92% 50% / 0.6)" }}
              />
              <p className="text-sm" style={{ color: "hsl(215 20% 45%)" }}>
                Carregando tarefas…
              </p>
            </div>
          ) : orphanTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{
                  background: "hsl(160 60% 40% / 0.1)",
                  boxShadow: "0 0 0 1px hsl(160 60% 40% / 0.2)",
                }}
              >
                <CheckCircle2 className="h-6 w-6" style={{ color: "hsl(160 60% 55%)" }} />
              </div>
              <p className="text-sm font-semibold" style={{ color: "hsl(210 40% 75%)" }}>
                {tasks.length > 0
                  ? "Nenhuma tarefa órfã nos últimos 30 dias"
                  : "Aguardando dados…"}
              </p>
              <p className="text-xs" style={{ color: "hsl(215 20% 40%)" }}>
                {tasks.length > 0
                  ? "Todos os projetos estão devidamente vinculados."
                  : "Clique em Atualizar para carregar."}
              </p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key={page}>
                {paginated.map((ot, idx) => (
                  <motion.div
                    key={ot.task_id || idx}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.03 * idx }}
                    className="grid grid-cols-[1fr_160px_110px_180px] items-center gap-2 px-5 py-3.5 transition-colors"
                    style={{
                      borderBottom: "1px solid hsl(222 25% 11%)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "hsl(222 40% 10%)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {/* Task name */}
                    <div className="min-w-0 pr-2">
                      <p className="truncate text-sm font-medium" style={{ color: "hsl(210 40% 85%)" }}>
                        {ot.title}
                      </p>
                      {ot.projectRaw !== "—" && (
                        <p className="mt-0.5 truncate text-[10px]" style={{ color: "hsl(38 70% 50% / 0.5)" }}>
                          {ot.projectRaw}
                        </p>
                      )}
                    </div>

                    {/* Consultant */}
                    <p className="truncate text-xs" style={{ color: "hsl(215 20% 55%)" }}>
                      {ot.consultant}
                    </p>

                    {/* Deadline */}
                    <p
                      className="text-xs font-medium"
                      style={{
                        color: !ot.deadline
                          ? "hsl(215 20% 38%)"
                          : ot.deadline < new Date()
                          ? "hsl(0 70% 60%)"
                          : "hsl(215 20% 60%)",
                      }}
                    >
                      {ot.deadline ? formatDatePtBR(ot.deadline) : "—"}
                    </p>

                    {/* Reason badge */}
                    <span
                      className="flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold"
                      style={{
                        background: "hsl(38 92% 50% / 0.1)",
                        boxShadow: "0 0 0 1px hsl(38 92% 50% / 0.2)",
                        color: "hsl(38 92% 60%)",
                      }}
                    >
                      <Unlink className="h-2.5 w-2.5 shrink-0" />
                      {ot.reason}
                    </span>
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          )}
        </motion.div>

        {/* ── Pagination ── */}
        {orphanTasks.length > ORPHAN_PAGE_SIZE && (
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs" style={{ color: "hsl(215 20% 45%)" }}>
              {Math.min((page - 1) * ORPHAN_PAGE_SIZE + 1, orphanTasks.length)}–
              {Math.min(page * ORPHAN_PAGE_SIZE, orphanTasks.length)} de {orphanTasks.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg transition-all hover:opacity-80 disabled:opacity-30"
                style={{
                  background: "hsl(222 40% 11%)",
                  boxShadow: "0 0 0 1px hsl(222 25% 15%)",
                  color: "hsl(215 20% 60%)",
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[60px] text-center text-xs font-medium" style={{ color: "hsl(215 20% 55%)" }}>
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg transition-all hover:opacity-80 disabled:opacity-30"
                style={{
                  background: "hsl(222 40% 11%)",
                  boxShadow: "0 0 0 1px hsl(222 25% 15%)",
                  color: "hsl(215 20% 60%)",
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
