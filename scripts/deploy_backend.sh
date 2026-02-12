#!/usr/bin/env bash
set -euo pipefail

REPO_DIR=${REPO_DIR:-/var/www/projeto-isp}
VENV_DIR=${VENV_DIR:-$REPO_DIR/.venv}

echo "[deploy] entrando em $REPO_DIR"
cd "$REPO_DIR"

echo "[deploy] git status (verifique se está limpo antes de prosseguir)"
git status -sb

echo "[deploy] pull da branch atual"
git pull --ff-only

if [ ! -d "$VENV_DIR" ]; then
  echo "[deploy] criando venv em $VENV_DIR"
  python3 -m venv "$VENV_DIR"
fi

echo "[deploy] ativando venv"
source "$VENV_DIR/bin/activate"

echo "[deploy] instalando dependências do backend"
pip install --upgrade pip
pip install -r requirements.txt

echo "[deploy] migrando configs (.env já deve existir no servidor)"
ls -lah .env || true

echo "[deploy] validação rápida de boot da API"
python - <<'PY'
from web.app import create_app
app = create_app({"TESTING": True})
print("[deploy] app factory OK:", bool(app))
PY

echo "[deploy] reiniciando serviço (ajuste para o seu supervisor)"
if command -v systemctl >/dev/null 2>&1; then
  sudo systemctl restart projeto-isp || true
else
  echo "reinicie manualmente o gunicorn (ex.: pkill -f gunicorn && nohup gunicorn -w 2 -b 0.0.0.0:8000 web.wsgi:app &)"
fi

echo "[deploy] done"
