from flask import Blueprint, jsonify, request, current_app

from core.lookup import full_lookup

ixc_bp = Blueprint("ixc", __name__)


def _error(message: str, status: int = 400):
    return jsonify({"ok": False, "message": message}), status


@ixc_bp.post("/lookup")
def lookup():
    payload = request.get_json(silent=True) or {}
    pppoe = (payload.get("pppoe") or "").strip()
    serial_hint = payload.get("serial_hint") or payload.get("serial")

    if not pppoe:
        return _error("PPPoE é obrigatório.")

    try:
        data = full_lookup(pppoe, serial_hint)
        return jsonify({"ok": True, "data": data}), 200
    except ValueError as err:
        return _error(str(err))
    except Exception:
        current_app.logger.exception("Erro ao consultar IXC")
        return _error("Erro interno ao consultar IXC.", status=500)

