#!/bin/bash
# Run DB migrations using .env (Supabase or local Postgres).
# Uses project .venv and backend/requirements.txt (centralized deps). Run from project root: ./infra/scripts/migrate.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

VENV_PY="$PROJECT_ROOT/.venv/bin/python3"
if [ -f "$VENV_PY" ]; then
  "$VENV_PY" -m pip install -q -r backend/requirements.txt 2>/dev/null || true
  exec "$VENV_PY" infra/scripts/db.py migrate
fi

if ! command -v python3 &>/dev/null; then
  echo "Error: python3 not found. Install Python first."
  exit 1
fi
echo "Creating .venv and installing from backend/requirements.txt..."
python3 -m venv "$PROJECT_ROOT/.venv"
"$PROJECT_ROOT/.venv/bin/pip" install -q -r backend/requirements.txt
exec "$PROJECT_ROOT/.venv/bin/python3" infra/scripts/db.py migrate
