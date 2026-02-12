"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/modules/layout/components/Sidebar";
import "../../../styles/pages/comodato-lancar.css";
import { useAuth } from "@/modules/auth/hooks/useAuth";
import { consultarComodato, lancarComodato } from "@/modules/ixc/client";
import type { ComodatoStatus } from "@/modules/ixc/types";
import type { ParsedComodatoItem, ParsedComodatoSummary } from "@/modules/ixc/parseTxt";
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

type IxcProfile = { name: string; data: Record<string, unknown> };

type Prepared = {
  contratoId?: string;
  numeroPatrimonial?: string;
  idPatrimonio?: string;
  status: "todo" | "ready" | "has" | "warn" | "dead" | "error";
  message?: string;
  raw?: ComodatoStatus;
  launched?: boolean;
  launchMessage?: string;
};

const rowKey = (item: ParsedComodatoItem) => `${item.pppoe}|${item.serial ?? ""}|${item.modelo ?? ""}`.toLowerCase();

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

const scoreItemCompleteness = (item: ParsedComodatoItem, prep?: Prepared) => {
  let score = 0;
  if (item.serial) score += 2;
  if (item.modelo) score += 1;
  if (prep?.idPatrimonio) score += 3;
  if (prep?.numeroPatrimonial) score += 1;
  score += Number(item.line || 0) / 10000;
  return score;
};

export default function LancarComodatoPage() {
  const router = useRouter();
  const { session, loadingSession, logout } = useAuth();

  const [parsed, setParsed] = useState<ParsedComodatoSummary | null>(null);
  const [parsedFiles, setParsedFiles] = useState<string[]>([]);
  const [ixcProfiles, setIxcProfiles] = useState<IxcProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<string>("");
  const [ixcLoaded, setIxcLoaded] = useState(false);

  const [prepared, setPrepared] = useState<Record<string, Prepared>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [restored, setRestored] = useState(false);
  const [launchLimit, setLaunchLimit] = useState<string>("");
  const [dedupeByPppoe, setDedupeByPppoe] = useState(true);
  const [batchFeedback, setBatchFeedback] = useState<string>("");
  const cancelRef = useRef(false);

  useEffect(() => {
    if (!loadingSession && !session) {
      router.replace("/auth");
    }
  }, [loadingSession, session, router]);

  // carrega parsed do lançador + ixcs
  useEffect(() => {
    if (restored || !session?.email) return;
    const key = `comodato_state:${session.email}`;
    const saved = sessionStore.get<{
      parsed?: ParsedComodatoSummary;
      parsedFiles?: string[];
      rowResults?: Record<string, Prepared>;
      visualLog?: string[];
      techLog?: string[];
      exportChoice?: string;
    }>(key, {});
    if (saved.parsed) setParsed(saved.parsed);
    if (saved.parsedFiles) setParsedFiles(saved.parsedFiles);
    storage.remove(key);

    const launchSaved = sessionStore.get<{
      prepared?: Record<string, Prepared>;
      selected?: string[];
      activeProfile?: string;
      launchLimit?: string;
      dedupeByPppoe?: boolean;
    }>(`comodato_lancar_state:${session.email}`, {});
    if (launchSaved.prepared) setPrepared(launchSaved.prepared);
    if (launchSaved.selected) setSelected(new Set(launchSaved.selected));
    if (launchSaved.activeProfile) setActiveProfile(launchSaved.activeProfile);
    if (launchSaved.launchLimit) setLaunchLimit(launchSaved.launchLimit);
    if (typeof launchSaved.dedupeByPppoe === "boolean") setDedupeByPppoe(launchSaved.dedupeByPppoe);
    storage.remove(`comodato_lancar_state:${session.email}`);
    setRestored(true);
  }, [restored, session?.email]);

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

  // persiste estado local
  useEffect(() => {
    if (!session?.email) return;
    sessionStore.set(`comodato_lancar_state:${session.email}`, {
      prepared,
      selected: Array.from(selected),
      activeProfile,
      launchLimit,
      dedupeByPppoe,
    });
  }, [session?.email, prepared, selected, activeProfile, launchLimit, dedupeByPppoe]);

  const activeIxcConfig = useMemo(
    () => ixcProfiles.find((p) => p.name === activeProfile)?.data ?? null,
    [ixcProfiles, activeProfile]
  );

  const tableRows = useMemo<ParsedComodatoItem[]>(() => {
    if (!parsed) return [];
    return [...parsed.items, ...parsed.pendentes];
  }, [parsed]);

  const readyRows = useMemo(
    () => tableRows.filter((item) => (prepared[rowKey(item)]?.status ?? "todo") !== "has"),
    [tableRows, prepared]
  );

  const selectedReady = useMemo(
    () => readyRows.filter((r) => selected.has(rowKey(r)) && prepared[rowKey(r)]?.status === "ready"),
    [readyRows, selected, prepared]
  );

  const toggleSelect = (key: string, on?: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on === undefined ? !next.has(key) : on) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const prepareOne = async (item: ParsedComodatoItem) => {
    const key = rowKey(item);
    const response = await consultarComodato({
      pppoe: item.pppoe,
      serial: item.serial ?? undefined,
      config: activeIxcConfig ?? undefined,
      auditUser: session?.email ?? undefined,
    });
    if (!response.ok || !response.data) {
      const errorMsg = response.error ?? "Falha na consulta IXC.";
      setPrepared((prev) => ({
        ...prev,
        [key]: { status: hasDeadKeyword(errorMsg) ? "dead" : "error", message: errorMsg },
      }));
      return;
    }
    const data = response.data;
    const contratoStatus = (data.contrato?.status as string | undefined) ?? "";
    if (isContratoDead(contratoStatus)) {
      setPrepared((prev) => ({
        ...prev,
        [key]: {
          status: "dead",
          message: `Contrato inativo/cancelado (status ${contratoStatus || "N/D"}).`,
          raw: data,
        },
      }));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      return;
    }
    if (data.comodatos?.length) {
      setPrepared((prev) => ({
        ...prev,
        [key]: { status: "has", message: "Já possui comodato", raw: data },
      }));
      return;
    }
    const contratoId = data.contratoId;
    if (!contratoId) {
      setPrepared((prev) => ({
        ...prev,
        [key]: { status: "dead", message: "Contrato não encontrado para este PPPoE.", raw: data },
      }));
      return;
    }
    const patrimonio = data.patrimonio ?? null;
    if (!patrimonio || !Object.keys(patrimonio).length || !(patrimonio as { id?: unknown }).id) {
      setPrepared((prev) => ({
        ...prev,
        [key]: {
          status: "warn",
          message: "Patrimônio não localizado. Cadastre no IXC antes de lançar.",
          contratoId,
          raw: data,
        },
      }));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      return;
    }
    setPrepared((prev) => ({
      ...prev,
      [key]: {
        status: "ready",
        message: "Patrimônio localizado, pronto para lançar.",
        contratoId,
        numeroPatrimonial:
          (patrimonio as { numero_patrimonial?: string })?.numero_patrimonial ||
          (patrimonio as { n_patrimonial?: string })?.n_patrimonial ||
          item.serial ||
          "",
        idPatrimonio: (patrimonio as { id?: string })?.id?.toString(),
        raw: data,
      },
    }));
    setSelected((prev) => new Set(prev).add(key));
  };

  const handlePrepareAll = async () => {
    if (!readyRows.length) return;
    setBatchFeedback("");
    setBusy(true);
    cancelRef.current = false;
    for (const item of readyRows) {
      if (cancelRef.current) break;
      await prepareOne(item);
    }
    setBusy(false);
  };

  const handleLaunch = async () => {
    if (busy) return;
    if (!selectedReady.length) return;
    const limit = Number.parseInt(launchLimit || "", 10);
    const subset = Number.isFinite(limit) && limit > 0 ? selectedReady.slice(0, limit) : selectedReady;
    const baseId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const deduped: ParsedComodatoItem[] = [];
    const droppedKeys: string[] = [];
    if (dedupeByPppoe) {
      const byPppoe = new Map<string, ParsedComodatoItem>();
      for (const item of subset) {
        const pppoe = String(item.pppoe || "").trim();
        if (!pppoe) continue;
        const current = byPppoe.get(pppoe);
        if (!current) {
          byPppoe.set(pppoe, item);
          continue;
        }
        const currentScore = scoreItemCompleteness(current, prepared[rowKey(current)]);
        const nextScore = scoreItemCompleteness(item, prepared[rowKey(item)]);
        if (nextScore >= currentScore) {
          droppedKeys.push(rowKey(current));
          byPppoe.set(pppoe, item);
        } else {
          droppedKeys.push(rowKey(item));
        }
      }
      deduped.push(...byPppoe.values());
    } else {
      deduped.push(...subset);
    }

    if (droppedKeys.length) {
      setPrepared((prev) => {
        const next = { ...prev };
        for (const key of droppedKeys) {
          next[key] = {
            ...next[key],
            status: "warn",
            launchMessage: "Removido do lote por PPPoE duplicado.",
          };
        }
        return next;
      });
      setSelected((prev) => {
        const next = new Set(prev);
        for (const key of droppedKeys) next.delete(key);
        return next;
      });
    }

    setBatchFeedback(
      droppedKeys.length
        ? `Lote ajustado: ${droppedKeys.length} item(ns) removidos por duplicidade de PPPoE.`
        : ""
    );
    setBusy(true);
    cancelRef.current = false;
    let inserted = 0;
    let alreadyExists = 0;
    let failed = 0;
    try {
      for (const item of deduped) {
        if (cancelRef.current) break;
        const key = rowKey(item);
        const prep = prepared[key];
        if (!prep?.contratoId) continue;
        const idemKey = `${baseId}:${key}`;
        const res = await lancarComodato({
          contratoId: prep.contratoId,
          numeroSerie: item.serial ?? "",
          numeroPatrimonial: prep.numeroPatrimonial,
          idPatrimonio: prep.idPatrimonio,
          descricao: item.modelo ?? "Equipamento em comodato",
          config: activeIxcConfig ?? undefined,
          idempotencyKey: idemKey,
          auditUser: session?.email ?? undefined,
        });
        setPrepared((prev) => ({
          ...prev,
          [key]: {
            ...prev[key],
            launched: res.ok,
            launchMessage: res.ok
              ? res.data?.status === "already_exists"
                ? "Comodato já existente (insert ignorado)."
                : "Comodato lançado."
              : res.error ?? "Falha ao lançar.",
            status: res.ok
              ? "has"
              : hasDeadKeyword(res.error ?? "")
                ? "dead"
                : (prev[key]?.status ?? "error"),
          },
        }));
        if (res.ok) {
          if (res.data?.status === "already_exists") alreadyExists += 1;
          else inserted += 1;
        } else {
          failed += 1;
        }
      }
    } finally {
      setBusy(false);
      setBatchFeedback((prev) => {
        const summary = `Resumo do lote: inseridos=${inserted}, já existentes=${alreadyExists}, falhas=${failed}.`;
        return prev ? `${prev} ${summary}` : summary;
      });
    }
  };

  if (loadingSession || (!session && !loadingSession)) {
    return (
      <div className="page page--comodato-lancar flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/50 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="page page--comodato-lancar">
      <main className="flex min-h-screen w-full">
        <Sidebar userName={session?.name ?? "Usuário"} userRole={session?.role ?? "consultor"} onLogout={logout} current="comodato" />

        <div className="min-h-screen flex-1 pl-72 pr-8 py-10">
        <section className="mx-auto w-full max-w-[1600px] rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.8)]">
          <div className="text-center space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">Lançar Comodato</p>
            <h1 className="text-3xl font-semibold text-white">Envio de comodatos via IXC</h1>
            <p className="text-sm text-slate-300">
              Use os itens importados do TXT. Prepare (consulta IXC) para resolver contrato/patrimônio e depois lance os selecionados.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-200">
              <p className="text-xs uppercase tracking-[0.2em] text-indigo-300">Arquivo</p>
              {parsed ? (
                <>
                  <p className="mt-1 font-semibold text-white">{parsedFiles.join(", ")}</p>
                  <p className="text-xs text-slate-400">
                    Itens: {parsed.items.length} · Pendentes: {parsed.pendentes.length}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-slate-400">Volte e importe um TXT no lançador.</p>
              )}
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
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-200">
              <p className="text-xs uppercase tracking-[0.2em] text-indigo-300">Ações</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handlePrepareAll}
                  disabled={!readyRows.length || busy}
                  className="h-10 rounded-lg border border-indigo-400/60 bg-indigo-600/80 px-3 text-sm font-semibold text-white transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-800"
                >
                  {busy ? "Processando..." : "Preparar (consultar IXC)"}
                </button>
                <button
                  type="button"
                  onClick={handleLaunch}
                  disabled={!selectedReady.length || busy}
                  className="h-10 rounded-lg border border-emerald-400/60 bg-emerald-600/80 px-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-800"
                >
                  {busy ? "Lançando..." : `Lançar selecionados (${selectedReady.length})`}
                </button>
                {busy ? (
                  <button
                    type="button"
                    onClick={() => {
                      cancelRef.current = true;
                    }}
                    className="h-10 rounded-lg border border-rose-500/60 bg-rose-600/80 px-3 text-sm font-semibold text-white transition hover:bg-rose-600"
                  >
                    Cancelar
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setSelected(new Set())}
                  className="h-10 rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm font-semibold text-slate-100 transition hover:border-indigo-400/50"
                >
                  Limpar seleção
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/comodato")}
                  className="h-10 rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm font-semibold text-slate-100 transition hover:border-indigo-400/50"
                >
                  Voltar para o Lançador
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-300">
                <button
                  type="button"
                  onClick={() => setSelected(new Set(readyRows.map((r) => rowKey(r)).filter((k) => prepared[k]?.status === "ready")))}
                  className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-indigo-400/50"
                >
                  Selecionar todos prontos ({readyRows.filter((r) => prepared[rowKey(r)]?.status === "ready").length})
                </button>
                <label className="flex items-center gap-2">
                  <span className="text-slate-300">Quantidade a lançar (opcional):</span>
                  <input
                    value={launchLimit}
                    onChange={(e) => setLaunchLimit(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="ex: 10"
                    className="h-9 w-24 rounded-md border border-slate-700 bg-slate-900 px-2 text-sm text-white outline-none"
                  />
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={dedupeByPppoe}
                    onChange={(e) => setDedupeByPppoe(e.target.checked)}
                  />
                  <span className="text-slate-300">Ignorar duplicados por PPPoE (recomendado)</span>
                </label>
                <p className="text-slate-400">Itens lançados ficam marcados como “Já possui comodato”.</p>
              </div>
              {batchFeedback ? (
                <div className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                  {batchFeedback}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="mx-auto mt-6 w-full max-w-[1600px] rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.8)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-indigo-300">Itens prontos</p>
              <h2 className="text-xl font-semibold text-white">Selecione e lance</h2>
            </div>
            <div className="text-sm text-slate-300">
              Selecionados prontos: <span className="font-semibold text-white">{selectedReady.length}</span> /{" "}
              {readyRows.length}
            </div>
          </div>

          <div className="mt-4 max-h-[640px] overflow-auto rounded-xl border border-slate-800">
            <table className="min-w-full divide-y divide-slate-800 text-sm">
              <thead className="bg-slate-900/70 text-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Sel.</th>
                  <th className="px-4 py-3 text-left font-semibold">PPPoE</th>
                  <th className="px-4 py-3 text-left font-semibold">Serial</th>
                  <th className="px-4 py-3 text-left font-semibold">Modelo</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Contrato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950/60 text-slate-100">
                {readyRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-4 text-center text-slate-400">
                      Nenhum item. Volte ao lançador e importe um TXT.
                    </td>
                  </tr>
                ) : null}
                {readyRows.map((item, idx) => {
                  const key = rowKey(item);
                  const prep = prepared[key];
                  const status = prep?.status ?? "todo";
                  const statusLabelMap: Record<Prepared["status"], string> = {
                    todo: "Não preparado",
                    ready: "Pronto para lançar",
                    has: "Já possui comodato",
                    warn: "Pendente de ajuste",
                    dead: "Bloqueado",
                    error: "Erro",
                  };
                  const statusClassMap: Record<Prepared["status"], string> = {
                    ready: "bg-emerald-500/15 text-emerald-100 border border-emerald-500/60",
                    has: "bg-blue-500/15 text-blue-100 border border-blue-500/60",
                    warn: "bg-amber-500/15 text-amber-100 border border-amber-500/60",
                    dead: "bg-rose-600/20 text-rose-100 border border-rose-500/70",
                    todo: "bg-slate-800 text-slate-200 border border-slate-700",
                    error: "bg-rose-500/15 text-rose-100 border border-rose-500/60",
                  };
                  const statusLabel = statusLabelMap[status];
                  const canSelect = status === "ready";
                  return (
                    <tr key={`${key}|${idx}`} className="hover:bg-slate-900/50">
                      <td className="px-4 py-3 align-top">
                        <input
                          type="checkbox"
                          disabled={!canSelect}
                          checked={selected.has(key) && canSelect}
                          onChange={() => toggleSelect(key)}
                        />
                      </td>
                      <td className="px-4 py-3 align-top font-semibold text-white">{item.pppoe}</td>
                      <td className="px-4 py-3 align-top text-slate-200">{item.serial ?? "-"}</td>
                      <td className="px-4 py-3 align-top text-slate-300">{item.modelo ?? "-"}</td>
                      <td className="px-4 py-3 align-top text-slate-200">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex w-fit rounded-full px-2 py-1 text-xs font-semibold ${statusClassMap[status]}`}
                          >
                            {statusLabel}
                          </span>
                          <span className="text-xs text-slate-400">{prep?.message}</span>
                          {prep?.launchMessage ? (
                            <span className="text-xs text-emerald-200">{prep.launchMessage}</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-slate-200">
                        {prep?.contratoId ? `#${prep.contratoId}` : prep?.status === "has" ? "Já lançado" : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      </main>
    </div>
  );
}
