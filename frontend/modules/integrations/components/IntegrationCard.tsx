"use client";

import { IntegrationWithState } from "@/modules/integrations/types/integration";

type IntegrationCardProps = {
  integration: IntegrationWithState;
  onSelect: (integration: IntegrationWithState) => void;
  canManage?: boolean;
};

const statusStyles: Record<
  IntegrationWithState["status"],
  { label: string; className: string }
> = {
  DISPONIVEL: {
    label: "Disponível",
    className: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
  },
  EM_BREVE: {
    label: "Em breve",
    className: "bg-amber-500/10 text-amber-200 border border-amber-500/20",
  },
  CONECTADO: {
    label: "Conectado",
    className: "bg-indigo-500/15 text-indigo-200 border border-indigo-500/30",
  },
};

export function IntegrationCard({
  integration,
  onSelect,
  canManage = true,
}: IntegrationCardProps) {
  const status = statusStyles[integration.status];
  const connectedName = integration.activeProfile || integration.config?.profileName?.trim();
  const isDisabled = integration.status === "EM_BREVE";
  const helperText = !canManage
    ? "Somente administradores podem conectar ou desconectar."
    : integration.status === "CONECTADO"
      ? connectedName
        ? `Conectado em ${connectedName}.`
        : "Configuração ativa."
      : integration.status === "EM_BREVE"
        ? "Fique ligado!"
        : "Conecte para começar.";

  const actionLabel =
    !canManage && integration.status !== "CONECTADO"
      ? "Ver detalhes"
      : integration.status === "CONECTADO"
        ? "Gerenciar"
        : integration.status === "DISPONIVEL"
          ? "Conectar"
          : "Em breve";

  return (
    <div className="group relative flex flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:-translate-y-0.5 hover:border-indigo-400/40 hover:shadow-[0_20px_50px_-30px_rgba(0,0,0,0.8)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-white">{integration.name}</h3>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}
        >
          {integration.status === "CONECTADO" && connectedName ? `Conectado: ${connectedName}` : status.label}
        </span>
      </div>
      <p className="flex-1 text-sm text-slate-400">{integration.description}</p>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="text-xs text-slate-500">{helperText}</div>
        <button
          onClick={() => onSelect(integration)}
          disabled={isDisabled}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
            isDisabled
              ? "cursor-not-allowed bg-slate-800 text-slate-500"
              : canManage
                ? "bg-white text-slate-900 hover:bg-indigo-200"
                : "border border-slate-800 bg-slate-900/70 text-slate-200 hover:border-slate-700"
          }`}
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
