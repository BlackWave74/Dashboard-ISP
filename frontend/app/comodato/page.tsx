"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/modules/layout/components/Sidebar";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { consultarComodato } from "@/modules/ixc/client";
import type { ComodatoStatus } from "@/modules/ixc/types";
import { parseTxtComodato, type ParsedComodatoItem, type ParsedComodatoSummary } from "@/modules/ixc/parseTxt";
import { storage } from "@/modules/shared/storage";

const sessionStore = {
  get<T>(key: string, fallback: T): T {
    if (typeof window === "undefined") return fallback;
    try {
      const raw = window.sessionStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },
  set<T>(key: string, value: T) {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  },
  remove(key: string) {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};
import "../../styles/pages/comodato.css";

type RowStatus = "todo" | "ready" | "has" | "dup" | "warn" | "dead" | "error";

type RowInfo = {
  status: RowStatus;
  message?: string;
};

type IxcProfile = { name: string; data: Record<string, unknown> };

const statusStyles: Record<RowStatus, { bg: string; text: string; label: string }> = {
  todo: { bg: "bg-slate-800 border-slate-700", text: "text-slate-200", label: "Não preparado" },
  ready: { bg: "bg-emerald-500/15 border-emerald-500/50", text: "text-emerald-200", label: "Pronto para lançar" },
  has: { bg: "bg-blue-500/15 border-blue-500/50", text: "text-blue-100", label: "Já possui comodato" },
  dup: { bg: "bg-amber-500/15 border-amber-400/50", text: "text-amber-100", label: "Duplicado" },
  warn: { bg: "bg-yellow-500/15 border-yellow-400/60", text: "text-yellow-100", label: "Patrimônio não localizado" },
  dead: { bg: "bg-rose-600/20 border-rose-500/70", text: "text-rose-100", label: "Contrato inativo/cancelado" },
  error: { bg: "bg-red-500/15 border-red-500/50", text: "text-red-100", label: "Contrato não encontrado" },
};

const btn = "h-10 rounded-lg border px-3 text-sm font-semibold transition flex items-center gap-2 justify-center";

const DEAD_KEYWORDS = [
  "contrato inativo",
  "contrato cancelado",
  "contrato desativado",
  "status do contrato deve ser",
  "patrimônio já está em comodato",
  "patrimonio ja esta em comodato",
  "sem saldo",
  "almoxarifado",
];

const hasDeadKeyword = (text: string) => {
  const low = text.toLowerCase();
  return DEAD_KEYWORDS.some((word) => low.includes(word));
};

const isContratoDead = (status: unknown) => {
  const text = String(status ?? "").trim().toLowerCase();
  if (!text) return false;
  return ["i", "c", "d", "s", "cancelado", "inativo", "desativado"].includes(text);
};

export default function ComodatoPage() {
  const router = useRouter();
  const { session, loadingSession, logout, canAccess } = useAuth();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [parsed, setParsed] = useState<ParsedComodatoSummary | null>(null);
  const [parsedFiles, setParsedFiles] = useState<string[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);

  const [visualLog, setVisualLog] = useState<string[]>([]);
  const [techLog, setTechLog] = useState<string[]>([]);
  const [logTab, setLogTab] = useState<"visual" | "tech">("visual");

  const [rowResults, setRowResults] = useState<Record<string, RowInfo>>({});
  const [ixcProfiles, setIxcProfiles] = useState<IxcProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<string>("");
  const [ixcLoaded, setIxcLoaded] = useState(false);

const [statusResult, setStatusResult] = useState<ComodatoStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [consultingKey, setConsultingKey] = useState<string | null>(null);

  const [exportOpen, setExportOpen] = useState(false);
  const [exportChoice, setExportChoice] = useState<string>("visiveis");
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    if (!loadingSession && !session) {
      router.replace("/auth");
    } else if (!loadingSession && !canAccess("comodato")) {
      router.replace("/tarefas");
    }
  }, [loadingSession, session, canAccess, router]);

  useEffect(() => {
    if (ixcLoaded) return;
    const email = session?.email;
    if (!email) return;
    const key = `integrations_state:${email}`;
    const map = storage.get<
      Record<string, { config?: Record<string, unknown>; profiles?: { name: string; data?: Record<string, unknown> }[]; activeProfile?: string }>
    >(key, {});
    const ixcState = map["ixc"];
    const profiles: IxcProfile[] = [];
    if (ixcState?.config) profiles.push({ name: "IXC padrão", data: ixcState.config });
    for (const p of ixcState?.profiles ?? []) {
      profiles.push({ name: p.name, data: p.data ?? {} });
    }
    setIxcProfiles(profiles);
    setActiveProfile(ixcState?.activeProfile || profiles[0]?.name || "");
    setIxcLoaded(true);
  }, [session?.email, ixcLoaded]);

  // restaura estado salvo (parsed, logs etc.) para não perder ao sair/voltar
  useEffect(() => {
    if (restored || !session?.email) return;
    const key = `comodato_state:${session.email}`;
    const saved = sessionStore.get<{
      parsed?: ParsedComodatoSummary;
      parsedFiles?: string[];
      rowResults?: Record<string, RowInfo>;
      visualLog?: string[];
      techLog?: string[];
      exportChoice?: string;
    }>(key, {});
    if (saved.parsed) setParsed(saved.parsed);
    if (saved.parsedFiles) setParsedFiles(saved.parsedFiles);
    if (saved.rowResults) setRowResults(saved.rowResults);
    if (saved.visualLog) setVisualLog(saved.visualLog);
    if (saved.techLog) setTechLog(saved.techLog);
    if (saved.exportChoice) setExportChoice(saved.exportChoice);
    storage.remove(key);
    setRestored(true);
  }, [restored, session?.email]);

  // persiste estado principal sempre que mudar
  useEffect(() => {
    if (!session?.email) return;
    const key = `comodato_state:${session.email}`;
    sessionStore.set(key, {
      parsed,
      parsedFiles,
      rowResults,
      visualLog,
      techLog,
      exportChoice,
    });
  }, [session?.email, parsed, parsedFiles, rowResults, visualLog, techLog, exportChoice]);

  const activeIxcConfig = useMemo(
    () => ixcProfiles.find((p) => p.name === activeProfile)?.data ?? null,
    [ixcProfiles, activeProfile]
  );

  const rowKey = (item: ParsedComodatoItem) => `${item.pppoe}|${item.serial ?? ""}|${item.modelo ?? ""}`.toLowerCase();

  const resolveRowStatus = useCallback(
    (item: ParsedComodatoItem): RowInfo => {
      const existing = rowResults[rowKey(item)];
      if (existing) return existing;
      if (item.status === "ok") return { status: "todo", message: "Aguardando consulta IXC" };
      if (item.status === "pendente") return { status: "warn", message: item.reason || "Patrimônio não localizado" };
      return { status: "warn", message: item.reason || "Inconsistência de parsing" };
    },
    [rowResults]
  );

  const tableRows = useMemo<ParsedComodatoItem[]>(() => {
    if (!parsed) return [];
    return [...parsed.items, ...parsed.pendentes];
  }, [parsed]);

  const duplicates = useMemo(() => {
    const mapDup = new Map<string, ParsedComodatoItem[]>();
    for (const item of tableRows) {
      const key = (item.pppoe || "").trim();
      if (!key) continue;
      const arr = mapDup.get(key) ?? [];
      arr.push(item);
      mapDup.set(key, arr);
    }
    const result: ParsedComodatoItem[] = [];
    for (const arr of mapDup.values()) {
      if (arr.length > 1) result.push(...arr);
    }
    return result;
  }, [tableRows]);

  const counts = useMemo(
    () => ({
      ready: tableRows.filter((item) => resolveRowStatus(item).status === "ready").length,
      has: tableRows.filter((item) => resolveRowStatus(item).status === "has").length,
      dup: duplicates.length,
      warn: tableRows.filter((item) => resolveRowStatus(item).status === "warn").length,
      error: tableRows.filter((item) => resolveRowStatus(item).status === "error").length,
      dead: tableRows.filter((item) => resolveRowStatus(item).status === "dead").length,
    }),
    [tableRows, duplicates, resolveRowStatus]
  );

  const pushLog = (kind: "visual" | "tech", message: string) => {
    const line = `[${new Date().toLocaleTimeString()}] ${message}`;
    if (kind === "visual") setVisualLog((prev) => [line, ...prev].slice(0, 400));
    else setTechLog((prev) => [line, ...prev].slice(0, 400));
  };

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    setParsing(true);
    setParseError(null);
    setParsed(null);
    setRowResults({});
    setStatusResult(null);
    try {
      const files = await Promise.all(
        Array.from(fileList).map(async (file) => ({
          name: file.name,
          text: await file.text(),
        }))
      );
      const summary = parseTxtComodato(files);
      setParsed(summary);
      setParsedFiles(files.map((f) => f.name));
      pushLog(
        "visual",
        `TXT importado (${summary.items.length} válidos, ${summary.pendentes.length} pendentes/inválidos, ${summary.totalLinhas} linhas).`
      );
      pushLog("tech", `Arquivos: ${files.map((f) => f.name).join(", ")}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao ler os arquivos TXT.";
      setParseError(message);
      pushLog("tech", `Erro ao ler TXT: ${message}`);
    } finally {
      setParsing(false);
    }
  };

  const deriveConsultaStatus = (data: ComodatoStatus): RowInfo => {
    if (data.comodatos?.length) return { status: "has", message: "Já possui comodato" };
    if (isContratoDead(data.contrato?.status)) {
      return { status: "dead", message: "Contrato inativo/cancelado para comodato." };
    }
    const patrimonio = data.patrimonio;
    if (patrimonio && Object.keys(patrimonio).length) {
      return { status: "ready", message: "Patrimônio localizado, pronto para lançar" };
    }
    return { status: "warn", message: "Patrimônio não localizado no IXC" };
  };

  const handleConsultar = async (item: ParsedComodatoItem) => {
    const key = rowKey(item);
    setConsultingKey(key);
    setStatusError(null);
    pushLog("tech", `Consultando IXC para PPPoE ${item.pppoe} / Serial ${item.serial ?? "-"}...`);
    const response = await consultarComodato({
      pppoe: item.pppoe,
      serial: item.serial ?? "",
      config: activeIxcConfig ?? undefined,
      auditUser: session?.email ?? undefined,
    });
    if (!response.ok || !response.data) {
      const errorMsg = response.error ?? "Falha na consulta IXC.";
      setStatusError(errorMsg);
      setRowResults((prev) => ({ ...prev, [key]: { status: hasDeadKeyword(errorMsg) ? "dead" : "error", message: errorMsg } }));
      pushLog("tech", `Consulta falhou (${item.pppoe}): ${errorMsg}`);
    } else {
      setStatusResult(response.data);
      const info = deriveConsultaStatus(response.data);
      setRowResults((prev) => ({ ...prev, [key]: info }));
      pushLog("visual", `Consulta IXC concluída para ${item.pppoe}: ${info.message ?? info.status}`);
    }
    setConsultingKey(null);
  };

  const exportCsv = () => {
    if (!parsed) return;
    let rows: string[] = [];
    if (exportChoice === "visiveis") {
      rows = tableRows.map((r) => `${r.pppoe};${r.serial ?? ""};${r.modelo ?? ""}`);
    } else if (exportChoice === "pendentes") {
      rows = tableRows.filter((r) => resolveRowStatus(r).status === "ready").map((r) => `${r.pppoe};${r.serial ?? ""};${r.modelo ?? ""}`);
    } else if (exportChoice === "duplicados") {
      rows = duplicates.map((r) => `${r.pppoe};${r.serial ?? ""};${r.modelo ?? ""}`);
    } else if (exportChoice === "inativos") {
      rows = tableRows.filter((r) => resolveRowStatus(r).status === "dead").map((r) => `${r.pppoe};${r.serial ?? ""};${r.modelo ?? ""}`);
    } else if (exportChoice === "nao_localizados") {
      rows = tableRows.filter((r) => resolveRowStatus(r).status === "warn").map((r) => `${r.pppoe};${r.serial ?? ""};${r.modelo ?? ""}`);
    }
    rows.unshift("PPPoE;Serial;Modelo");
    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comodato-${exportChoice}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  };

  const previewCount = useMemo(() => {
    if (!parsed) return 0;
    switch (exportChoice) {
      case "visiveis":
        return tableRows.length;
      case "pendentes":
        return tableRows.filter((r) => resolveRowStatus(r).status === "ready").length;
      case "duplicados":
        return duplicates.length;
      case "inativos":
        return tableRows.filter((r) => resolveRowStatus(r).status === "dead").length;
      case "nao_localizados":
        return tableRows.filter((r) => resolveRowStatus(r).status === "warn").length;
      default:
        return 0;
    }
  }, [parsed, tableRows, duplicates, exportChoice, resolveRowStatus]);

  const isLoading = loadingSession || (!session && !loadingSession);
  if (isLoading) {
    return (
      <div className="page page--comodato flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/50 border-t-transparent" />
      </div>
    );
  }

  const userName = session?.name ?? "Usuário";

  const renderStatusBadge = (info: RowInfo) => {
    const style = statusStyles[info.status];
    return (
      <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold ${style.bg} ${style.text}`}>
        <span className="h-2 w-2 rounded-full bg-current" />
        {style.label}
      </span>
    );
  };

  return (
    <div className="page page--comodato">
      <main className="flex min-h-screen w-full">
      <Sidebar userName={userName} userRole={session?.role ?? "consultor"} onLogout={logout} current="comodato" />

      <div className="min-h-screen flex-1 pl-72 pr-6 py-10">
        <section className="mx-auto w-full max-w-[1600px] rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.8)]">
          <div className="mb-4 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">Lançador de Comodato</p>
            <h1 className="text-3xl font-semibold text-white">Importar TXT · Consultar · Lançar</h1>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <label className={`${btn} min-w-[180px] border-indigo-400/60 bg-indigo-600/80 text-white hover:bg-indigo-600 cursor-pointer`}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt"
                multiple
                onChange={(event) => handleFilesSelected(event.target.files)}
                className="hidden"
              />
              {parsing ? "Lendo TXT..." : "Importar TXT"}
            </label>
            <button
              type="button"
              onClick={() => router.push("/comodato/consulta")}
              className={`${btn} min-w-[180px] border-slate-700 bg-slate-800 text-slate-100 hover:border-indigo-400/50`}
            >
              Consultar PPPoE/Serial
            </button>
            <button
              type="button"
              onClick={() => router.push("/comodato/lancar")}
              className={`${btn} min-w-[180px] border-emerald-500/60 bg-emerald-600/80 text-white hover:bg-emerald-600`}
            >
              Lançar Comodato
            </button>
            <button
              type="button"
              onClick={() => setExportOpen(true)}
              className={`${btn} min-w-[180px] border-slate-700 bg-slate-800 text-slate-100 hover:border-indigo-400/50`}
            >
              Exportar CSV
            </button>
          </div>
          {statusError ? (
            <div className="mt-3 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm text-red-100">
              {statusError}
            </div>
          ) : null}
          <div className="mb-2" />

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-200">
              <p className="text-xs uppercase tracking-[0.2em] text-indigo-300">Arquivo</p>
              {parsed ? (
                <>
                  <p className="mt-1 font-semibold text-white">{parsedFiles.join(", ")}</p>
                  <p className="text-xs text-slate-400">
                    Linhas: {parsed.totalLinhas} · Itens: {parsed.items.length} · Pendentes: {parsed.pendentes.length}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-slate-400">Carregue um TXT para iniciar.</p>
              )}
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-200">
              <p className="text-xs uppercase tracking-[0.2em] text-indigo-300">Resumo</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <span className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-2 py-2 text-emerald-100">
                  Pronto para lançar: {counts.ready}
                </span>
                <span className="rounded-lg border border-blue-500/50 bg-blue-500/10 px-2 py-2 text-blue-100">
                  Já possui comodato: {counts.has}
                </span>
                <span className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-2 py-2 text-amber-100">Duplicados: {counts.dup}</span>
                <span className="rounded-lg border border-yellow-500/60 bg-yellow-500/10 px-2 py-2 text-yellow-100">
                  Patrimônio não localizado: {counts.warn}
                </span>
                <span className="rounded-lg border border-rose-500/60 bg-rose-600/10 px-2 py-2 text-rose-100">
                  Inativo/cancelado: {counts.dead}
                </span>
                <span className="rounded-lg border border-red-500/60 bg-red-500/10 px-2 py-2 text-red-100">
                  Contrato não encontrado: {counts.error}
                </span>
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-200">
              <p className="text-xs uppercase tracking-[0.2em] text-indigo-300">Base IXC</p>
              <p className="mt-1 font-semibold text-white">{activeProfile || "Nenhuma base"}</p>
              <select
                value={activeProfile}
                onChange={(e) => setActiveProfile(e.target.value)}
                className="mt-2 h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 text-sm text-white outline-none"
              >
                {ixcProfiles.length === 0 ? <option value="">Nenhuma base encontrada</option> : null}
                {ixcProfiles.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-400">Bases vêm do módulo Integrações.</p>
            </div>
          </div>

          {exportOpen ? (
            <div className="mt-5 w-full rounded-2xl border border-slate-800 bg-slate-950/90 p-5 text-sm text-slate-200 shadow-[0_20px_50px_-35px_rgba(0,0,0,0.8)]">
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-indigo-300">Exportar CSV</p>
                  <p className="text-sm text-slate-300">Escolha o conjunto e gere o arquivo com prévia da quantidade.</p>
                </div>
                <div className="ml-auto flex gap-2">
                  <button
                    type="button"
                    onClick={exportCsv}
                    disabled={previewCount === 0}
                    className="rounded-md border border-emerald-400/60 bg-emerald-600/80 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-800"
                  >
                    Exportar agora
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportOpen(false)}
                    className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-indigo-400/50"
                  >
                    Fechar
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {[
                  { id: "visiveis", label: "Resultados visíveis", desc: "O que você está vendo na tabela.", count: tableRows.length },
                  { id: "pendentes", label: "Pendentes para lançar", desc: "Prontos para envio / sem comodato.", count: counts.ready },
                  { id: "duplicados", label: "Duplicados", desc: "PPPoE repetidos no TXT.", count: duplicates.length },
                  { id: "inativos", label: "Inativos/cancelados", desc: "Contratos finalizados.", count: counts.dead },
                  { id: "nao_localizados", label: "Patrimônio não localizado", desc: "Itens que precisam ação externa.", count: counts.warn },
                ].map((opt) => {
                  const active = exportChoice === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setExportChoice(opt.id)}
                      className={`flex items-start gap-3 rounded-xl border px-3 py-3 text-left transition ${
                        active
                          ? "border-indigo-400/80 bg-indigo-500/10 shadow-[0_10px_30px_-20px_rgba(99,102,241,0.8)]"
                          : "border-slate-800 bg-slate-900/60 hover:border-indigo-400/50"
                      }`}
                    >
                      <span
                        className={`mt-1 inline-flex h-4 w-4 items-center justify-center rounded-full border ${
                          active ? "border-indigo-400 bg-indigo-500/40" : "border-slate-500"
                        }`}
                      >
                        {active ? <span className="h-2 w-2 rounded-full bg-indigo-200" /> : null}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-white">{opt.label}</p>
                          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-200">{opt.count}</span>
                        </div>
                        <p className="text-xs text-slate-400">{opt.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-slate-300">
                <p>Prévia: {previewCount} registros.</p>
                <p className="text-slate-400">CSV sem coluna “Origem” (PPPoE; Serial; Modelo).</p>
              </div>
            </div>
          ) : null}

        </section>

        <section className="mx-auto mt-6 grid w-full max-w-[1600px] gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.8)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-indigo-300">Itens importados</p>
                <h2 className="text-xl font-semibold text-white">Tabela com status e ações</h2>
              </div>
            </div>
            <div className="mt-4 max-h-[600px] overflow-auto rounded-xl border border-slate-800">
              <table className="min-w-full divide-y divide-slate-800 text-sm">
                <thead className="bg-slate-900/70 text-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">PPPoE</th>
                    <th className="px-4 py-3 text-left font-semibold">Serial</th>
                    <th className="px-4 py-3 text-left font-semibold">Modelo</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-950/60 text-slate-100">
                  {tableRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-4 text-center text-slate-400">
                        {parseError ? parseError : "Carregue um TXT para iniciar."}
                      </td>
                    </tr>
                  ) : null}
                  {tableRows.map((item, idx) => {
                    const info = resolveRowStatus(item);
                    const key = `${rowKey(item)}|${idx}`;
                    return (
                      <tr key={key} className="hover:bg-slate-900/50">
                        <td className="px-4 py-3 align-top font-semibold text-white">{item.pppoe}</td>
                        <td className="px-4 py-3 align-top text-slate-200">{item.serial ?? "-"}</td>
                        <td className="px-4 py-3 align-top text-slate-300">{item.modelo ?? "-"}</td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex flex-col gap-1">
                            {renderStatusBadge(info)}
                            <span className="text-xs text-slate-400">{info.message}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleConsultar(item)}
                              disabled={consultingKey === key}
                              className="rounded-md border border-indigo-400/60 bg-indigo-600/80 px-3 py-1 text-xs font-semibold text-white transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-800"
                            >
                              {consultingKey === key ? "Consultando..." : "Consultar"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.8)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-indigo-300">Logs</p>
                <h2 className="text-xl font-semibold text-white">Visual e Processamento</h2>
              </div>
              <div className="flex gap-2 rounded-lg border border-slate-800 bg-slate-950/70 p-1">
                <button
                  type="button"
                  onClick={() => setLogTab("visual")}
                  className={`rounded-md px-3 py-1 text-sm font-semibold transition ${
                    logTab === "visual" ? "bg-indigo-600 text-white" : "text-slate-200 hover:text-white"
                  }`}
                >
                  Visual
                </button>
                <button
                  type="button"
                  onClick={() => setLogTab("tech")}
                  className={`rounded-md px-3 py-1 text-sm font-semibold transition ${
                    logTab === "tech" ? "bg-indigo-600 text-white" : "text-slate-200 hover:text-white"
                  }`}
                >
                  Processamento
                </button>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/80 p-4">
              <div className="max-h-[520px] space-y-2 overflow-auto font-mono text-xs text-slate-100">
                {(logTab === "visual" ? visualLog : techLog).length === 0 ? (
                  <p className="text-slate-400">Sem logs ainda.</p>
                ) : (
                  (logTab === "visual" ? visualLog : techLog).map((line, idx) => {
                    const isWarn = /alerta|pendente|warn|erro|duplicado/i.test(line);
                    return (
                      <div
                        key={`${logTab}-${idx}`}
                        className={`rounded-md px-3 py-2 ${isWarn ? "bg-amber-500/10 text-amber-100" : "bg-slate-800/80 text-slate-100"}`}
                      >
                        {line}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            {statusResult ? (
              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-xs text-slate-200">
                <p className="text-[11px] uppercase tracking-[0.25em] text-indigo-300">
                  Última consulta IXC (contrato #{statusResult.contratoId})
                </p>
                <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap">{JSON.stringify(statusResult, null, 2)}</pre>
              </div>
            ) : null}

          </div>
        </section>
      </div>
      </main>
    </div>
  );
}



