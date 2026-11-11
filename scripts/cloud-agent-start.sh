#!/usr/bin/env bash
# Cloud Agent boot. Local Postgres for live tests, file store for the dev server.
set -euo pipefail
cd "$(dirname "$0")/.."
if ! pg_isready -q; then
  sudo service postgresql start
fi
for _ in $(seq 1 30); do
  pg_isready -q && break
  sleep 1
done
pg_isready -q
sudo -u postgres psql -v ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'patchbay_test') THEN
    CREATE ROLE patchbay_test LOGIN PASSWORD 'patchbay_test_password' CREATEDB;
  END IF;
END
$$;
SELECT 'CREATE DATABASE patchbay_test OWNER patchbay_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'patchbay_test')\gexec
SQL
if curl -sf -o /dev/null --connect-timeout 1 "http://127.0.0.1:3000/api/dashboard/demo-evidence?run=mockpay"; then
  exit 0
fi
# Empty, not unset, so Next.js does not refill these from an env file.
export DATABASE_URL=
export POSTGRES_URL=
exec npm run dev -w @patchversion/site -- --hostname 127.0.0.1 --port 3000
