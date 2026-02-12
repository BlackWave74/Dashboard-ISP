# robot/varredura_fiberhome.py
# Nome: varredura_fiberhome.py — Motor de varredura FiberHome (regex/parsing).
# Resumo: acelera a varredura mantendo a lógica de extração (PPPoE/serial/modelo),
# usa índice por trinca SL (A,B,C) e casamento exato; inclui redundância FHTT→PPPoE.
from __future__ import annotations
import re
import bisect
from collections import defaultdict
from typing import Callable, Iterable, Tuple, Optional, List, Dict, Set

# =============================================================================
# Regex de bloco e campos
# =============================================================================
RGX_INICIO = re.compile(r"(?i)^\s*!module config:onu_wan\.\s*$")
RGX_FIM    = re.compile(r"(?i)^\s*!module config:onu_wifi\.\s*$")

# PPPoE só é válido se estiver ENTRE "pppoe pro dis <n>" e antes de "key:"
RGX_TEM_PPPOE     = re.compile(r"(?i)\bpppoe\s+pro\s+dis\b")
RGX_PPPOE_TRECHO  = re.compile(r"\b(?:dsp\s+)?pppoe\s+pro\s+dis\s+(?P<pppoe>\d+)\b(?=[^\n]*\bkey:)", re.IGNORECASE)

# Formas de SL (A,B,C completos):
RGX_SL_SEPARADO = re.compile(r"(?i)\bsl\s+(\d+)\s+(\d+)\s+(\d+)\b")
RGX_SL_PO       = re.compile(r"(?i)\bsl\s*([0-9]+)\s*[pP]\s*([0-9]+)\s*[oO0]\s*([0-9]+)")
RGX_SL_COLADO   = re.compile(r"(?i)\bsl\s*([0-9]{3,})\b")

# Serial/modelo
RGX_SERIAL = re.compile(r"\bFHTT[0-9A-Za-z]{4,32}\b", re.IGNORECASE)

def modelo_valido(token: str) -> bool:
    # esse trecho valida padrões de modelo típicos e evita tokens genéricos
    if not token:
        return False
    t = token.strip()
    if re.match(r"(?i)^PTV\b", t):
        return False
    if not re.search(r"\d", t):
        return False
    return bool(
        re.match(r"^[A-Za-z0-9]{2,}(?:-[A-Za-z0-9]{1,})+$", t) or
        re.match(r"^[A-Za-z]{2,}\d{2,}[A-Za-z0-9\-]*$", t)
    )

def extrair_serial_modelo_da_linha(linha: str):
    # essa parte extrai serial FHTT e modelo (ty/model/modelo)
    serial = None
    modelo = None
    mser = RGX_SERIAL.search(linha)
    if mser:
        serial = mser.group(0)
    mty = re.search(r"(?i)\bty\s+([A-Za-z0-9][A-Za-z0-9._/\-]+)", linha)
    if mty and modelo_valido(mty.group(1)):
        modelo = mty.group(1)
    else:
        mmod = re.search(r"(?i)\b(?:modelo|model)\b\W*([A-Za-z0-9][A-Za-z0-9._/\-]+)", linha)
        if mmod and modelo_valido(mmod.group(1)):
            modelo = mmod.group(1)
        else:
            for c in re.findall(r"\b([A-Za-z0-9]{2,}(?:[._/\-][A-Za-z0-9]{1,})*)\b", linha):
                if modelo_valido(c):
                    modelo = c
                    break
    return serial, modelo

# =============================================================================
# Chave SL e extração de trinca (casamento exato)
# =============================================================================
def rgx_chave_sl(A: str, B: str, C: str) -> re.Pattern:
    # esse trecho monta regex exata para "sl A p B o C" (aceita zero-padding e 'o/O/0')
    A = re.escape(str(A)); B = re.escape(str(B)); C = re.escape(str(C))
    return re.compile(rf"\bsl\s*0*{A}\b\s*[pP]\s*0*{B}\b\s*[oO0]\s*0*{C}\b", re.IGNORECASE)

def extrair_trinca_sl(linha: str) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    # essa parte tenta 'sl A B C', depois 'sl A p B o C', depois 'slABC' (A=1º, B=2º, C=resto)
    m = RGX_SL_SEPARADO.search(linha)
    if m:
        return m.group(1), m.group(2), m.group(3)
    m = RGX_SL_PO.search(linha)
    if m:
        return m.group(1), m.group(2), m.group(3)
    m = RGX_SL_COLADO.search(linha)
    if m:
        seq = m.group(1)
        if len(seq) >= 3:
            return seq[0], seq[1], seq[2:]
    return None, None, None

def _triads_from_line(linha: str) -> Set[Tuple[str, str, str]]:
    # esse trecho indexa todas as trincas SL presentes em linhas com FHTT
    if not RGX_SERIAL.search(linha):
        return set()
    triads: Set[Tuple[str, str, str]] = set()
    for m in RGX_SL_SEPARADO.finditer(linha):
        triads.add((m.group(1), m.group(2), m.group(3)))
    for m in RGX_SL_PO.finditer(linha):
        triads.add((m.group(1), m.group(2), m.group(3)))
    for m in RGX_SL_COLADO.finditer(linha):
        seq = m.group(1)
        if len(seq) >= 3:
            triads.add((seq[0], seq[1], seq[2:]))
    return triads

# =============================================================================
# Utilitários de varredura
# =============================================================================
def _localizar_blocos(lines: List[str]) -> List[Tuple[int, int]]:
    # essa parte encontra os blocos delimitados pelos marcadores de módulo
    inicios = [i for i, ln in enumerate(lines) if RGX_INICIO.search(ln)]
    fins    = [i for i, ln in enumerate(lines) if RGX_FIM.search(ln)]
    blocos = []
    j = 0
    for i_ini in inicios:
        while j < len(fins) and fins[j] <= i_ini:
            j += 1
        if j < len(fins):
            blocos.append((i_ini, fins[j]))
            j += 1
    return blocos

def pppoe_invalido(s: str) -> bool:
    """Valida PPPoE (descarta 0/1/NA/N/A/N/D/--/ZERADO e valores < 2 dígitos)."""
    t = (s or "").strip().upper()
    if t in {"0", "1", "NA", "N/A", "N/D", "--", "ZERADO"}:
        return True
    return not t.isdigit() or len(t) < 2

# Alias compatível com código legado/interno
_pppoe_invalido = pppoe_invalido

def _request_chave_in_line(chave_re: re.Pattern, line: str) -> bool:
    # esse trecho confirma que a linha do equipamento contém a chave SL e um serial
    return bool(chave_re.search(line) and RGX_SERIAL.search(line))

def _procurar_chave_e_serial(lines, idx_base, chave_re, ini, fim):
    # busca no bloco com chave exata + serial
    for k in range(max(idx_base + 1, ini), fim + 1):
        if _request_chave_in_line(chave_re, lines[k]):
            return k, lines[k]
    for k in range(idx_base - 1, ini - 1, -1):
        if _request_chave_in_line(chave_re, lines[k]):
            return k, lines[k]
    return None

def _procurar_chave_e_serial_global(lines, idx_base, chave_re):
    # busca global (mais lenta) com chave exata + serial
    n = len(lines)
    for delta in range(1, max(idx_base, n - idx_base)):
        for k in (idx_base + delta, idx_base - delta):
            if 0 <= k < n and _request_chave_in_line(chave_re, lines[k]):
                return k, lines[k]
    return None

def _build_triad_index(lines: List[str]) -> Dict[Tuple[str, str, str], List[int]]:
    # esse trecho cria índice global SL→linhas com FHTT
    triad_map: Dict[Tuple[str, str, str], List[int]] = defaultdict(list)
    for idx, ln in enumerate(lines):
        triads = _triads_from_line(ln)
        if triads:
            for tri in triads:
                triad_map[tri].append(idx)
    for tri in triad_map:
        triad_map[tri].sort()
    return triad_map

def _find_nearest(sorted_idxs: List[int], target: int, lo: int | None = None, hi: int | None = None) -> int:
    # esse trecho retorna índice mais próximo (bisect)
    if not sorted_idxs:
        return -1
    lo = 0 if lo is None else max(0, lo)
    hi = len(sorted_idxs) if hi is None else min(len(sorted_idxs), hi)
    if lo >= hi:
        return -1
    pos = bisect.bisect_left(sorted_idxs, target, lo, hi)
    if pos == lo:
        return sorted_idxs[lo]
    if pos >= hi:
        return sorted_idxs[hi - 1]
    before = sorted_idxs[pos - 1]
    after = sorted_idxs[pos]
    return before if abs(before - target) <= abs(after - target) else after

def _find_block_for_index(k: int, blocos: List[Tuple[int, int]]) -> Optional[Tuple[int, int]]:
    # esse trecho retorna (ini,fim) do bloco que contém k
    starts = [b[0] for b in blocos]
    pos = bisect.bisect_right(starts, k) - 1
    if pos >= 0:
        ini, fim = blocos[pos]
        if ini <= k <= fim:
            return ini, fim
    return None

def _nums_equivalentes(a: str, b: str) -> bool:
    # essa parte compara números ignorando zeros à esquerda
    try:
        return int(a) == int(b)
    except Exception:
        return a == b

def extrair_pppoe_da_linha(linha: str) -> Optional[str]:
    # esse trecho extrai PPPoE somente do bloco "pppoe pro dis <n> ... key:"
    m = RGX_PPPOE_TRECHO.search(linha)
    return m.group("pppoe") if m else None

def _buscar_pppoe_por_raio(
    lines: List[str],
    idx_serial: int,
    triad: Tuple[str, str, str],
    ini: int,
    fim: int,
    raio: int = 400
) -> Optional[Tuple[int, str]]:
    """
    Fallback redundante: partindo de uma linha com FHTT (idx_serial),
    procura uma linha com PPPoE por proximidade no mesmo bloco que tenha a MESMA trinca SL.
    Retorna (idx_pppoe, pppoe_num) ou None.
    """
    A, B, C = triad
    for delta in range(0, raio + 1):
        for k in (idx_serial + delta, idx_serial - delta) if delta else (idx_serial,):
            if k < ini or k > fim:
                continue
            ln = lines[k]
            if not RGX_TEM_PPPOE.search(ln):
                continue
            a2, b2, c2 = extrair_trinca_sl(ln)
            if a2 and _nums_equivalentes(a2, A) and b2 and _nums_equivalentes(b2, B) and c2 and _nums_equivalentes(c2, C):
                ppp = extrair_pppoe_da_linha(ln)
                if ppp is not None:
                    return k, ppp
    return None

# =============================================================================
# API pública
# =============================================================================
def executar_varredura(
    linhas: Iterable[str],
    *,
    log_callback: Callable[[str, str], None],
    progresso_callback: Callable[[int, int], None],
    resultado_callback: Callable[[str, str, str], None],
    cancelar_callback: Callable[[], bool],
    batch: int = 1000,
) -> tuple[int, int, int]:
    """
    Executa a varredura mantendo a lógica de extração e validação.
    Usa índice global da trinca SL para localizar a linha do equipamento.
    PPPoE: somente do trecho 'pppoe pro dis <n> ... key:' para evitar falsos 'dis <n>'.
    Retorna (qtd_resultados_emitidos, pendentes, total_linhas_analisadas).
    """
    lines = list(linhas)
    log = log_callback
    prog = progresso_callback
    out  = resultado_callback
    cancel = cancelar_callback

    log("TXT", f"Arquivo carregado com {len(lines)} linhas.")
    blocos = _localizar_blocos(lines)
    log("TXT", f"Blocos encontrados: {len(blocos)}")
    if not blocos:
        log("Info", "ERRO: não encontrei '!module config:onu_wan.' → '!module config:onu_wifi.'")
        return (0, 0, 0)

    for i, (ini, fim) in enumerate(blocos, 1):
        log("TXT", f"  Bloco {i}: início na linha {ini+1}, fim na linha {fim+1}")

    # Índice global (SL -> linhas com FHTT)
    triad_index_global = _build_triad_index(lines)

    total_linhas = sum((fim - ini + 1) for ini, fim in blocos)
    processados = 0
    pendentes = 0
    resultados_emitidos = 0

    # Dedupe por serial (UPPER)
    vistos_seriais: Set[str] = set()

    # ------------------------- PASSO 1: PPPoE → (SL) → FHTT ------------------
    for bidx, (ini, fim) in enumerate(blocos, 1):
        if cancel():
            break
        log("Info", f"-- Varredura Bloco {bidx} (linhas {ini+1}-{fim+1}) --")

        for idx in range(ini, fim + 1):
            if cancel():
                break

            linha = lines[idx]
            processados += 1
            if processados % batch == 0:
                prog(processados, total_linhas)

            if not RGX_TEM_PPPOE.search(linha):
                continue

            pppoe_num = extrair_pppoe_da_linha(linha) or "N/D"
            log("Info", f"[{idx+1}] PPPoE detectado (dis {pppoe_num}). Extraindo SL...")

            A, B, C = extrair_trinca_sl(linha)
            if A is not None:
                log("Info", f"     SL capturado: trio={A}{B}{C}")
            if A is None:
                log("Info", f"     FALHA: não consegui extrair SL nessa linha. Marcando pendente (dis {pppoe_num}).")
                pendentes += 1
                continue

            chave_re = rgx_chave_sl(A, B, C)
            chave_str = f"sl {A} p {B} o {C}"
            log("Info", f"     Chave: '{chave_str}' (tolerante). Procurando CHAVE+FHTT no bloco/global...")

            # 1) Índice (faixa do bloco)
            candidatos = triad_index_global.get((A, B, C), [])
            achado = None
            origem = "bloco"
            if candidatos:
                lo = bisect.bisect_left(candidatos, ini)
                hi = bisect.bisect_right(candidatos, fim)
                k_local = _find_nearest(candidatos, idx, lo, hi)
                if k_local != -1 and _request_chave_in_line(chave_re, lines[k_local]):
                    achado = (k_local, lines[k_local])

            # 2) Índice (global)
            if not achado and candidatos:
                k_global = _find_nearest(candidatos, idx)
                if k_global != -1 and _request_chave_in_line(chave_re, lines[k_global]):
                    achado = (k_global, lines[k_global])
                    origem = "global"

            # 3) Fallback de varredura linear
            if not achado:
                tmp = _procurar_chave_e_serial(lines, idx, chave_re, ini, fim)
                if tmp:
                    achado = tmp
                    origem = "bloco"
                else:
                    tmp = _procurar_chave_e_serial_global(lines, idx, chave_re)
                    if tmp:
                        achado = tmp
                        origem = "global"

            if not achado:
                log("Info", f"     NADA encontrado com CHAVE+FHTT (dis {pppoe_num}).")
                pendentes += 1
                continue

            k, linha_eq = achado
            dist = abs(k - idx)
            direc = "abaixo" if k > idx else "acima"
            preview_eq = linha_eq.strip().replace("\t", " ")
            if len(preview_eq) > 160:
                preview_eq = preview_eq[:160] + "…"
            log("Info", f"     ACHOU ({origem}) na linha {k+1} ({direc}, dist={dist}): {preview_eq}")

            serial, modelo = extrair_serial_modelo_da_linha(linha_eq)
            log("Info", f"     Extração → serial={serial or 'N/A'} | modelo={modelo or 'N/A'}")

            if pppoe_invalido(pppoe_num):
                log("Info", "     Ignorado: PPPoE inválido (0/1/NA/N/A/N/D/--/ZERADO ou <2).")
                continue

            if serial and modelo and modelo_valido(modelo):
                norm_serial = serial.strip().upper()
                if norm_serial in vistos_seriais:
                    continue
                out(pppoe_num, serial, modelo)
                vistos_seriais.add(norm_serial)
                resultados_emitidos += 1
            else:
                log("Info", f"     FALHA: serial/modelo inválidos (dis {pppoe_num}).")
                pendentes += 1

            if processados % batch == 0:
                progresso_callback(processados, total_linhas)

    # ------------------- PASSO 2 (redundância): FHTT → PPPoE ------------------
    for tri, idxs in triad_index_global.items():
        if cancel():
            break
        for k in idxs:
            if cancel():
                break
            ini_fim = _find_block_for_index(k, blocos)
            if not ini_fim:
                continue
            ini, fim = ini_fim
            linha_eq = lines[k]
            serial, modelo = extrair_serial_modelo_da_linha(linha_eq)
            if not (serial and modelo and modelo_valido(modelo)):
                continue
            norm_serial = serial.strip().upper()
            if norm_serial in vistos_seriais:
                continue  # já emitido

            # tenta achar PPPoE no raio definido, com a MESMA trinca
            busca = _buscar_pppoe_por_raio(lines, k, tri, ini, fim, raio=400)
            if not busca:
                continue
            idx_pppoe, pppoe_num = busca
            if pppoe_invalido(pppoe_num):
                continue

            # valida a chave também na linha do equipamento
            A, B, C = tri
            chave_re = rgx_chave_sl(A, B, C)
            if not _request_chave_in_line(chave_re, linha_eq):
                continue

            dist = abs(idx_pppoe - k)
            direc = "abaixo" if k > idx_pppoe else "acima"
            log("Info", f"     [Fallback FHTT→PPPoE] Serial próximo casado no bloco (dist={dist}, {direc}).")

            out(pppoe_num, serial, modelo)
            vistos_seriais.add(norm_serial)
            resultados_emitidos += 1

    return (resultados_emitidos, pendentes, total_linhas)
