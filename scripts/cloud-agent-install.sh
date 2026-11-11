#!/usr/bin/env bash
# Cloud Agent install. Dependency install only; never contacts PostgreSQL.
set -euo pipefail
cd "$(dirname "$0")/.."
export DATABASE_URL=
export POSTGRES_URL=
if ! command -v pg_isready >/dev/null 2>&1; then
  sudo apt-get update
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y postgresql postgresql-contrib
fi
npm ci
npm run build -w @patchversion/shared
npm run build -w @patchversion/engine
