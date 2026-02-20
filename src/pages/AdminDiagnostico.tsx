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
  Shield,
} from "lucide-react";
import {
  parseDateValue,
  formatDatePtBR,
  normalizeTaskTitle,
} from "@/modules/tasks/utils";

const INTERNAL_PROJECT_ALIASES = ["sp", "isp", "interno", "internal"];
const ORPHAN_PAGE_SIZE = 12;

export default function AdminDiagnostico() {
  const { session } = useAuth();
  const isAdmin =
    session?.role === "admin" ||
    session?.role === "gerente" ||
    session?.role === "coordenador";

  const { tasks, loading, reload } = useTasks({
    accessToken: session?.accessToken,
    period: "all",
  });

  const [page, setPage] = useState(1);

  const orphanTasks = useMemo(() => {
    return tasks
      .map((task) => {
        const rawProjectId = String(
          task["project_id"] ?? task["projectId"] ?? ""
        ).trim();
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
          title: normalizeTaskTitle(
            String(task["title"] ?? task["nome"] ?? "Sem título")
          ),
          consultant: String(
            task["responsible_name"] ?? task["consultant"] ?? "—"
          ),
          deadline: parseDateValue(
            task["deadline"] ?? task["due_date"] ?? task["dueDate"]
          ),
          projectRaw:
            effectiveName || (rawProjectId ? `#${rawProjectId}` : "—"),
          reason: hasNoProject
            ? "Sem projeto vinculado"
            : `Projeto interno: "${effectiveName}"`,
        };
      })
      .filter(Boolean) as {
      task_id: string;
      title: string;
      consultant: string;
      deadline: Date | null;
      projectRaw: string;
      reason: string;
    }[];
  }, [tasks]);

  const totalPages = Math.max(1, Math.ceil(orphanTasks.length / ORPHAN_PAGE_SIZE));
  const paginated = useMemo(() => {
    const start = (page - 1) * ORPHAN_PAGE_SIZE;
    return orphanTasks.slice(start, start + ORPHAN_PAGE_SIZE);
  }, [orphanTasks, page]);

  // Guard after all hooks
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen relative">
      {/* Background */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "linear-gradient(180deg, hsl(222 47% 6%) 0%, hsl(234 45% 7%) 50%, hsl(222 40% 5%) 100%)",
        }}
      />

      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Shield className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">
                Diagnóstico de Tarefas
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Visível apenas para administradores, gerentes e coordenadores
              </p>
            </div>
            <button
              type="button"
              onClick={() => reload()}
              disabled={loading}
              className="ml-auto flex items-center gap-1.5 rounded-xl border border-border/20 bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition hover:border-amber-500/30 hover:text-amber-400 disabled:opacity-40"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Carregando…" : "Atualizar"}
            </button>
          </div>
        </motion.div>

        {/* Banner explicativo */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-5 py-4"
        >
          <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
          <div className="text-xs text-amber-300/80 leading-relaxed">
            <strong className="text-amber-400">O que são tarefas órfãs?</strong>{" "}
            São tarefas cujo{" "}
            <code className="bg-amber-500/10 rounded px-1">project_id</code> no
            IXC aponta para um projeto sem nome definido (nulo/vazio) ou para um
            projeto interno genérico como{" "}
            <code className="bg-amber-500/10 rounded px-1">SP</code>. Isso
            acontece quando tarefas são criadas no IXC sem vincular a um contrato
            de projeto real.{" "}
            <strong className="text-amber-400">Recomendação:</strong> revise no
            IXC e vincule cada tarefa ao projeto correto.
          </div>
        </motion.div>

        {/* Counter */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-4 flex items-center gap-3"
        >
          <span className="text-sm font-semibold text-muted-foreground">
            Tarefas sem vínculo de projeto
          </span>
          <span className="rounded-full bg-amber-500/15 border border-amber-500/25 px-2.5 py-0.5 text-xs font-bold text-amber-400">
            {loading ? "…" : orphanTasks.length}
          </span>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="rounded-2xl border border-border/20 bg-card overflow-hidden"
        >
          <div className="grid grid-cols-[1fr_180px_120px_160px] text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border/20 px-5 py-3 bg-muted/10">
            <span>Tarefa</span>
            <span>Responsável</span>
            <span>Prazo</span>
            <span>Motivo</span>
          </div>

          {loading && tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="h-6 w-6 rounded-full border-2 border-border/20 border-t-amber-400"
              />
              <p className="text-xs text-muted-foreground">Carregando tarefas…</p>
            </div>
          ) : orphanTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <Unlink className="h-5 w-5 text-emerald-400" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                Nenhuma tarefa órfã encontrada
              </p>
              <p className="text-xs text-muted-foreground/50">
                Todos os projetos estão devidamente vinculados.
              </p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key={page}>
                {paginated.map((ot, idx) => (
                  <motion.div
                    key={ot.task_id || idx}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.04 * idx }}
                    className="grid grid-cols-[1fr_180px_120px_160px] items-center border-b border-border/10 last:border-0 px-5 py-3 hover:bg-muted/5 transition"
                  >
                    <div className="min-w-0 pr-4">
                      <p className="text-sm font-medium text-foreground/80 truncate">
                        {ot.title}
                      </p>
                      {ot.projectRaw !== "—" && (
                        <p className="text-[10px] text-amber-500/50 mt-0.5 truncate">
                          proj: {ot.projectRaw}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {ot.consultant}
                    </p>
                    <p
                      className={`text-xs font-medium ${
                        !ot.deadline
                          ? "text-muted-foreground/50"
                          : ot.deadline < new Date()
                          ? "text-destructive"
                          : "text-foreground/60"
                      }`}
                    >
                      {ot.deadline ? formatDatePtBR(ot.deadline) : "Sem prazo"}
                    </p>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-[10px] font-semibold text-amber-400 truncate">
                      <Unlink className="h-2.5 w-2.5 shrink-0" />
                      {ot.reason}
                    </span>
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          )}
        </motion.div>

        {/* Pagination */}
        {orphanTasks.length > ORPHAN_PAGE_SIZE && (
          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {Math.min((page - 1) * ORPHAN_PAGE_SIZE + 1, orphanTasks.length)}–
              {Math.min(page * ORPHAN_PAGE_SIZE, orphanTasks.length)} de{" "}
              {orphanTasks.length}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-border/20 p-1.5 hover:border-amber-500/30 hover:text-amber-400 disabled:opacity-30 transition"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="px-2">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-border/20 p-1.5 hover:border-amber-500/30 hover:text-amber-400 disabled:opacity-30 transition"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
