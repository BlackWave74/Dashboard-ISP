import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, Save, AlertCircle } from "lucide-react";
import type { ProjectAnalytics } from "../types";

type Props = {
  project: ProjectAnalytics | null;
  currentHours: number;
  onClose: () => void;
  onSave: (projectId: number, hours: number, notes: string) => Promise<boolean>;
};

export default function ContractedHoursModal({ project, currentHours, onClose, onSave }: Props) {
  const [hours, setHours] = useState(currentHours > 0 ? String(currentHours) : "");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!project) return null;

  const handleSave = async () => {
    const val = parseFloat(hours);
    if (isNaN(val) || val < 0) {
      setError("Informe um número válido de horas.");
      return;
    }
    setSaving(true);
    setError("");
    const ok = await onSave(project.projectId, val, notes);
    setSaving(false);
    if (ok) onClose();
    else setError("Erro ao salvar. Tente novamente.");
  };

  const remaining = project.hoursContracted > 0
    ? project.hoursContracted - project.hoursUsed
    : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.22 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md overflow-hidden rounded-2xl border border-white/[0.08]"
          style={{
            background: "linear-gradient(145deg, hsl(270 50% 12%), hsl(234 45% 8%))",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white/90">Horas Contratadas</p>
                <p className="text-[10px] text-white/35 truncate max-w-[220px]">{project.projectName}</p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-white/30 transition hover:text-white/60">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Current status */}
          <div className="mx-5 mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-white/[0.04] border border-white/[0.04] px-3 py-2.5 text-center">
              <p className="text-lg font-bold text-white/80">{Math.round(project.hoursUsed)}h</p>
              <p className="text-[10px] text-white/30">Utilizadas</p>
            </div>
            <div className="rounded-xl bg-primary/10 border border-primary/20 px-3 py-2.5 text-center">
              <p className="text-lg font-bold text-primary">{currentHours > 0 ? `${currentHours}h` : "—"}</p>
              <p className="text-[10px] text-white/30">Contratadas</p>
            </div>
            <div className="rounded-xl bg-white/[0.04] border border-white/[0.04] px-3 py-2.5 text-center">
              <p className={`text-lg font-bold ${remaining !== null && remaining < 0 ? "text-red-400" : "text-emerald-400"}`}>
                {remaining !== null ? `${Math.round(remaining)}h` : "—"}
              </p>
              <p className="text-[10px] text-white/30">Restantes</p>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-3 p-5">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold text-white/50">
                Total de Horas Contratadas
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 focus-within:border-primary/40">
                <Clock className="h-3.5 w-3.5 text-white/30 shrink-0" />
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  placeholder="Ex: 80"
                  className="w-full bg-transparent text-sm font-bold text-white/90 placeholder-white/20 outline-none"
                  autoFocus
                />
                <span className="text-xs text-white/30 shrink-0">horas</span>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-semibold text-white/50">
                Observações (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Contrato renovado em jan/2025"
                rows={2}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs text-white/80 placeholder-white/20 outline-none focus:border-primary/40 resize-none"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={onClose}
                className="flex-1 rounded-xl border border-white/[0.06] py-2.5 text-xs font-semibold text-white/40 transition hover:text-white/60"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[hsl(234_89%_64%)] py-2.5 text-xs font-bold text-white shadow-lg shadow-primary/20 transition hover:opacity-90 disabled:opacity-50"
              >
                {saving ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
