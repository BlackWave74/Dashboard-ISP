import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FileDown, CheckCircle2, AlertTriangle, Clock, Users, Calendar, BarChart2 } from "lucide-react";

export type PDFExportSelection = {
  includeDone: boolean;
  includePending: boolean;
  includeOverdue: boolean;
  includeResponsible: boolean;
  includeDeadline: boolean;
  includeDuration: boolean;
};

type Props = {
  onClose: () => void;
  onExport: (selection: PDFExportSelection) => Promise<void>;
  title?: string;
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

export default function ExportPDFModal({ onClose, onExport, title = "Exportar PDF" }: Props) {
  const [selection, setSelection] = useState<PDFExportSelection>({
    includeDone: true,
    includePending: true,
    includeOverdue: true,
    includeResponsible: true,
    includeDeadline: true,
    includeDuration: false,
  });
  const [exporting, setExporting] = useState(false);

  const toggle = (key: keyof PDFExportSelection) =>
    setSelection((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleExport = async () => {
    setExporting(true);
    await onExport(selection);
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
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-white/25 transition hover:bg-white/[0.05] hover:text-white/60"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Options */}
          <div className="px-6 pb-2 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-3">
              Conteúdo do relatório
            </p>
            {OPTIONS.map((opt) => {
              const active = selection[opt.key];
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => toggle(opt.key)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                    active
                      ? opt.borderColor
                      : "border-white/[0.05] bg-white/[0.02] opacity-50"
                  }`}
                >
                  {/* Checkbox visual */}
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all ${
                      active
                        ? "border-transparent bg-gradient-to-br from-[hsl(262_83%_58%)] to-[hsl(234_89%_64%)]"
                        : "border-white/20 bg-white/[0.03]"
                    }`}
                  >
                    {active && <span className="h-1.5 w-1.5 rounded-sm bg-white" />}
                  </span>
                  {/* Icon */}
                  <span className={`shrink-0 ${active ? opt.color : "text-white/25"}`}>
                    {opt.icon}
                  </span>
                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold transition-colors ${active ? "text-white/85" : "text-white/35"}`}>
                      {opt.label}
                    </p>
                    <p className="text-[10px] text-white/30 mt-0.5">{opt.description}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Warning if no status selected */}
          {!anyStatusSelected && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-6 mt-2 flex items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.08] px-4 py-2.5 text-xs text-amber-400"
            >
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Selecione ao menos um tipo de tarefa para exportar.
            </motion.div>
          )}

          {/* Actions */}
          <div className="flex gap-2.5 px-6 py-4">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-white/[0.07] py-2.5 text-xs font-semibold text-white/35 transition hover:border-white/[0.12] hover:text-white/60"
            >
              Cancelar
            </button>
            <button
              onClick={handleExport}
              disabled={exporting || !anyStatusSelected}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-[hsl(262_83%_58%)] py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:opacity-90 disabled:opacity-40"
            >
              {exporting ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <FileDown className="h-3.5 w-3.5" />
              )}
              {exporting ? "Gerando PDF..." : "Gerar PDF"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
