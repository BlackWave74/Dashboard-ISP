import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { consultarComodato, lancarComodato } from "@/modules/ixc/client";
import type { ComodatoStatus, ComodatoLaunchResult } from "@/modules/ixc/types";
import {
  Package, Search, Send, Loader2, AlertCircle, CheckCircle2,
  X, FileText, Wifi, Box, Hash, DollarSign, Calendar, Info,
  RefreshCw, ClipboardCopy, Check,
} from "lucide-react";

/* ─── Helpers ─── */
const formatJson = (obj: unknown) => {
  try { return JSON.stringify(obj, null, 2); } catch { return String(obj); }
};

export default function ComodatoPage() {
  const navigate = useNavigate();
  const { session, loadingSession, canAccess } = useAuth();
  const [activeTab, setActiveTab] = useState<"consultar" | "lancar">("consultar");

  useEffect(() => {
    if (!loadingSession && !session) { navigate("/login"); return; }
    if (!loadingSession && session && !canAccess("comodato")) { navigate("/"); return; }
  }, [loadingSession, session, canAccess, navigate]);

  if (loadingSession || !session) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--task-purple))]" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] w-full" style={{ background: "linear-gradient(165deg, hsl(270 60% 10%), hsl(234 45% 6%))" }}>
      <div className="mx-auto w-full max-w-[1100px] space-y-5 p-5 md:p-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(262_83%_58%)] to-[hsl(234_89%_64%)] shadow-lg shadow-[hsl(262_83%_58%/0.25)]">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[hsl(var(--task-text))]">Comodato</h1>
              <p className="text-sm text-[hsl(var(--task-text-muted))]">Consulte e lance equipamentos em comodato via IXC.</p>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-2xl bg-[hsl(var(--task-surface))] p-1.5 border border-[hsl(var(--task-border))]">
          {([
            { key: "consultar" as const, label: "Consultar", icon: Search },
            { key: "lancar" as const, label: "Lançar", icon: Send },
          ]).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                activeTab === tab.key
                  ? "bg-[hsl(var(--task-purple)/0.15)] text-[hsl(var(--task-purple))]"
                  : "text-[hsl(var(--task-text-muted))] hover:text-[hsl(var(--task-text))]"
              }`}>
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "consultar" && <ConsultarTab session={session} />}
        {activeTab === "lancar" && <LancarTab session={session} />}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════ */
/* ─── Consultar Tab ─── */
/* ════════════════════════════════════════════ */
function ConsultarTab({ session }: { session: { email: string } }) {
  const [pppoe, setPppoe] = useState("");
  const [serial, setSerial] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ComodatoStatus | null>(null);
  const [error, setError] = useState("");

  const handleConsulta = async () => {
    if (!pppoe.trim()) { setError("Informe o login PPPoE."); return; }
    setError("");
    setResult(null);
    setLoading(true);
    const res = await consultarComodato({ pppoe: pppoe.trim(), serial: serial.trim() || undefined, auditUser: session.email });
    setLoading(false);
    if (res.ok && res.data) {
      setResult(res.data);
    } else {
      setError(res.error || "Falha na consulta.");
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Search form */}
      <div className="task-card p-5 space-y-4">
        <h3 className="text-sm font-bold text-[hsl(var(--task-text))] flex items-center gap-2">
          <Search className="h-4 w-4 text-[hsl(var(--task-purple))]" />
          Consultar Comodato
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-[hsl(var(--task-text-muted))] font-semibold flex items-center gap-1">
              <Wifi className="h-3 w-3" /> Login PPPoE *
            </label>
            <input value={pppoe} onChange={e => setPppoe(e.target.value)} placeholder="cliente@pppoe"
              onKeyDown={e => e.key === "Enter" && handleConsulta()}
              className="h-9 w-full rounded-lg border border-[hsl(var(--task-border))] bg-[hsl(var(--task-bg))] px-3 text-xs text-[hsl(var(--task-text))] outline-none focus:border-[hsl(var(--task-purple)/0.5)] placeholder:text-[hsl(var(--task-text-muted)/0.4)]" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider text-[hsl(var(--task-text-muted))] font-semibold flex items-center gap-1">
              <Hash className="h-3 w-3" /> Nº Série (opcional)
            </label>
            <input value={serial} onChange={e => setSerial(e.target.value)} placeholder="SN do equipamento"
              onKeyDown={e => e.key === "Enter" && handleConsulta()}
              className="h-9 w-full rounded-lg border border-[hsl(var(--task-border))] bg-[hsl(var(--task-bg))] px-3 text-xs text-[hsl(var(--task-text))] outline-none focus:border-[hsl(var(--task-purple)/0.5)] placeholder:text-[hsl(var(--task-text-muted)/0.4)]" />
          </div>
        </div>
        <div className="flex justify-end">
          <button onClick={handleConsulta} disabled={loading}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[hsl(262_83%_58%)] to-[hsl(234_89%_64%)] px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-[hsl(262_83%_58%/0.3)] transition hover:shadow-[hsl(262_83%_58%/0.5)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            Consultar
          </button>
        </div>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError("")} className="text-white/30 hover:text-white/60"><X className="h-3.5 w-3.5" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result */}
      {result && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Messages */}
          {result.messages && result.messages.length > 0 && (
            <div className="task-card p-4 space-y-2">
              <h4 className="text-xs font-semibold text-[hsl(var(--task-text))] flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-[hsl(var(--task-yellow))]" /> Mensagens
              </h4>
              {result.messages.map((msg, i) => (
                <p key={i} className="text-[11px] text-[hsl(var(--task-text-muted))]">• {msg}</p>
              ))}
            </div>
          )}

          {/* Contract info */}
          <div className="task-card p-4 space-y-3">
            <h4 className="text-xs font-semibold text-[hsl(var(--task-text))] flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-[hsl(var(--task-purple))]" /> Contrato #{result.contratoId}
            </h4>
            <JsonBlock data={result.contrato} label="Dados do contrato" />
          </div>

          {/* Comodatos */}
          <div className="task-card p-4 space-y-3">
            <h4 className="text-xs font-semibold text-[hsl(var(--task-text))] flex items-center gap-1.5">
              <Box className="h-3.5 w-3.5 text-emerald-400" /> Equipamentos em Comodato ({result.comodatos.length})
            </h4>
            {result.comodatos.length === 0 && (
              <p className="text-[11px] text-[hsl(var(--task-text-muted))]">Nenhum equipamento em comodato encontrado.</p>
            )}
            {result.comodatos.map((c, i) => (
              <JsonBlock key={i} data={c} label={`Equipamento ${i + 1}`} />
            ))}
          </div>

          {/* Patrimonio */}
          {result.patrimonio && (
            <div className="task-card p-4 space-y-3">
              <h4 className="text-xs font-semibold text-[hsl(var(--task-text))] flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-sky-400" /> Patrimônio
              </h4>
              <JsonBlock data={result.patrimonio} label="Dados do patrimônio" />
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

/* ════════════════════════════════════════════ */
/* ─── Lançar Tab ─── */
/* ════════════════════════════════════════════ */
function LancarTab({ session }: { session: { email: string } }) {
  const [form, setForm] = useState({
    contratoId: "",
    numeroSerie: "",
    numeroPatrimonial: "",
    descricao: "",
    valorUnitario: "0.10",
    mac: "",
    data: new Date().toISOString().slice(0, 10),
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ComodatoLaunchResult | null>(null);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const update = (field: string, value: string) => setForm(p => ({ ...p, [field]: value }));

  const handleLancar = async () => {
    if (!form.contratoId.trim()) { setError("Informe o ID do contrato."); return; }
    if (!form.numeroSerie.trim()) { setError("Informe o número de série."); return; }
    setConfirmOpen(true);
  };

  const confirmLancar = async () => {
    setConfirmOpen(false);
    setError("");
    setResult(null);
    setLoading(true);
    const res = await lancarComodato({
      contratoId: form.contratoId.trim(),
      numeroSerie: form.numeroSerie.trim(),
      numeroPatrimonial: form.numeroPatrimonial.trim() || undefined,
      descricao: form.descricao.trim() || undefined,
      valorUnitario: form.valorUnitario.trim() || undefined,
      mac: form.mac.trim() || undefined,
      data: form.data || undefined,
      auditUser: session.email,
    });
    setLoading(false);
    if (res.ok && res.data) {
      setResult(res.data);
    } else {
      setError(res.error || "Falha ao lançar comodato.");
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="task-card p-5 space-y-4">
        <h3 className="text-sm font-bold text-[hsl(var(--task-text))] flex items-center gap-2">
          <Send className="h-4 w-4 text-[hsl(var(--task-purple))]" />
          Lançar Comodato
        </h3>

        {/* Row 1 */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField icon={FileText} label="ID do Contrato *" value={form.contratoId} onChange={v => update("contratoId", v)} placeholder="Ex: 12345" />
          <FormField icon={Hash} label="Número de Série *" value={form.numeroSerie} onChange={v => update("numeroSerie", v)} placeholder="SN do equipamento" />
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField icon={Box} label="Nº Patrimonial" value={form.numeroPatrimonial} onChange={v => update("numeroPatrimonial", v)} placeholder="Patrimônio (opcional)" />
          <FormField icon={Wifi} label="MAC Address" value={form.mac} onChange={v => update("mac", v)} placeholder="AA:BB:CC:DD:EE:FF" />
        </div>

        {/* Row 3 */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FormField icon={Package} label="Descrição" value={form.descricao} onChange={v => update("descricao", v)} placeholder="Roteador / ONU..." />
          <FormField icon={DollarSign} label="Valor Unitário" value={form.valorUnitario} onChange={v => update("valorUnitario", v)} placeholder="0.10" />
          <FormField icon={Calendar} label="Data" value={form.data} onChange={v => update("data", v)} placeholder="AAAA-MM-DD" type="date" />
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={() => { setForm({ contratoId: "", numeroSerie: "", numeroPatrimonial: "", descricao: "", valorUnitario: "0.10", mac: "", data: new Date().toISOString().slice(0, 10) }); setResult(null); setError(""); }}
            className="rounded-lg border border-[hsl(var(--task-border))] px-4 py-2 text-xs font-medium text-[hsl(var(--task-text-muted))] hover:text-[hsl(var(--task-text))] transition">
            <RefreshCw className="h-3.5 w-3.5 inline mr-1" /> Limpar
          </button>
          <button onClick={handleLancar} disabled={loading}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[hsl(262_83%_58%)] to-[hsl(234_89%_64%)] px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-[hsl(262_83%_58%/0.3)] transition hover:shadow-[hsl(262_83%_58%/0.5)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Lançar
          </button>
        </div>
      </div>

      {/* Confirmation dialog */}
      <AnimatePresence>
        {confirmOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setConfirmOpen(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="task-card p-6 max-w-md w-full space-y-4" onClick={e => e.stopPropagation()}>
              <h3 className="text-sm font-bold text-[hsl(var(--task-text))]">Confirmar Lançamento</h3>
              <p className="text-xs text-[hsl(var(--task-text-muted))]">
                Você está prestes a lançar o comodato para o contrato <strong className="text-[hsl(var(--task-text))]">#{form.contratoId}</strong> com
                série <strong className="text-[hsl(var(--task-text))]">{form.numeroSerie}</strong>. Deseja continuar?
              </p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setConfirmOpen(false)}
                  className="rounded-lg border border-[hsl(var(--task-border))] px-4 py-2 text-xs font-medium text-[hsl(var(--task-text-muted))] hover:text-[hsl(var(--task-text))] transition">
                  Cancelar
                </button>
                <button onClick={confirmLancar}
                  className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[hsl(262_83%_58%)] to-[hsl(234_89%_64%)] px-4 py-2 text-xs font-semibold text-white transition hover:shadow-lg">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Confirmar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError("")} className="text-white/30 hover:text-white/60"><X className="h-3.5 w-3.5" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result */}
      {result && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="task-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <h4 className="text-sm font-bold text-emerald-300">
              {result.status === "already_exists" ? "Comodato já existente" : "Comodato lançado com sucesso!"}
            </h4>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div><span className="text-[hsl(var(--task-text-muted))]">Contrato:</span> <span className="text-[hsl(var(--task-text))] font-medium">#{result.contratoId}</span></div>
            <div><span className="text-[hsl(var(--task-text-muted))]">Série:</span> <span className="text-[hsl(var(--task-text))] font-medium">{result.numeroSerie}</span></div>
          </div>
          <JsonBlock data={result.respostaIXC} label="Resposta do IXC" />
        </motion.div>
      )}
    </motion.div>
  );
}

/* ─── Reusable form field ─── */
function FormField({ icon: Icon, label, value, onChange, placeholder, type = "text" }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] uppercase tracking-wider text-[hsl(var(--task-text-muted))] font-semibold flex items-center gap-1">
        <Icon className="h-3 w-3" /> {label}
      </label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} type={type}
        className="h-9 w-full rounded-lg border border-[hsl(var(--task-border))] bg-[hsl(var(--task-bg))] px-3 text-xs text-[hsl(var(--task-text))] outline-none focus:border-[hsl(var(--task-purple)/0.5)] placeholder:text-[hsl(var(--task-text-muted)/0.4)]" />
    </div>
  );
}

/* ─── JSON Block with copy ─── */
function JsonBlock({ data, label }: { data: unknown; label: string }) {
  const [copied, setCopied] = useState(false);
  const text = formatJson(data);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-[hsl(var(--task-border)/0.4)] bg-[hsl(var(--task-bg)/0.5)] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[hsl(var(--task-border)/0.3)]">
        <span className="text-[10px] font-semibold text-[hsl(var(--task-text-muted))]">{label}</span>
        <button onClick={handleCopy} className="text-[hsl(var(--task-text-muted))] hover:text-[hsl(var(--task-purple))] transition" title="Copiar">
          {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <ClipboardCopy className="h-3 w-3" />}
        </button>
      </div>
      <pre className="p-3 text-[10px] leading-relaxed text-[hsl(var(--task-text-muted)/0.8)] overflow-x-auto max-h-48 styled-scrollbar">
        {text}
      </pre>
    </div>
  );
}