# -*- coding: utf-8 -*-
"""
Lógica pura de consulta completa no IXC (PPPoE -> contrato/comodatos/patrimônio).
Reutilizada tanto pela UI desktop quanto pela API Flask.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from core import ixc_client


def _numero_patrimonial_do_patrimonio(pat: dict, fallback: str = "") -> str:
    return (
        str(
            pat.get("numero_patrimonial")
            or pat.get("n_patrimonial")
            or pat.get("numero_patrimonio")
            or pat.get("num_patrimonial")
            or pat.get("n_patrimonio")
            or pat.get("serial")
            or fallback
        ).strip()
    )


def _serial_oficial_do_patrimonio(pat: dict, fallback: str = "") -> str:
    return (str(pat.get("numero_serie") or pat.get("serial_fornecedor") or fallback)).strip()


def _has_value(v: Any) -> bool:
    if v is None:
        return False
    s = str(v).strip()
    if s == "":
        return False
    if s == "0000-00-00":
        return False
    return True


def dump_dict_lines(d: Dict[str, Any], prefix: str = "") -> List[str]:
    out: List[str] = []
    for k in sorted(d.keys()):
        v = d.get(k)
        if _has_value(v):
            out.append(f"{prefix}{k}: {v}")
    return out


def full_lookup(pppoe: str, serial_hint: Optional[str] = None) -> dict:
    """
    Executa a consulta completa sem dependências de UI.
    Mantém o formato de resposta usado pelo worker Qt.
    """
    pppoe = (pppoe or "").strip()
    serial_hint = (serial_hint or "").strip()
    if not pppoe:
        raise ValueError("PPPoE é obrigatório")

    contrato_res = ixc_client.buscar_contrato_por_pppoe(pppoe) or {}

    try:
        rad = ixc_client._get_radusuario(pppoe)  # noqa: SLF001
    except Exception:
        rad = {}

    contrato_id = contrato_res.get("id") or (
        rad.get("id_contrato") or rad.get("id_cliente_contrato") or rad.get("id_contrato_cliente")
    )
    contrato_bruto: dict = {}
    if contrato_id:
        try:
            contrato_bruto = ixc_client.get_contrato_por_id(contrato_id) or {}
        except Exception:
            contrato_bruto = {}

    comodatos: List[Dict[str, Any]] = []
    if contrato_id:
        try:
            payload = {
                "qtype": "cliente_contrato_comodato.id_contrato",
                "query": str(contrato_id),
                "oper": "=",
                "page": "1",
                "rp": "1000",
                "sortname": "cliente_contrato_comodato.id",
                "sortorder": "desc",
            }
            data = ixc_client._request("cliente_contrato_comodato", payload, ixcsoft="listar")  # noqa: SLF001
            comodatos = (data or {}).get("registros") or []
        except Exception:
            comodatos = []

    equipamentos: List[Dict[str, Any]] = []
    for c in comodatos:
        ns = (c.get("numero_serie") or "").strip()
        pat = {}
        if ns:
            try:
                pat = ixc_client.listar_patrimonio_por_serial(ns) or {}
            except Exception:
                pat = {}

        equipamentos.append(
            {
                "comodato_id": c.get("id"),
                "descricao": c.get("descricao"),
                "numero_serie": ns,
                "numero_patrimonial_comodato": c.get("numero_patrimonial") or "",
                "data": c.get("data"),
                "valor_unitario": c.get("valor_unitario"),
                "patrimonio": pat,
                "serial_patrimonio": (pat.get("serial") or "").strip(),
                "numero_patrimonial_normalizado": _numero_patrimonial_do_patrimonio(pat),
                "serial_oficial_equipamento": _serial_oficial_do_patrimonio(pat),
                "valor_bem": pat.get("valor_bem"),
                "id_produto": pat.get("id_produto"),
                "id_almoxarifado": pat.get("id_almoxarifado") or pat.get("id_almox"),
            }
        )

    patrimonial_resolvido = ""
    fonte_patrimonial = ""

    for eq in equipamentos:
        pat = eq.get("patrimonio") or {}
        patr = (pat.get("serial") or "").strip()
        if patr:
            patrimonial_resolvido = patr
            fonte_patrimonial = "comodato.numero_serie -> patrimonio.serial"
            break

    if not patrimonial_resolvido and serial_hint:
        try:
            pat = ixc_client.listar_patrimonio_por_serial(serial_hint) or {}
        except Exception:
            pat = {}
        patr = (pat.get("serial") or "").strip()
        if patr:
            patrimonial_resolvido = patr
            fonte_patrimonial = "serial_informado -> patrimonio.serial"

    return {
        "pppoe": pppoe,
        "radusuario": rad,
        "contrato_resumo": contrato_res,
        "contrato": contrato_bruto,
        "comodatos": comodatos,
        "equipamentos": equipamentos,
        "patrimonial_resolvido": patrimonial_resolvido,
        "fonte_patrimonial": fonte_patrimonial,
        "serial_hint_utilizado": serial_hint if serial_hint else "",
        "totais": {
            "comodatos": len(comodatos),
            "equipamentos_enriquecidos": len(equipamentos),
        },
    }


__all__ = ["full_lookup", "dump_dict_lines"]
