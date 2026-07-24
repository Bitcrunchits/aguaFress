#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."

echo "=== Seed: crear SUPER_ADMIN de prueba ==="

DATABASE_URL="postgresql://postgres:postgres@localhost:5433/agua" \
  node "$ROOT_DIR/MicroServices/usuario-service/prisma/seed.cjs"

echo "=== Seed completado ==="
