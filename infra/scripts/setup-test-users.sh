#!/bin/bash
# Thin wrapper: prefer ./infra/scripts/run.sh setup_test_users
# Usage: ./infra/scripts/setup-test-users.sh [--disable-email-confirmation]
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/run.sh" setup_test_users "$@"
