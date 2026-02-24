import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, FileDown, CheckCircle2, AlertTriangle, Clock, Users, Calendar, BarChart2,
  ShieldAlert, FileWarning, Filter, ChevronRight,
} from "lucide-react";

export type PDFExportSelection = {
  includeDone: boolean;
  includePending: boolean;
  includeOverdue: boolean;
  includeResponsible: boolean;
  includeDeadline: boolean;
  includeDuration: boolean;
};

/** Informações de integridade por tarefa — passadas pelo componente pai */
export type TaskIntegrityInfo = {
  title: string;
  project: string;
  consultant: string;
  deadlineLabel: string;
  durationLabel: string;
  statusKey: string;
};

type IncompleteAction = "include" | "exclude" | "only-incomplete";

type Props = {
  onClose: () => void;
  onExport: (selection: PDFExportSelection, incompleteAction?: IncompleteAction) => Promise<void>;
  title?: string;
  /** Dados de integridade para verificação pré-PDF */
  taskIntegrityData?: TaskIntegrityInfo[];
};

type Option = {
  key: keyof PDFExportSelection;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  borderColor: string;
};

const OPTIONS: Option[] = [
  {
    key: "includeDone",
    label: "Tarefas Concluídas",
    description: "Inclui tarefas com status concluído",
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: "text-emerald-400",
    borderColor: "border-emerald-500/25 bg-emerald-500/[0.07]",
  },
  {
    key: "includePending",
    label: "Tarefas em Andamento",
    description: "Inclui tarefas que ainda estão em progresso",
    icon: <BarChart2 className="h-4 w-4" />,
    color: "text-[hsl(262_83%_68%)]",
    borderColor: "border-[hsl(262_83%_58%/0.25)] bg-[hsl(262_83%_58%/0.07)]",
  },
  {
    key: "includeOverdue",
    label: "Tarefas Atrasadas",
    description: "Inclui tarefas que passaram do prazo",
    icon: <AlertTriangle className="h-4 w-4" />,
    color: "text-red-400",
    borderColor: "border-red-500/25 bg-red-500/[0.07]",
  },
  {
    key: "includeResponsible",
    label: "Coluna Responsável",
    description: "Exibe o nome do consultor responsável",
    icon: <Users className="h-4 w-4" />,
    color: "text-amber-400",
    borderColor: "border-amber-500/25 bg-amber-500/[0.07]",
  },
  {
    key: "includeDeadline",
    label: "Coluna Prazo",
    description: "Exibe a data limite de cada tarefa",
    icon: <Calendar className="h-4 w-4" />,
    color: "text-blue-400",
    borderColor: "border-blue-500/25 bg-blue-500/[0.07]",
  },
  {
    key: "includeDuration",
    label: "Coluna Duração",
    description: "Exibe o tempo registrado em cada tarefa",
    icon: <Clock className="h-4 w-4" />,
    color: "text-white/60",
    borderColor: "border-white/[0.08] bg-white/[0.04]",
  },
];

/* ────── Helpers ────── */

const EMPTY_MARKERS = ["sem título", "sem projeto", "sem consultor", "sem prazo", "sem registro", "sem status", "tarefa sem título", "projeto indefinido", ""];

function isFieldEmpty(value: string): boolean {
  return EMPTY_MARKERS.includes(value.trim().toLowerCase()) || value.trim() === "" || value.trim() === "—";
}

function analyzeIntegrity(
  data: TaskIntegrityInfo[],
  selection: PDFExportSelection
): { noTitle: number; noProject: number; noDuration: number; noDeadline: number; noConsultant: number; total: number; incompleteCount: number } {
  let noTitle = 0, noProject = 0, noDuration = 0, noDeadline = 0, noConsultant = 0;
  const incompleteIds = new Set<number>();

  data.forEach((t, idx) => {
    let incomplete = false;
    if (isFieldEmpty(t.title)) { noTitle++; incomplete = true; }
    if (isFieldEmpty(t.project)) { noProject++; incomplete = true; }
    if (selection.includeDuration && isFieldEmpty(t.durationLabel)) { noDuration++; incomplete = true; }
    if (selection.includeDeadline && isFieldEmpty(t.deadlineLabel)) { noDeadline++; incomplete = true; }
    if (selection.includeResponsible && isFieldEmpty(t.consultant)) { noConsultant++; incomplete = true; }
    if (incomplete) incompleteIds.add(idx);
  });

  return { noTitle, noProject, noDuration, noDeadline, noConsultant, total: data.length, incompleteCount: incompleteIds.size };
}

/* ────── Component ────── */

export default function ExportPDFModal({ onClose, onExport, title = "Exportar PDF", taskIntegrityData = [] }: Props) {
  const [selection, setSelection] = useState<PDFExportSelection>({
    includeDone: true,
    includePending: true,
    includeOverdue: true,
    includeResponsible: true,
    includeDeadline: true,
    includeDuration: false,
  });
  const [exporting, setExporting] = useState(false);
  const [step, setStep] = useState<"options" | "verification">("options");

  const toggle = (key: keyof PDFExportSelection) =>
    setSelection((prev) => ({ ...prev, [key]: !prev[key] }));

  const integrity = useMemo(
    () => analyzeIntegrity(taskIntegrityData, selection),
    [taskIntegrityData, selection]
  );

  const hasIncomplete = integrity.incompleteCount > 0;

  const handleNext = () => {
    if (hasIncomplete) {
      setStep("verification");
    } else {
      handleExport("include");
    }
  };

  const handleExport = async (action: IncompleteAction) => {
    setExporting(true);
    await onExport(selection, action);
    setExporting(false);
    onClose();
  };

  const anyStatusSelected = selection.includeDone || selection.includePending || selection.includeOverdue;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 16 }}
          transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md overflow-hidden rounded-2xl border border-white/[0.08] shadow-2xl"
          style={{
            background: "linear-gradient(145deg, hsl(270 50% 13%), hsl(234 45% 8%))",
            boxShadow: "0 32px 64px -16px hsl(262 83% 20% / 0.55), 0 0 0 1px hsl(262 83% 58% / 0.08)",
          }}
        >
          {/* Top accent */}
          <div className="h-[2px] w-full bg-gradient-to-r from-emerald-500 via-[hsl(262_83%_58%)] to-transparent opacity-60" />

          <AnimatePresence mode="wait">
            {step === "options" ? (
              <OptionsStep
                key="options"
                title={title}
                selection={selection}
                toggle={toggle}
                anyStatusSelected={anyStatusSelected}
                hasIncomplete={hasIncomplete}
                incompleteCount={integrity.incompleteCount}
                totalCount={integrity.total}
                durationSelected={selection.includeDuration}
                exporting={exporting}
                onClose={onClose}
                onNext={handleNext}
              />
            ) : (
              <VerificationStep
                key="verification"
                integrity={integrity}
                durationSelected={selection.includeDuration}
                exporting={exporting}
                onBack={() => setStep("options")}
                onExport={handleExport}
              />
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ────── Options Step (original) ────── */

function OptionsStep({
  title, selection, toggle, anyStatusSelected, hasIncomplete, incompleteCount, totalCount,
  durationSelected, exporting, onClose, onNext,
}: {
  title: string;
  selection: PDFExportSelection;
  toggle: (key: keyof PDFExportSelection) => void;
  anyStatusSelected: boolean;
  hasIncomplete: boolean;
  incompleteCount: number;
  totalCount: number;
  durationSelected: boolean;
  exporting: boolean;
  onClose: () => void;
  onNext: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/[0.12] border border-emerald-500/20">
            <FileDown className="h-4.5 w-4.5 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white/90">{title}</p>
            <p className="text-[11px] text-white/40">Selecione o que incluir no relatório</p>
          </div>
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 text-white/25 transition hover:bg-white/[0.05] hover:text-white/60">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Options */}
      <div className="px-6 pb-2 space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-3">Conteúdo do relatório</p>
        {OPTIONS.map((opt) => {
          const active = selection[opt.key];
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => toggle(opt.key)}
              className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                active ? opt.borderColor : "border-white/[0.05] bg-white/[0.02] opacity-50"
              }`}
            >
              <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all ${
                active ? "border-transparent bg-gradient-to-br from-[hsl(262_83%_58%)] to-[hsl(234_89%_64%)]" : "border-white/20 bg-white/[0.03]"
              }`}>
                {active && <span className="h-1.5 w-1.5 rounded-sm bg-white" />}
              </span>
              <span className={`shrink-0 ${active ? opt.color : "text-white/25"}`}>{opt.icon}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold transition-colors ${active ? "text-white/85" : "text-white/35"}`}>{opt.label}</p>
                <p className="text-[10px] text-white/30 mt-0.5">{opt.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Duration info */}
      {!durationSelected && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-6 mt-2 flex items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/[0.06] px-4 py-2.5 text-[11px] text-blue-300/80">
          <Clock className="h-3.5 w-3.5 shrink-0 text-blue-400" />
          A coluna de duração não será incluída no PDF. Ative-a acima se necessário.
        </motion.div>
      )}

      {/* Incomplete data preview */}
      {hasIncomplete && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mx-6 mt-2 flex items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.08] px-4 py-2.5 text-[11px] text-amber-300/80">
          <FileWarning className="h-3.5 w-3.5 shrink-0 text-amber-400" />
          <span>{incompleteCount} de {totalCount} tarefas possuem dados incompletos. Você poderá revisar na próxima etapa.</span>
        </motion.div>
      )}

      {/* No status warning */}
      {!anyStatusSelected && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mx-6 mt-2 flex items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.08] px-4 py-2.5 text-xs text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Selecione ao menos um tipo de tarefa para exportar.
        </motion.div>
      )}

      {/* Actions */}
      <div className="flex gap-2.5 px-6 py-4">
        <button onClick={onClose} className="flex-1 rounded-xl border border-white/[0.07] py-2.5 text-xs font-semibold text-white/35 transition hover:border-white/[0.12] hover:text-white/60">
          Cancelar
        </button>
        <button
          onClick={onNext}
          disabled={exporting || !anyStatusSelected}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-[hsl(262_83%_58%)] py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:opacity-90 disabled:opacity-40"
        >
          {hasIncomplete ? (
            <>
              Revisar Dados
              <ChevronRight className="h-3.5 w-3.5" />
            </>
          ) : exporting ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <>
              <FileDown className="h-3.5 w-3.5" />
              Gerar PDF
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}

/* ────── Verification Step ────── */

function VerificationStep({
  integrity, durationSelected, exporting, onBack, onExport,
}: {
  integrity: ReturnType<typeof analyzeIntegrity>;
  durationSelected: boolean;
  exporting: boolean;
  onBack: () => void;
  onExport: (action: IncompleteAction) => void;
}) {
  const issues: { label: string; count: number; icon: React.ReactNode }[] = [];
  if (integrity.noTitle > 0) issues.push({ label: "tarefas sem título", count: integrity.noTitle, icon: <FileWarning className="h-3.5 w-3.5" /> });
  if (integrity.noProject > 0) issues.push({ label: "tarefas sem projeto", count: integrity.noProject, icon: <FileWarning className="h-3.5 w-3.5" /> });
  if (integrity.noConsultant > 0) issues.push({ label: "tarefas sem responsável", count: integrity.noConsultant, icon: <Users className="h-3.5 w-3.5" /> });
  if (integrity.noDeadline > 0) issues.push({ label: "tarefas sem prazo", count: integrity.noDeadline, icon: <Calendar className="h-3.5 w-3.5" /> });
  if (integrity.noDuration > 0) issues.push({ label: "tarefas sem duração registrada", count: integrity.noDuration, icon: <Clock className="h-3.5 w-3.5" /> });

  const completeCount = integrity.total - integrity.incompleteCount;

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.18 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/[0.12] border border-amber-500/20">
            <ShieldAlert className="h-4.5 w-4.5 text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white/90">Verificação de Dados</p>
            <p className="text-[11px] text-white/40">Revise antes de gerar o relatório</p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="px-6 pb-3">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4">
          <div className="flex items-start gap-3 mb-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-300">
                {integrity.incompleteCount} {integrity.incompleteCount === 1 ? "tarefa possui" : "tarefas possuem"} dados incompletos
              </p>
              <p className="text-[11px] text-white/40 mt-1">
                Relatórios com campos em branco podem parecer incompletos ao cliente. Escolha como deseja proceder.
              </p>
            </div>
          </div>

          {/* Issue list */}
          <div className="space-y-1.5 mt-3">
            {issues.map((issue, idx) => (
              <div key={idx} className="flex items-center gap-2 text-[11px]">
                <span className="text-amber-400/70">{issue.icon}</span>
                <span className="text-white/60">
                  <span className="font-bold text-amber-300">{issue.count}</span> {issue.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Duration note */}
        {durationSelected && integrity.noDuration > 0 && (
          <div className="mt-2 rounded-xl border border-blue-500/15 bg-blue-500/[0.05] px-4 py-2.5 text-[11px] text-blue-300/70 flex items-start gap-2">
            <Clock className="h-3.5 w-3.5 shrink-0 mt-0.5 text-blue-400" />
            <span>
              A coluna de duração aparece vazia quando o registro de horas ainda não foi implementado para essas tarefas. Considere desativar essa coluna se não for relevante.
            </span>
          </div>
        )}

        {/* Stats */}
        <div className="mt-3 flex gap-2">
          <div className="flex-1 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-3 text-center">
            <p className="text-lg font-bold text-emerald-400">{completeCount}</p>
            <p className="text-[10px] text-white/40">Completas</p>
          </div>
          <div className="flex-1 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3 text-center">
            <p className="text-lg font-bold text-amber-400">{integrity.incompleteCount}</p>
            <p className="text-[10px] text-white/40">Incompletas</p>
          </div>
          <div className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 text-center">
            <p className="text-lg font-bold text-white/70">{integrity.total}</p>
            <p className="text-[10px] text-white/40">Total</p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-6 pb-4 space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-2">Como deseja proceder?</p>

        <button
          onClick={() => onExport("exclude")}
          disabled={exporting || completeCount === 0}
          className="flex w-full items-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.08] px-4 py-3 text-left transition hover:bg-emerald-500/[0.14] disabled:opacity-40"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-300">Gerar apenas com tarefas completas</p>
            <p className="text-[10px] text-white/35 mt-0.5">{completeCount} tarefas serão incluídas no relatório</p>
          </div>
          {exporting && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-300/30 border-t-emerald-300" />}
        </button>

        <button
          onClick={() => onExport("include")}
          disabled={exporting}
          className="flex w-full items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-left transition hover:bg-amber-500/[0.12] disabled:opacity-40"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-300">Gerar com todas as tarefas</p>
            <p className="text-[10px] text-white/35 mt-0.5">Inclui as {integrity.incompleteCount} tarefas com dados incompletos</p>
          </div>
        </button>

        <button
          onClick={() => onExport("only-incomplete")}
          disabled={exporting}
          className="flex w-full items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-left transition hover:bg-white/[0.06] disabled:opacity-40"
        >
          <Filter className="h-4 w-4 shrink-0 text-white/50" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white/60">Gerar apenas com tarefas incompletas</p>
            <p className="text-[10px] text-white/35 mt-0.5">Para revisão interna — {integrity.incompleteCount} tarefas</p>
          </div>
        </button>

        <button onClick={onBack} className="w-full rounded-xl border border-white/[0.07] py-2.5 text-xs font-semibold text-white/35 transition hover:border-white/[0.12] hover:text-white/60 mt-1">
          ← Voltar às opções
        </button>
      </div>
    </motion.div>
  );
}
