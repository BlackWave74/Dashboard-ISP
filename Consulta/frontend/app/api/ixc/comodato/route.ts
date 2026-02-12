import { NextResponse } from "next/server";
import { appendFile, mkdir } from "fs/promises";
import { dirname, isAbsolute, join } from "path";
import { getClientIp, getRequestId } from "@/app/api/_utils/requestMeta";
import { rateLimit } from "@/app/api/_utils/rateLimit";

export const runtime = "nodejs";

type IxcConfig = {
  host: string;
  user: string;
  pass: string;
  cookie: string;
  timeoutMs: number;
  verifySsl: boolean;
  defaults: {
    idProduto: string;
    idUnidade: string;
    idAlmox: string;
    filialId: string;
    idClassTrib: string;
    unidadeSigla: string;
    fatorConversao: string;
    tipo: string;
    estoque: string;
    valorUnitario: number;
  };
};

type ContratoLookup = {
  id: string;
  contrato: Record<string, unknown>;
  radusuario: Record<string, unknown>;
};

type AuditEvent = {
  request_id: string;
  timestamp: string;
  user: string;
  action: "consultar" | "lancar";
  status: string;
  message: string;
  contratoId?: string;
  pppoe?: string;
  serial?: string;
  patrimonio?: string;
};

const TIMEOUT_MIN_MS = 1000;
const TIMEOUT_MAX_MS = 60000;
const TIMEOUT_DEFAULT_MS = 8000;
const resolveAuditLogPath = () => {
  const configured = process.env.COMODATO_AUDIT_LOG_PATH?.trim();
  if (configured) {
    return isAbsolute(configured) ? configured : join(process.cwd(), configured);
  }
  if (process.env.VERCEL === "1" || process.env.VERCEL === "true") {
    return "/tmp/comodato_auditoria.log";
  }
  return join(process.cwd(), "logs", "comodato_auditoria.log");
};

const AUDIT_LOG_PATH = resolveAuditLogPath();

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const boolEnv = (value: string | undefined, fallback = true) => {
  if (value === undefined) return fallback;
  const v = value.toLowerCase();
  return v !== "0" && v !== "false" && v !== "no";
};

const parseTimeoutMs = (overrideTimeoutMs?: number) => {
  const normalize = (n: number) => clamp(Math.round(n), TIMEOUT_MIN_MS, TIMEOUT_MAX_MS);

  if (Number.isFinite(overrideTimeoutMs) && (overrideTimeoutMs ?? 0) > 0) {
    return { timeoutMs: normalize(Number(overrideTimeoutMs)), source: "override.timeoutMs" };
  }

  const fromMs = process.env.IXC_TIMEOUT_MS;
  if (fromMs) {
    const n = Number.parseInt(fromMs, 10);
    if (Number.isFinite(n) && n > 0) {
      return { timeoutMs: normalize(n), source: "env.IXC_TIMEOUT_MS" };
    }
  }

  const fromSec = process.env.IXC_TIMEOUT;
  if (fromSec) {
    const sec = Number.parseFloat(fromSec);
    if (Number.isFinite(sec) && sec > 0) {
      return { timeoutMs: normalize(sec * 1000), source: "env.IXC_TIMEOUT(seconds)" };
    }
  }

  return { timeoutMs: TIMEOUT_DEFAULT_MS, source: "default" };
};

async function writeAudit(event: AuditEvent) {
  try {
    await mkdir(dirname(AUDIT_LOG_PATH), { recursive: true });
    await appendFile(AUDIT_LOG_PATH, `${JSON.stringify(event)}\n`, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[comodato_auditoria] falha ao persistir log: ${message}`);
  }
}

const loadConfig = (override?: Partial<IxcConfig>): IxcConfig => {
  const host = override?.host?.trim() || process.env.IXC_HOST?.trim();
  const user = override?.user?.trim() || process.env.IXC_USER?.trim();
  const pass = override?.pass?.trim() || process.env.IXC_PASS?.trim();

  if (!host || !user || !pass) {
    throw new Error("Configure IXC_HOST, IXC_USER e IXC_PASS no .env.local ou envie no body.config.");
  }

  const verifySsl = override?.verifySsl ?? boolEnv(process.env.IXC_VERIFY_SSL, true);
  if (!verifySsl && process.env.NODE_ENV === "production") {
    throw new Error("IXC_VERIFY_SSL=false não é permitido em produção.");
  }
  if (!verifySsl && process.env.NODE_ENV !== "production") {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }

  const timeout = parseTimeoutMs(override?.timeoutMs);
  console.info(`[ixc] timeout_ms=${timeout.timeoutMs} source=${timeout.source}`);

  return {
    host: host.replace(/\/$/, ""),
    user,
    pass,
    cookie: override?.cookie ?? process.env.IXC_COOKIE ?? "",
    timeoutMs: timeout.timeoutMs,
    verifySsl,
    defaults: {
      idProduto: override?.defaults?.idProduto ?? (process.env.IXC_ID_PRODUTO ?? "1128").trim(),
      idUnidade: override?.defaults?.idUnidade ?? (process.env.IXC_ID_UNIDADE ?? "1").trim(),
      idAlmox: override?.defaults?.idAlmox ?? (process.env.IXC_ID_ALMOX ?? "39").trim(),
      filialId: override?.defaults?.filialId ?? (process.env.IXC_FILIAL_ID ?? "1").trim(),
      idClassTrib: override?.defaults?.idClassTrib ?? (process.env.IXC_ID_CLASS_TRIB ?? "1").trim(),
      unidadeSigla: override?.defaults?.unidadeSigla ?? (process.env.IXC_UNIDADE_SIGLA ?? "MC").trim(),
      fatorConversao:
        override?.defaults?.fatorConversao ?? (process.env.IXC_FATOR_CONVERSAO ?? "1.000000000").trim(),
      tipo: override?.defaults?.tipo ?? (process.env.IXC_TIPO ?? "S").trim(),
      estoque: override?.defaults?.estoque ?? (process.env.IXC_ESTOQUE ?? "S").trim(),
      valorUnitario:
        override?.defaults?.valorUnitario ?? Number.parseFloat(process.env.IXC_VALOR_UNITARIO ?? "0.10"),
    },
  };
};

const buildHeaders = (config: IxcConfig, ixcsoft: string) => {
  const token = Buffer.from(`${config.user}:${config.pass}`).toString("base64");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Basic ${token}`,
    ixcsoft,
  };

  if (config.cookie) {
    headers.Cookie = config.cookie;
  }

  return headers;
};

async function requestIxc(
  endpoint: string,
  payload: Record<string, unknown>,
  config: IxcConfig,
  ixcsoft: string
) {
  const url = `${config.host}/${endpoint.replace(/^\//, "")}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: buildHeaders(config, ixcsoft),
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text();

  let data: Record<string, unknown> = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    throw new Error(`IXC respondeu ${response.status}: ${response.statusText}`);
  }

  return data;
}

async function listarUm(
  endpoint: string,
  qtype: string,
  query: string,
  config: IxcConfig,
  sortname?: string
) {
  const payload = {
    qtype,
    query,
    oper: "=",
    page: "1",
    rp: "1",
    sortname: sortname ?? qtype,
    sortorder: "desc",
  };
  const data = await requestIxc(endpoint, payload, config, "listar");
  const registros = (data as { registros?: Record<string, unknown>[] })?.registros ?? [];
  return registros[0] ?? null;
}

const radLookups = [
  "radusuarios.login",
  "login",
  "radusuarios.usuario",
  "radusuarios.user",
];

async function buscarContratoPorPppoe(pppoe: string, config: IxcConfig): Promise<ContratoLookup | null> {
  let rad = null;
  for (const qtype of radLookups) {
    rad = await listarUm("radusuarios", qtype, pppoe, config, "radusuarios.id");
    if (rad) break;
  }
  if (!rad) return null;

  const contratoId =
    rad.id_contrato ||
    rad.id_cliente_contrato ||
    rad.id_contrato_cliente ||
    rad.contrato_id ||
    rad.id_contrato_id;

  const clienteId = rad.id_cliente || rad.cliente_id;

  let contrato = null;
  if (contratoId) {
    contrato = await listarUm(
      "cliente_contrato",
      "cliente_contrato.id",
      String(contratoId),
      config,
      "cliente_contrato.id"
    );
  }

  if (!contrato && clienteId) {
    contrato = await listarUm(
      "cliente_contrato",
      "cliente_contrato.id_cliente",
      String(clienteId),
      config,
      "cliente_contrato.id"
    );
  }

  if (!contrato) return null;

  return {
    id: String((contrato as { id?: unknown }).id ?? contratoId),
    contrato,
    radusuario: rad,
  };
}

async function listarComodatosPorContrato(contratoId: string, config: IxcConfig) {
  const payload = {
    qtype: "id_contrato",
    query: contratoId,
    oper: "=",
    page: "1",
    rp: "1000",
    sortname: "movimento_produtos.id",
    sortorder: "desc",
    grid_param: '[{"TB":"movimento_produtos.status_comodato","OP":"=","P":"E"}]',
  };

  const data = await requestIxc("cliente_contrato_comodato", payload, config, "listar");
  return (data as { registros?: Record<string, unknown>[] })?.registros ?? [];
}

const patrimonioQueries = [
  "patrimonio.serial_fornecedor",
  "patrimonio.numero_serie",
  "serial_fornecedor",
  "numero_serie",
];

async function listarPatrimonioPorSerial(serial: string, config: IxcConfig) {
  for (const qtype of patrimonioQueries) {
    const payload = {
      qtype,
      query: serial,
      oper: "=",
      page: "1",
      rp: "1",
      sortname: "patrimonio.id",
      sortorder: "desc",
    };
    const data = await requestIxc("patrimonio", payload, config, "listar");
    const registros = (data as { registros?: Record<string, unknown>[] })?.registros ?? [];
    if (registros[0]) return registros[0];
  }
  return null;
}

function findExistingComodato(
  comodatos: Record<string, unknown>[],
  input: { serial: string; patrimonioId?: string; numeroPatrimonial?: string }
) {
  const serial = input.serial.trim().toLowerCase();
  const patrimonioId = (input.patrimonioId || "").trim();
  const numeroPatrimonial = (input.numeroPatrimonial || "").trim().toLowerCase();

  return comodatos.find((comodato) => {
    const serialMatch =
      String(comodato.numero_serie ?? "").trim().toLowerCase() === serial ||
      String(comodato.serial ?? "").trim().toLowerCase() === serial;
    if (serialMatch) return true;

    if (patrimonioId) {
      const patrimonioMatch =
        String(comodato.id_patrimonio ?? "").trim() === patrimonioId ||
        String(comodato.patrimonio_id ?? "").trim() === patrimonioId;
      if (patrimonioMatch) return true;
    }

    if (numeroPatrimonial) {
      const patrimonialMatch =
        String(comodato.numero_patrimonial ?? "").trim().toLowerCase() === numeroPatrimonial ||
        String(comodato.n_patrimonial ?? "").trim().toLowerCase() === numeroPatrimonial;
      if (patrimonialMatch) return true;
    }

    return false;
  });
}

const formatDate = (date = new Date()) => {
  const pad = (v: number) => v.toString().padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
};

type LancarPayload = {
  contratoId: string;
  numeroSerie: string;
  numeroPatrimonial?: string;
  descricao?: string;
  valorUnitario?: string | number;
  idPatrimonio?: string;
  mac?: string;
  qtde?: number;
  data?: string;
  idEquipamentoTv?: string;
  tipoProduto?: string;
};

async function lancarComodato(input: LancarPayload, config: IxcConfig) {
  const {
    contratoId,
    numeroSerie,
    numeroPatrimonial,
    descricao,
    valorUnitario,
    idPatrimonio,
    mac,
    qtde,
    data,
    idEquipamentoTv,
    tipoProduto,
  } = input;

  let patrimonio = null;
  if (idPatrimonio) {
    patrimonio = { id: idPatrimonio, numero_patrimonial: numeroPatrimonial ?? "" };
  } else {
    patrimonio = await listarPatrimonioPorSerial(numeroSerie, config);
  }

  if (!patrimonio || !("id" in patrimonio)) {
    throw new Error("Patrimônio não encontrado para o serial informado.");
  }

  const numeroPat = (numeroPatrimonial ?? patrimonio.numero_patrimonial ?? patrimonio.n_patrimonial ?? numeroSerie).toString();
  const qt = Math.max(1, Number.parseInt(String(qtde ?? 1), 10));
  const valorUnit =
    Number.parseFloat(typeof valorUnitario === "string" ? valorUnitario.replace(",", ".") : (valorUnitario ?? config.defaults.valorUnitario).toString()) ||
    config.defaults.valorUnitario;
  const valorTotal = valorUnit * qt;

  const payload = {
    id_patrimonio: String((patrimonio as { id: unknown }).id),
    id_produto: config.defaults.idProduto,
    mac: mac ?? "",
    numero_serie: numeroSerie,
    numero_patrimonial: numeroPat,
    descricao: descricao ?? (patrimonio as { descricao?: string }).descricao ?? "Equipamento em comodato",
    data: data ?? formatDate(),
    id_unidade: config.defaults.idUnidade,
    id_almox: config.defaults.idAlmox,
    filial_id: config.defaults.filialId,
    qtde_saida: String(qt),
    valor_unitario: valorUnit.toFixed(2),
    valor_total: valorTotal.toFixed(2),
    status_comodato: "E",
    id_classificacao_tributaria: config.defaults.idClassTrib,
    tipo: config.defaults.tipo,
    estoque: config.defaults.estoque,
    unidade_sigla: config.defaults.unidadeSigla,
    fator_conversao: config.defaults.fatorConversao,
    id_contrato: contratoId,
    id_equipamento_tv: idEquipamentoTv ?? "",
    tipo_produto: tipoProduto ?? "",
  };

  const ativosNoContrato = await listarComodatosPorContrato(contratoId, config);
  const existente = findExistingComodato(ativosNoContrato, {
    serial: numeroSerie,
    patrimonioId: String((patrimonio as { id: unknown }).id),
    numeroPatrimonial: numeroPat,
  });

  if (existente) {
    return {
      status: "already_exists" as const,
      apiResponse: { message: "Comodato já existe para contrato/serial/patrimônio.", existente },
      payload,
      patrimonio,
    };
  }

  const apiResponse = await requestIxc("cliente_contrato_comodato", payload, config, "inserir");
  return { status: "inserted" as const, apiResponse, payload, patrimonio };
}

export async function POST(request: Request) {
  const reqId = getRequestId(request.headers);
  const ip = getClientIp(request.headers);
  const auditUser = request.headers.get("x-audit-user")?.trim() || "unknown";
  const timestamp = new Date().toISOString();
  const rl = rateLimit(`${request.method}:${ip}:${new URL(request.url).pathname}`);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: "rate_limited", request_id: reqId },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(rl.retryAfter / 1000)),
          "X-Request-Id": reqId,
        },
      }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Payload inválido.", request_id: reqId },
      { status: 400, headers: { "X-Request-Id": reqId } }
    );
  }

  const action = (body.action as string | undefined)?.toLowerCase();
  const configOverride = (body.config as Partial<IxcConfig> | undefined) ?? undefined;

  try {
    const config = loadConfig(configOverride);

    if (action === "consultar") {
      const pppoe = (body.pppoe as string | undefined)?.trim();
      const serial = (body.serial as string | undefined)?.trim();
      if (!pppoe) {
        return NextResponse.json(
          { ok: false, error: "Informe o PPPoE para consultar.", request_id: reqId },
          { status: 400, headers: { "X-Request-Id": reqId } }
        );
      }

      const contrato = await buscarContratoPorPppoe(pppoe, config);
      if (!contrato) {
        return NextResponse.json(
          { ok: false, error: "Contrato não encontrado no IXC para o PPPoE informado.", request_id: reqId },
          { status: 404, headers: { "X-Request-Id": reqId } }
        );
      }

      const comodatos = await listarComodatosPorContrato(contrato.id, config);
      const patrimonio = serial ? await listarPatrimonioPorSerial(serial, config) : null;

      const messages = [
        `Contrato #${contrato.id} carregado.`,
        comodatos.length ? `${comodatos.length} comodato(s) ativos.` : "Sem comodato ativo para este contrato.",
      ];

      await writeAudit({
        request_id: reqId,
        timestamp,
        user: auditUser,
        action: "consultar",
        status: "ok",
        message: messages.join(" "),
        contratoId: contrato.id,
        pppoe,
        serial,
        patrimonio: patrimonio ? String((patrimonio as { id?: unknown }).id ?? "") : "",
      });

      return NextResponse.json(
        {
          ok: true,
          data: {
            contratoId: contrato.id,
            contrato: contrato.contrato,
            radusuario: contrato.radusuario,
            comodatos,
            patrimonio,
            messages,
          },
          request_id: reqId,
        },
        { headers: { "X-Request-Id": reqId } }
      );
    }

    if (action === "lancar") {
      const IDEM_TTL = Number(process.env.IDEMPOTENCY_TTL_MS ?? "60000");
      const idemStore =
        (globalThis as unknown as { __idem?: Map<string, { ts: number; payload: unknown }> }).__idem ??
        new Map<string, { ts: number; payload: unknown }>();
      (globalThis as unknown as { __idem?: Map<string, { ts: number; payload: unknown }> }).__idem = idemStore;

      const idemKey = request.headers.get("idempotency-key")?.trim() || "";
      if (idemKey) {
        const hit = idemStore.get(idemKey);
        if (hit && Date.now() - hit.ts < IDEM_TTL) {
          return NextResponse.json(hit.payload, { headers: { "X-Request-Id": reqId } });
        }
      }

      const contratoId = (body.contratoId as string | undefined)?.trim();
      const numeroSerie = (body.numeroSerie as string | undefined)?.trim() || (body.serial as string | undefined)?.trim();

      if (!contratoId || !numeroSerie) {
        return NextResponse.json(
          { ok: false, error: "Informe contratoId e numeroSerie para lançar o comodato.", request_id: reqId },
          { status: 400, headers: { "X-Request-Id": reqId } }
        );
      }

      const result = await lancarComodato(
        {
          contratoId,
          numeroSerie,
          numeroPatrimonial: (body.numeroPatrimonial as string | undefined)?.trim(),
          descricao: (body.descricao as string | undefined)?.trim(),
          valorUnitario: body.valorUnitario as string | number | undefined,
          idPatrimonio: (body.idPatrimonio as string | undefined)?.trim(),
          mac: (body.mac as string | undefined)?.trim(),
          qtde: Number.parseInt(String(body.qtde ?? body.qtde_saida ?? 1), 10) || 1,
          data: (body.data as string | undefined)?.trim(),
          idEquipamentoTv: (body.idEquipamentoTv as string | undefined)?.trim(),
          tipoProduto: (body.tipoProduto as string | undefined)?.trim(),
        },
        config
      );

      const responseBody = {
        ok: true,
        data: {
          status: result.status,
          contratoId,
          numeroSerie,
          payloadEnviado: result.payload,
          patrimonioUsado: result.patrimonio,
          respostaIXC: result.apiResponse,
        },
        request_id: reqId,
      };

      await writeAudit({
        request_id: reqId,
        timestamp,
        user: auditUser,
        action: "lancar",
        status: result.status === "already_exists" ? "already_exists" : "inserted",
        message:
          result.status === "already_exists"
            ? "Comodato já existente; insert ignorado."
            : "Comodato inserido no IXC.",
        contratoId,
        pppoe: (body.pppoe as string | undefined)?.trim(),
        serial: numeroSerie,
        patrimonio: String((result.patrimonio as { id?: unknown }).id ?? ""),
      });

      if (idemKey) {
        idemStore.set(idemKey, { ts: Date.now(), payload: responseBody });
      }
      return NextResponse.json(responseBody, { headers: { "X-Request-Id": reqId } });
    }

    return NextResponse.json(
      { ok: false, error: "Ação não suportada.", request_id: reqId },
      { status: 400, headers: { "X-Request-Id": reqId } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado ao acessar o IXC.";
    await writeAudit({
      request_id: reqId,
      timestamp,
      user: auditUser,
      action: action === "consultar" ? "consultar" : "lancar",
      status: "error",
      message,
      contratoId: (body?.contratoId as string | undefined)?.trim(),
      pppoe: (body?.pppoe as string | undefined)?.trim(),
      serial: ((body?.numeroSerie as string | undefined) || (body?.serial as string | undefined) || "").trim(),
      patrimonio: (body?.idPatrimonio as string | undefined)?.trim(),
    });
    return NextResponse.json(
      { ok: false, error: message, request_id: reqId },
      { status: 500, headers: { "X-Request-Id": reqId } }
    );
  }
}
