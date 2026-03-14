#!/bin/bash
# Run DB migrations. Prefer: ./infra/scripts/run.sh db migrate
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
exec "$SCRIPT_DIR/run.sh" db migrate
