# -*- coding: utf-8 -*-
import logging
import os
import uuid
from time import time
from pathlib import Path
from typing import Any, Dict

from dotenv import load_dotenv
from flask import Flask, jsonify, request, g

from core.ixc_client import reload_env


def _configure_logging(app: Flask) -> None:
    level_name = str(app.config.get("LOG_LEVEL", "INFO")).upper()
    level = getattr(logging, level_name, logging.INFO)

    log_dir = Path(app.config.get("LOG_DIR") or "logs")
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / "app.log"

    handlers = [logging.StreamHandler()]
    try:
        handlers.append(logging.FileHandler(log_file))
    except Exception:
        pass

    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        handlers=handlers,
    )
    app.logger.setLevel(level)


def create_app(config_overrides: Dict[str, Any] | None = None) -> Flask:
    env_path = Path(".env")
    if env_path.exists():
        load_dotenv(env_path)
    reload_env()

    app = Flask(__name__)
    app.config.setdefault("JSON_SORT_KEYS", False)
    app.config.setdefault("LOG_DIR", os.getenv("LOG_DIR", "logs"))
    app.config.setdefault("LOG_LEVEL", os.getenv("LOG_LEVEL", "INFO"))
    app.config.setdefault("API_KEY", os.getenv("FLASK_API_KEY", ""))
    app.config.setdefault("RATE_LIMIT_DISABLED", os.getenv("RATE_LIMIT_DISABLED", "0"))
    app.config.setdefault("RATE_LIMIT_LIMIT", int(os.getenv("RATE_LIMIT_LIMIT", "60")))
    app.config.setdefault("RATE_LIMIT_WINDOW", int(os.getenv("RATE_LIMIT_WINDOW", "60")))

    if config_overrides:
        app.config.update(config_overrides)

    _configure_logging(app)

    from web.routes.health import health_bp
    from web.routes.ixc import ixc_bp

    app.register_blueprint(health_bp)
    app.register_blueprint(ixc_bp, url_prefix="/api/ixc")

    _rate: dict[str, tuple[int, float]] = {}

    def _rate_limit(key: str, limit: int, window: int):
        now = time()
        cnt, reset = _rate.get(key, (0, now + window))
        if now > reset:
            cnt, reset = 0, now + window
        if cnt >= limit:
            return False, int(reset - now)
        _rate[key] = (cnt + 1, reset)
        return True, 0

    @app.before_request
    def _meta_and_rate_limit():
        g.request_id = request.headers.get("x-request-id") or str(uuid.uuid4())

        if str(app.config.get("RATE_LIMIT_DISABLED", "0")) == "1":
            return None

        if request.path.startswith("/api/"):
            key = f"{request.remote_addr}:{request.method}:{request.path}"
            ok, retry = _rate_limit(
                key,
                int(app.config.get("RATE_LIMIT_LIMIT", 60)),
                int(app.config.get("RATE_LIMIT_WINDOW", 60)),
            )
            if not ok:
                resp = jsonify({"ok": False, "message": "rate_limited", "request_id": g.request_id})
                resp.status_code = 429
                resp.headers["Retry-After"] = str(retry)
                resp.headers["X-Request-Id"] = g.request_id
                return resp
        return None

    @app.before_request
    def _require_api_key():
        if not request.path.startswith("/api/"):
            return None
        expected = app.config.get("API_KEY") or ""
        if not expected:
            return None  # sem API key configurada, não bloqueia (modo dev)
        got = request.headers.get("X-API-Key", "")
        if got != expected:
            resp = jsonify({"ok": False, "message": "API key inválida ou ausente.", "request_id": g.request_id})
            resp.status_code = 401
            return resp

    @app.after_request
    def _add_request_id(resp):
        resp.headers["X-Request-Id"] = getattr(g, "request_id", "")
        return resp

    @app.route("/")
    def index():
        return jsonify({"ok": True, "data": {"service": "ixc-api"}})

    return app
