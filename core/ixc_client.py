# -*- coding: utf-8 -*-
"""
ixc_client.py - Cliente mínimo para IXC (REST /webservice/v1)

Funções expostas (compatíveis com o app PySide6):
- buscar_contrato_por_pppoe(pppoe) -> dict|None
- listar_patrimonio_por_serial(serial) -> dict|None
- listar_comodato_por_serial(numero_serie) -> dict|None
- lancar_comodato(contrato_id, numero_serie, descricao, valor_unitario=None) -> dict

Obs.:
- Autenticação por Basic (IXC_USER:IXC_PASS).
- Header 'ixcsoft' controla a operação (listar, inserir, editar, deletar).
- Endpoints: cliente_contrato, cliente_contrato_comodato, radusuarios, patrimonio.

Ajustes:
- Pool HTTP + keep-alive + retry com backoff em _get_session (sem mudar payloads/rotas).
- Cache LRU em leituras (rad, contrato, patrimônio, comodato e busca por PPPoE).
  Não altera a consulta nem o envio/recebimento - apenas evita chamadas repetidas no mesmo processo.
"""

from __future__ import annotations

import base64
import datetime
import json
import os
import sys
import threading
from functools import lru_cache
from typing import Any, Dict, Optional

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

_thread_local = threading.local()

# =============================================================================
# Config
# =============================================================================

DEFAULT_IXC_HOST = "https://ixc.example.com/webservice/v1"
DEFAULT_IXC_USER = ""
DEFAULT_IXC_PASS = ""

def _bool_env(var: str, default: str = "1") -> bool:
    return os.getenv(var, default).lower() not in {"0", "false", "False"}

# valores iniciais (podem ser recarregados via reload_env)
IXC_HOST: str = os.getenv("IXC_HOST", DEFAULT_IXC_HOST)
IXC_USER: str = os.getenv("IXC_USER", DEFAULT_IXC_USER)
IXC_PASS: str = os.getenv("IXC_PASS", DEFAULT_IXC_PASS)
IXC_COOKIE: str = os.getenv("IXC_COOKIE", "")
IXC_TIMEOUT: int = int(os.getenv("IXC_TIMEOUT", "8"))  # menor timeout padrão
IXC_VERIFY_SSL: bool = _bool_env("IXC_VERIFY_SSL", "1")

# Regras/constantes exigidas pelo endpoint (padrões podem ser sobrescritos por env)
IXC_ID_PRODUTO: str = os.getenv("IXC_ID_PRODUTO", "1128")
IXC_ID_UNIDADE: str = os.getenv("IXC_ID_UNIDADE", "1")
IXC_ID_ALMOX: str = os.getenv("IXC_ID_ALMOX", "39")
IXC_FILIAL_ID: str = os.getenv("IXC_FILIAL_ID", "1")
IXC_ID_CLASS_TRIB: str = os.getenv("IXC_ID_CLASS_TRIB", "1")
IXC_UNIDADE_SIGLA: str = os.getenv("IXC_UNIDADE_SIGLA", "MC")
IXC_TIPO: str = os.getenv("IXC_TIPO", "S")  # "S"
IXC_ESTOQUE: str = os.getenv("IXC_ESTOQUE", "S")  # "S"
IXC_FATOR_CONVERSAO: str = os.getenv("IXC_FATOR_CONVERSAO", "1.000000000")
IXC_VALOR_UNIT_DEFAULT: float = float(os.getenv("IXC_VALOR_UNITARIO", "0.10"))

def reload_env() -> None:
    """
    Atualiza variáveis globais a partir do ambiente. Útil ao carregar .env em runtime.
    """
    global IXC_HOST, IXC_USER, IXC_PASS, IXC_COOKIE, IXC_TIMEOUT, IXC_VERIFY_SSL
    global IXC_ID_PRODUTO, IXC_ID_UNIDADE, IXC_ID_ALMOX, IXC_FILIAL_ID, IXC_ID_CLASS_TRIB
    global IXC_UNIDADE_SIGLA, IXC_TIPO, IXC_ESTOQUE, IXC_FATOR_CONVERSAO, IXC_VALOR_UNIT_DEFAULT

    IXC_HOST = os.getenv("IXC_HOST", IXC_HOST or DEFAULT_IXC_HOST)
    IXC_USER = os.getenv("IXC_USER", IXC_USER or DEFAULT_IXC_USER)
    IXC_PASS = os.getenv("IXC_PASS", IXC_PASS or DEFAULT_IXC_PASS)
    IXC_COOKIE = os.getenv("IXC_COOKIE", IXC_COOKIE or "")
    IXC_TIMEOUT = int(os.getenv("IXC_TIMEOUT", str(IXC_TIMEOUT)))
    IXC_VERIFY_SSL = _bool_env("IXC_VERIFY_SSL", "1" if IXC_VERIFY_SSL else "0")

    IXC_ID_PRODUTO = os.getenv("IXC_ID_PRODUTO", IXC_ID_PRODUTO)
    IXC_ID_UNIDADE = os.getenv("IXC_ID_UNIDADE", IXC_ID_UNIDADE)
    IXC_ID_ALMOX = os.getenv("IXC_ID_ALMOX", IXC_ID_ALMOX)
    IXC_FILIAL_ID = os.getenv("IXC_FILIAL_ID", IXC_FILIAL_ID)
    IXC_ID_CLASS_TRIB = os.getenv("IXC_ID_CLASS_TRIB", IXC_ID_CLASS_TRIB)
    IXC_UNIDADE_SIGLA = os.getenv("IXC_UNIDADE_SIGLA", IXC_UNIDADE_SIGLA)
    IXC_TIPO = os.getenv("IXC_TIPO", IXC_TIPO)
    IXC_ESTOQUE = os.getenv("IXC_ESTOQUE", IXC_ESTOQUE)
    IXC_FATOR_CONVERSAO = os.getenv("IXC_FATOR_CONVERSAO", IXC_FATOR_CONVERSAO)
    IXC_VALOR_UNIT_DEFAULT = float(os.getenv("IXC_VALOR_UNITARIO", str(IXC_VALOR_UNIT_DEFAULT)))

    # Força nova sessão HTTP caso as flags mudem
    try:
        delattr(_thread_local, "session")
    except Exception:
        pass

# =============================================================================
# HTTP helpers
# =============================================================================

def _get_session() -> requests.Session:
    """
    Cria/recupera sessão por thread com:
      - Connection: keep-alive
      - Pool (10/20)
      - Retry com backoff para 429/5xx
    Não altera a forma de envio/recebimento (payloads/rotas).
    """
    s = getattr(_thread_local, "session", None)
    if s is None:
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        s.verify = IXC_VERIFY_SSL

        retry = Retry(
            total=1,           # menos tentativas para falhar mais rápido
            backoff_factor=0.2,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods={"POST"},
            raise_on_status=False,
            respect_retry_after_header=True,
        )
        adapter = HTTPAdapter(pool_connections=10, pool_maxsize=20, max_retries=retry)
        s.mount("https://", adapter)
        s.mount("http://", adapter)
        s.headers["Connection"] = "keep-alive"

        _thread_local.session = s
    return s

# =============================================================================
# Helpers HTTP
# =============================================================================

def _auth_header(user: str, password: str) -> str:
    token = base64.b64encode(f"{user}:{password}".encode()).decode()
    return f"Basic {token}"


def _headers(ixcsoft: str = "listar") -> Dict[str, str]:
    h = {
        "Authorization": _auth_header(IXC_USER, IXC_PASS),
        "ixcsoft": ixcsoft,
    }
    if IXC_COOKIE:
        h["Cookie"] = IXC_COOKIE
    return h


def _request(
    endpoint: str,
    payload: Dict[str, Any],
    ixcsoft: str = "listar",
    timeout: Optional[int] = None,
) -> Dict[str, Any]:
    """
    POST genérico no /webservice/v1, retorna JSON (ou {"_raw": ...} em falha de parse).
    Mantido envio via data=json.dumps(payload) para não alterar comportamento.
    """
    url = f"{IXC_HOST.rstrip('/')}/{endpoint.lstrip('/')}"
    sess = _get_session()
    try:
        resp = sess.post(
            url,
            headers=_headers(ixcsoft),
            data=json.dumps(payload),
            timeout=(timeout or IXC_TIMEOUT),
        )
        resp.raise_for_status()
    except requests.RequestException as exc:
        print(f"[IXC] HTTP erro em {url}: {exc}", file=sys.stderr)
        raise
    try:
        return resp.json()
    except Exception:
        # Retorna bruto, mas loga para facilitar diagnóstico de HTML/proxy
        print(f"[IXC] Falha ao decodificar JSON ({resp.status_code}) para {url}.", file=sys.stderr)
        return {"_raw": resp.text}


def _listar_um(
    endpoint: str,
    qtype: str,
    query: str,
    oper: str = "=",
    sortname: Optional[str] = None,
    sortorder: str = "desc",
) -> Optional[Dict[str, Any]]:
    """Consulta com rp=1 e retorna o primeiro registro (ou None)."""
    payload = {
        "qtype": qtype,
        "query": query,
        "oper": oper,
        "page": "1",
        "rp": "1",
        "sortname": sortname or qtype,
        "sortorder": sortorder,
    }
    data = _request(endpoint, payload, ixcsoft="listar")
    regs = (data or {}).get("registros") or []
    return regs[0] if regs else None

# =============================================================================
# Regras de domínio (com cache LRU - somente leitura)
# =============================================================================

@lru_cache(maxsize=2048)
def get_contrato_por_id(contrato_id: int | str) -> Optional[Dict[str, Any]]:
    return _listar_um(
        "cliente_contrato",
        "cliente_contrato.id",
        str(contrato_id),
        "=",
        sortname="cliente_contrato.id",
        sortorder="desc",
    )


@lru_cache(maxsize=4096)
def _get_radusuario(pppoe: str) -> Optional[Dict[str, Any]]:
    """Localiza radusuarios por login; fallback para usuario. (cache LRU)"""
    p = str(pppoe).strip()
    reg = _listar_um(
        "radusuarios", "radusuarios.login", p, "=", sortname="radusuarios.id", sortorder="desc"
    )
    if reg:
        return reg
    reg = _listar_um(
        "radusuarios", "login", p, "=", sortname="radusuarios.id", sortorder="desc"
    )
    if reg:
        return reg
    return _listar_um(
        "radusuarios", "radusuarios.usuario", p, "=", sortname="radusuarios.id", sortorder="desc"
    )


@lru_cache(maxsize=4096)
def listar_patrimonio_por_serial(serial: str) -> Optional[Dict[str, Any]]:
    """
    Busca patrimônio por serial. Alguns ambientes usam 'serial_fornecedor',
    outros 'numero_serie'. Tentamos ambos. (cache LRU)
    """
    s = (serial or "").strip()
    if not s:
        return None

    qtypes = (
        "patrimonio.serial_fornecedor",
        "patrimonio.numero_serie",
        "serial_fornecedor",
        "numero_serie",
    )
    for q in qtypes:
        payload = {
            "qtype": q,
            "query": s,
            "oper": "=",
            "page": "1",
            "rp": "1",
            "sortname": "patrimonio.id",
            "sortorder": "desc",
        }
        data = _request("patrimonio", payload, ixcsoft="listar")
        regs = (data or {}).get("registros") or []
        if regs:
            return regs[0]
    return None


@lru_cache(maxsize=4096)
def listar_comodato_por_serial(numero_serie: str) -> Optional[Dict[str, Any]]:
    """
    Retorna comodato vinculado ao numero de serie (primeiro encontrado).
    Se vazio, tenta via id_patrimonio. (cache LRU)
    """
    ns = (numero_serie or "").strip()
    if not ns:
        return None

    payload = {
        "qtype": "cliente_contrato_comodato.numero_serie",
        "query": ns,
        "oper": "=",
        "page": "1",
        "rp": "1",
        "sortname": "cliente_contrato_comodato.id",
        "sortorder": "desc",
    }
    data = _request("cliente_contrato_comodato", payload, ixcsoft="listar")
    regs = (data or {}).get("registros") or []
    if regs:
        return regs[0]

    pat = listar_patrimonio_por_serial(ns)
    pat_id = str(pat.get("id")) if pat else ""
    if pat_id:
        payload = {
            "qtype": "cliente_contrato_comodato.id_patrimonio",
            "query": pat_id,
            "oper": "=",
            "page": "1",
            "rp": "1",
            "sortname": "cliente_contrato_comodato.id",
            "sortorder": "desc",
        }
        data = _request("cliente_contrato_comodato", payload, ixcsoft="listar")
        regs = (data or {}).get("registros") or []
        if regs:
            return regs[0]

    return None


@lru_cache(maxsize=2048)
def listar_comodato_por_contrato(contrato_id: str | int) -> list[dict]:
    """
    Lista comodatos do contrato com status_comodato = 'E'.
    """
    cid = str(contrato_id)
    payload = {
        "qtype": "id_contrato",  # aderente ao exemplo oficial
        "query": cid,
        "oper": "=",
        "page": "1",
        "rp": "1000",
        "sortname": "movimento_produtos.id",
        "sortorder": "desc",
        # filtro conforme payload de referência (movimento_produtos.status_comodato = E)
        "grid_param": '[{"TB":"movimento_produtos.status_comodato","OP":"=","P":"E"}]',
    }
    data = _request("cliente_contrato_comodato", payload, ixcsoft="listar")
    return (data or {}).get("registros") or []


@lru_cache(maxsize=4096)
def buscar_contrato_por_pppoe(pppoe: str) -> Optional[Dict[str, Any]]:
    """
    Retorna dados essenciais do contrato do PPPoE:
      - id, status, data_ativacao
      - comodato_info (se houver)
      - string 'comodato' formatada
    (cache LRU)
    """
    rad = _get_radusuario(pppoe)
    if not rad:
        return None

    contrato_id = (
        rad.get("id_contrato")
        or rad.get("id_cliente_contrato")
        or rad.get("id_contrato_cliente")
    )

    if not contrato_id:
        cliente_id = rad.get("id_cliente") or rad.get("cliente_id")
        contrato = (
            _listar_um("cliente_contrato", "cliente_contrato.id_cliente", str(cliente_id))
            if cliente_id
            else None
        )
    else:
        contrato = get_contrato_por_id(contrato_id)

    if not contrato:
        return None

    contrato_id = contrato.get("id")

    payload_comodato = {
        "qtype": "id_contrato",
        "query": str(contrato_id),
        "oper": "=",
        "page": "1",
        "rp": "1000",
        "sortname": "movimento_produtos.id",
        "sortorder": "desc",
        "grid_param": '[{"TB":"movimento_produtos.status_comodato","OP":"=","P":"E"}]',
    }
    data = _request("cliente_contrato_comodato", payload_comodato, ixcsoft="listar")
    registros = (data or {}).get("registros") or []

    comodato_info = None
    if registros:
        r = registros[0]
        comodato_info = {
            "descricao": r.get("descricao") or "N/A",
            "numero_serie": r.get("numero_serie") or "N/A",
            "numero_patrimonial": r.get("numero_patrimonial") or "N/A",
            "data": r.get("data") or "N/A",
            "valor_unitario": r.get("valor_unitario") or "N/A",
        }

    if comodato_info:
        comodato_fmt = (
            f"Modelo: {comodato_info['descricao']}\n"
            f"Serial: {comodato_info['numero_serie']}\n"
            f"Patrimônio: {comodato_info['numero_patrimonial']}\n"
            f"Data de Saída: {comodato_info['data']}\n"
            f"Valor Unitário: {comodato_info['valor_unitario']}"
        )
    else:
        comodato_fmt = "Sem comodato vinculado."

    return {
        "id": contrato_id,
        "status": contrato.get("status"),
        "data_ativacao": contrato.get("data_ativacao"),
        "comodato": comodato_fmt,
        "comodato_info": comodato_info,
    }


def get_patrimonio_por_serial_fornecedor(serial_fornecedor: str) -> Optional[Dict[str, Any]]:
    """
    Busca o primeiro patrimônio pelo serial do fornecedor (FHTT...).
    Retorna o registro ou None.
    """
    s = (serial_fornecedor or "").strip()
    if not s:
        return None
    return _listar_um(
        "patrimonio",
        "patrimonio.serial_fornecedor",
        s,
        "=",
        sortname="patrimonio.id",
        sortorder="desc",
    )


def lancar_comodato(
    contrato_id: int | str,
    numero_serie: str,
    descricao: str,
    *,
    id_patrimonio: int | str,
    numero_patrimonial: str,
    valor_unitario: float | str | None = None,
    id_produto: int | str | None = None,
    data: str | None = None,
    qtde_saida: int = 1,
    id_unidade: int | str | None = None,
    id_almox: int | str | None = None,
    filial_id: int | str | None = None,
    id_classificacao_tributaria: int | str | None = None,
    unidade_sigla: str | None = None,
    fator_conversao: str | None = None,
    tipo: str | None = None,
    estoque: str | None = None,
    mac: str = "",
    id_equipamento_tv: str = "",
    tipo_produto: str = "",
) -> Dict[str, Any]:
    """
    Lança comodato com TODOS os campos obrigatórios do endpoint.
    Mantida forma de envio/payload (sem alterações na consulta).
    """
    id_produto = str(id_produto or IXC_ID_PRODUTO)
    id_unidade = str(id_unidade or IXC_ID_UNIDADE)
    id_almox = str(id_almox or IXC_ID_ALMOX)
    filial_id = str(filial_id or IXC_FILIAL_ID)
    id_classificacao_tributaria = str(id_classificacao_tributaria or IXC_ID_CLASS_TRIB)
    unidade_sigla = str(unidade_sigla or IXC_UNIDADE_SIGLA)
    fator_conversao = str(fator_conversao or IXC_FATOR_CONVERSAO)
    tipo = str(tipo or IXC_TIPO)
    estoque = str(estoque or IXC_ESTOQUE)

    if not data:
        data = datetime.date.today().strftime("%d/%m/%Y")

    if valor_unitario is None:
        valor_unitario = IXC_VALOR_UNIT_DEFAULT
    try:
        vu = float(str(valor_unitario).replace(",", "."))
    except Exception:
        vu = float(IXC_VALOR_UNIT_DEFAULT)
    qt = max(1, int(qtde_saida))
    vt = vu * qt

    payload: Dict[str, Any] = {
        "id_patrimonio": str(id_patrimonio),
        "id_produto": str(id_produto),
        "mac": mac or "",
        "numero_serie": str(numero_serie or ""),
        "numero_patrimonial": str(numero_patrimonial or ""),
        "descricao": str(descricao or ""),
        "data": data,
        "id_unidade": str(id_unidade),
        "id_almox": str(id_almox),
        "filial_id": str(filial_id),
        "qtde_saida": str(qt),
        "valor_unitario": f"{vu:.2f}",
        "valor_total": f"{vt:.2f}",
        "status_comodato": "E",
        "id_classificacao_tributaria": str(id_classificacao_tributaria),
        "tipo": tipo,
        "estoque": estoque,
        "unidade_sigla": unidade_sigla,
        "fator_conversao": fator_conversao,
        "id_contrato": str(contrato_id),
        "id_equipamento_tv": str(id_equipamento_tv or ""),
        "tipo_produto": str(tipo_produto or ""),
    }

    return _request("cliente_contrato_comodato", payload, ixcsoft="inserir", timeout=20)

# =============================================================================
# Utilidades opcionais
# =============================================================================

def ping() -> bool:
    """Verifica acesso ao endpoint base listando 1 contrato (barato)."""
    try:
        _ = _listar_um(
            "cliente_contrato",
            "cliente_contrato.id",
            "0",
            ">",
            "cliente_contrato.id",
            "desc",
        )
        return True
    except Exception:
        return False


__all__ = [
    "buscar_contrato_por_pppoe",
    "listar_patrimonio_por_serial",
    "listar_comodato_por_serial",
    "listar_comodato_por_contrato",
    "lancar_comodato",
    "get_patrimonio_por_serial_fornecedor",
    # extras
    "get_contrato_por_id",
    "ping",
    "reload_env",
]
