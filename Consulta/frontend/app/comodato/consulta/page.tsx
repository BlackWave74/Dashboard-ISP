"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/modules/layout/components/Sidebar";
import "../../../styles/pages/comodato-consulta.css";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { consultarComodato } from "@/modules/ixc/client";
import type { ComodatoStatus } from "@/modules/ixc/types";
import { storage } from "@/modules/shared/storage";

type IxcProfile = { name: string; data: Record<string, unknown> };

const LINE_SEPARATOR = "-".repeat(60);

const hasValue = (value: unknown) => {
  if (value === null || value === undefined) return false;
  const text = String(value).trim();
  if (!text) return false;
  if (text === "0000-00-00") return false;
  return true;
};

const formatVisualValue = (value: unknown) => {
  if (typeof value === "object" && value !== null) {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
};

const dumpDictLines = (data: Record<string, unknown>, prefix = "") => {
  return Object.keys(data)
    .sort()
    .reduce<string[]>((acc, key) => {
      const value = data[key];
      if (!hasValue(value)) return acc;
      acc.push(`${prefix}${key}: ${formatVisualValue(value)}`);
      return acc;
    }, []);
};

const renderVisualText = (
  result: ComodatoStatus,
  lastQuery: { pppoe: string; serial: string }
) => {
  const lines: string[] = [];
  const contrato = result.contrato ?? {};
  const radusuario = result.radusuario ?? {};
  const comodatos = result.comodatos ?? [];
  const patrimonio = result.patrimonio ?? null;

  const totalEquipamentos = patrimonio ? 1 : 0;
  const serialHint = lastQuery.serial || "—";
  const pppoeUsed = lastQuery.pppoe || String(radusuario["pppoe"] ?? radusuario["login"] ?? "—");
  const contratoStatus = contrato["status"] ?? "—";
  const dataAtivacao = contrato["data_ativacao"] ?? "—";

  lines.push(`PPPoE: ${pppoeUsed}`);
  lines.push(
    `Contrato: ${result.contratoId || contrato["id"] || "—"} | Status: ${contratoStatus} | Ativação: ${dataAtivacao}`
  );
  lines.push(`Comodatos encontrados: ${comodatos.length}`);
  lines.push(`Equipamentos enriquecidos (comodato + patrimônio): ${totalEquipamentos}`);
  const patrimonioSerial =
    patrimonio?.["serial"] ??
    patrimonio?.["numero_serie"] ??
    patrimonio?.["numero_serie_fornecedor"] ??
    "—";
  lines.push(`Nº patrimonial (serial): ${patrimonioSerial}`);
  lines.push(`Fonte do patrimonial: ${patrimonio ? "IXC" : "—"}`);
  lines.push(`Serial (opcional) usado: ${serialHint}`);
  lines.push(LINE_SEPARATOR);

  if (result.messages && result.messages.length) {
    lines.push("Mensagens:");
    result.messages.forEach((message) => lines.push(`  - ${message}`));
    lines.push(LINE_SEPARATOR);
  }

  if (Object.keys(contrato).length) {
    lines.push("[CONTRATO]");
    lines.push(...dumpDictLines(contrato, "  "));
    lines.push(LINE_SEPARATOR);
  }

  if (Object.keys(radusuario).length) {
    lines.push("[RADUSUARIO]");
    lines.push(...dumpDictLines(radusuario, "  "));
    lines.push(LINE_SEPARATOR);
  }

  if (comodatos.length) {
    lines.push(`[COMODATOS] (${comodatos.length})`);
    comodatos.forEach((comodato, index) => {
      lines.push(`  (# ${index + 1})`);
      lines.push(...dumpDictLines(comodato, "    "));
    });
    lines.push(LINE_SEPARATOR);
  }

  if (patrimonio && Object.keys(patrimonio).length) {
    lines.push("[PATRIMONIO]");
    lines.push(...dumpDictLines(patrimonio, "  "));
  }

  return lines.join("\n");
};

export default function ConsultaComodatoPage() {
  const router = useRouter();
  const { session, loadingSession, logout } = useAuth();
  const [pppoe, setPppoe] = useState("");
  const [serial, setSerial] = useState("");
  const [statusResult, setStatusResult] = useState<ComodatoStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [consulting, setConsulting] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [viewMode, setViewMode] = useState<"visual" | "json">("visual");
  const [lastQuery, setLastQuery] = useState({ pppoe: "", serial: "" });

  const [ixcProfiles, setIxcProfiles] = useState<IxcProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<string>("");
  const [ixcLoaded, setIxcLoaded] = useState(false);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    if (!loadingSession && !session) {
      router.replace("/auth");
    }
  }, [loadingSession, session, router]);

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

  // restaura estado para não perder dados ao navegar entre telas
  useEffect(() => {
    if (restored || !session?.email) return;
    const saved = storage.get<{
      pppoe?: string;
      serial?: string;
      filterText?: string;
      statusResult?: ComodatoStatus | null;
      statusError?: string | null;
      activeProfile?: string;
    }>(`comodato_consulta_state:${session.email}`, {});
    if (saved.pppoe) setPppoe(saved.pppoe);
    if (saved.serial) setSerial(saved.serial);
    if (saved.filterText) setFilterText(saved.filterText);
    if (saved.statusResult) setStatusResult(saved.statusResult);
    if (saved.statusError) setStatusError(saved.statusError);
    if (saved.activeProfile) setActiveProfile(saved.activeProfile);
    setRestored(true);
  }, [restored, session?.email]);

  // persiste sempre que mudar
  useEffect(() => {
    if (!session?.email) return;
    storage.set(`comodato_consulta_state:${session.email}`, {
      pppoe,
      serial,
      filterText,
      statusResult,
      statusError,
      activeProfile,
    });
  }, [session?.email, pppoe, serial, filterText, statusResult, statusError, activeProfile]);

  const activeIxcConfig = useMemo(
    () => ixcProfiles.find((p) => p.name === activeProfile)?.data ?? null,
    [ixcProfiles, activeProfile]
  );

  const handleConsultar = async () => {
    const pp = pppoe.trim();
    if (!pp) {
      setStatusError("Informe o PPPoE.");
      return;
    }
    setLastQuery({ pppoe: pp, serial: serial.trim() });
    setConsulting(true);
    setStatusError(null);
    setStatusResult(null);
    const response = await consultarComodato({
      pppoe: pp,
      serial: serial.trim(),
      config: activeIxcConfig ?? undefined,
      auditUser: session?.email ?? undefined,
    });
    if (!response.ok || !response.data) {
      const errorMsg = response.error ?? "Falha na consulta IXC.";
      setStatusError(errorMsg);
    } else {
      setStatusResult(response.data);
    }
    setConsulting(false);
  };

  const visualText = useMemo(() => {
    if (!statusResult) return "";
    return renderVisualText(statusResult, lastQuery);
  }, [statusResult, lastQuery]);

  const jsonText = useMemo(() => {
    if (!statusResult) return "";
    return JSON.stringify(statusResult, null, 2);
  }, [statusResult]);

  const normalizedFilter = filterText.trim().toLowerCase();
  const filteredVisualText = useMemo(() => {
    if (!visualText) return "";
    if (!normalizedFilter) return visualText;
    return visualText
      .split("\n")
      .filter((line) => line.toLowerCase().includes(normalizedFilter))
      .join("\n");
  }, [visualText, normalizedFilter]);

  const filteredJsonText = useMemo(() => {
    if (!jsonText) return "";
    if (!normalizedFilter) return jsonText;
    return jsonText
      .split("\n")
      .filter((line) => line.toLowerCase().includes(normalizedFilter))
      .join("\n");
  }, [jsonText, normalizedFilter]);

  const activeFilteredText = viewMode === "visual" ? filteredVisualText : filteredJsonText;
  const emptyResultText =
    normalizedFilter && !activeFilteredText
      ? `Nenhuma linha corresponde ao filtro "${filterText.trim()}".`
      : "Nenhum dado disponível para esta visualização.";

  if (loadingSession || (!session && !loadingSession)) {
    return (
      <div className="page page--comodato-consulta flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/50 border-t-transparent" />
      </div>
    );
  }

  const btn =
    "h-10 rounded-lg border px-3 text-sm font-semibold transition flex items-center gap-2 justify-center border-indigo-400/60 bg-indigo-600/80 text-white hover:bg-indigo-600";
  const inputClass =
    "h-10 rounded-lg border border-slate-800 bg-slate-950/70 px-3 text-sm text-white outline-none ring-2 ring-transparent transition focus:border-indigo-400 focus:ring-indigo-500/30";

  return (
    <div className="page page--comodato-consulta">
    <main className="flex min-h-screen w-full">
      <Sidebar userName={session?.name ?? "Usuário"} userRole={session?.role ?? "consultor"} onLogout={logout} current="comodato" />

      <div className="min-h-screen flex-1 pl-72 pr-8 py-10">
        <section className="mx-auto w-full max-w-5xl rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.8)]">
          <div className="text-center space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">Consulta PPPoE / Serial</p>
            <h1 className="text-3xl font-semibold text-white">Buscar contrato e comodato no IXC</h1>
            <p className="text-sm text-slate-300">
              Informe o PPPoE e, se quiser refinar, um Serial. A base IXC vem do módulo Integrações.
            </p>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs uppercase tracking-[0.18em] text-indigo-300">PPPoE</label>
              <input value={pppoe} onChange={(e) => setPppoe(e.target.value)} placeholder="PPPoE" className={inputClass} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs uppercase tracking-[0.18em] text-indigo-300">Serial (opcional)</label>
              <input value={serial} onChange={(e) => setSerial(e.target.value)} placeholder="Serial" className={inputClass} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs uppercase tracking-[0.18em] text-indigo-300">Base IXC</label>
              <select
                value={activeProfile}
                onChange={(e) => setActiveProfile(e.target.value)}
                className="h-10 rounded-lg border border-slate-700 bg-slate-900 px-2 text-sm text-white outline-none"
              >
                {ixcProfiles.length === 0 ? <option value="">Nenhuma base encontrada</option> : null}
                {ixcProfiles.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {statusError ? (
            <div className="mt-3 rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">{statusError}</div>
          ) : null}

          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={handleConsultar} disabled={consulting} className={btn}>
              {consulting ? "Consultando..." : "Consultar"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/comodato")}
              className="h-10 rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm font-semibold text-slate-100 transition hover:border-indigo-400/50"
            >
              Voltar para o Lançador
            </button>
          </div>
          {consulting ? (
            <div className="mt-3 flex flex-col items-center gap-2">
              <div className="relative h-2 w-64 overflow-hidden rounded-full bg-slate-800">
                <div className="shimmer absolute inset-0" />
              </div>
            </div>
          ) : null}

            {statusResult ? (
              <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-xs text-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="max-w-2xl space-y-1">
                    <p className="text-[11px] uppercase tracking-[0.25em] text-indigo-300">
                      Última consulta IXC (contrato #{statusResult.contratoId})
                    </p>
                    <p className="text-[12px] text-slate-400">
                      Alterne entre a visão visual formatada e o JSON completo, mantendo o filtro ativo.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setViewMode("visual")}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        viewMode === "visual"
                          ? "border-indigo-400 bg-indigo-500/20 text-white"
                          : "border-slate-700 text-slate-300 hover:border-indigo-400/60"
                      }`}
                    >
                      Visual
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("json")}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        viewMode === "json"
                          ? "border-indigo-400 bg-indigo-500/20 text-white"
                          : "border-slate-700 text-slate-300 hover:border-indigo-400/60"
                      }`}
                    >
                      JSON
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <input
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    placeholder="Filtrar no resultado..."
                    className="h-12 flex-1 min-w-[220px] rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-white outline-none ring-2 ring-transparent transition focus:border-indigo-400 focus:ring-indigo-500/30"
                  />
                  <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    Aplicado ao slide atual.
                  </span>
                </div>

                {statusResult.messages?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-emerald-200">
                    {statusResult.messages.map((message, index) => (
                      <span
                        key={message + index}
                        className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-emerald-100"
                      >
                        {message}
                      </span>
                    ))}
                  </div>
                ) : null}

                <pre className="mt-3 max-h-[500px] overflow-auto whitespace-pre-wrap rounded-2xl border border-slate-900/70 bg-slate-900/40 p-4 text-[12px]">
                  {activeFilteredText || emptyResultText}
                </pre>
              </div>
            ) : null}
        </section>
      </div>
      <style jsx>{`
        .shimmer {
          background: linear-gradient(
            90deg,
            rgba(99, 102, 241, 0) 0%,
            rgba(129, 140, 248, 0.9) 50%,
            rgba(99, 102, 241, 0) 100%
          );
          transform: translateX(-100%);
          animation: shimmer-move 1.2s ease-in-out infinite;
        }
        @keyframes shimmer-move {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
      </main>
    </div>
  );
}
