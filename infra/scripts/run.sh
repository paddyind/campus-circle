#!/bin/bash
# Run a Python script using the project .venv and backend/requirements.txt.
# Use this so you don't need to rely on system Python having the right libraries.
#
# Usage (from project root or anywhere):
#   ./infra/scripts/run.sh infra/scripts/db.py setup
#   ./infra/scripts/run.sh infra/scripts/db.py migrate
#   ./infra/scripts/run.sh infra/scripts/setup_super_admin.py
#   ./infra/scripts/run.sh db setup          # short form: db -> infra/scripts/db.py
#   ./infra/scripts/run.sh db migrate
#   ./infra/scripts/run.sh db backup
#   ./infra/scripts/run.sh setup_super_admin # short form
#
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

# Resolve script and args: short forms map to infra/scripts/<name>
RUN_SCRIPT=""
RUN_ARGS=()
case "$1" in
  db)
    RUN_SCRIPT="infra/scripts/db.py"
    shift
    RUN_ARGS=("$@")
    ;;
  setup_super_admin|setup_super_admin.py)
    RUN_SCRIPT="infra/scripts/setup_super_admin.py"
    shift
    RUN_ARGS=("$@")
    ;;
  setup_tenant_users|setup_tenant_users.py)
    RUN_SCRIPT="infra/scripts/setup_tenant_users.py"
    shift
    RUN_ARGS=("$@")
    ;;
  setup_test_users|setup_test_users.py)
    RUN_SCRIPT="infra/scripts/setup_test_users.py"
    shift
    RUN_ARGS=("$@")
    ;;
  *)
    if [ -z "$1" ]; then
      echo "Usage: $0 <script> [args...]"
      echo "  $0 db setup | migrate | reset | backup | restore <path>"
      echo "  $0 infra/scripts/db.py setup"
      echo "  $0 setup_super_admin"
      echo "  $0 setup_tenant_users demo-bhis"
      exit 1
    fi
    RUN_SCRIPT="$1"
    shift
    RUN_ARGS=("$@")
    ;;
esac

VENV_PY="$PROJECT_ROOT/.venv/bin/python3"
if [ ! -f "$VENV_PY" ]; then
  echo "Creating .venv and installing from backend/requirements.txt..."
  python3 -m venv "$PROJECT_ROOT/.venv"
  "$PROJECT_ROOT/.venv/bin/pip" install -q -r backend/requirements.txt
fi
# Ensure deps are present (e.g. after pull)
"$VENV_PY" -m pip install -q -r backend/requirements.txt 2>/dev/null || true

exec "$VENV_PY" "$PROJECT_ROOT/$RUN_SCRIPT" "${RUN_ARGS[@]}"
