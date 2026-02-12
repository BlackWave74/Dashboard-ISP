import type { ApiResult, ComodatoLaunchResult, ComodatoStatus } from "./types";

async function postIxc<T>(
  payload: Record<string, unknown>,
  options?: { idempotencyKey?: string; auditUser?: string }
): Promise<ApiResult<T>> {
  try {
    const key =
      options?.idempotencyKey ||
      (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Idempotency-Key": key,
    };
    if (options?.auditUser) {
      headers["X-Audit-User"] = options.auditUser;
    }

    const response = await fetch("/api/ixc/comodato", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const json = (await response.json()) as ApiResult<T>;

    if (!response.ok || json.ok === false) {
      return { ok: false, error: json.error ?? response.statusText };
    }

    return json;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao falar com a API IXC.";
    return { ok: false, error: message };
  }
}

export function consultarComodato(input: {
  pppoe: string;
  serial?: string;
  config?: Record<string, unknown>;
  auditUser?: string;
}): Promise<ApiResult<ComodatoStatus>> {
  return postIxc<ComodatoStatus>({
    action: "consultar",
    pppoe: input.pppoe,
    serial: input.serial,
    config: input.config,
  }, { auditUser: input.auditUser });
}

export function lancarComodato(input: {
  contratoId: string;
  numeroSerie: string;
  numeroPatrimonial?: string;
  descricao?: string;
  valorUnitario?: string;
  idPatrimonio?: string;
  mac?: string;
  qtde?: number;
  data?: string;
  config?: Record<string, unknown>;
  idempotencyKey?: string;
  auditUser?: string;
}): Promise<ApiResult<ComodatoLaunchResult>> {
  return postIxc<ComodatoLaunchResult>({
    action: "lancar",
    contratoId: input.contratoId,
    numeroSerie: input.numeroSerie,
    numeroPatrimonial: input.numeroPatrimonial,
    descricao: input.descricao,
    valorUnitario: input.valorUnitario,
    idPatrimonio: input.idPatrimonio,
    mac: input.mac,
    qtde: input.qtde,
    data: input.data,
    config: input.config,
  }, { idempotencyKey: input.idempotencyKey, auditUser: input.auditUser });
}
