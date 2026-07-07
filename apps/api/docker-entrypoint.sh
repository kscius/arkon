#!/bin/sh
set -e

cd /app/apps/api

# Derive DB_HOST/DB_PORT from DATABASE_URL if not set explicitly
if [ -z "$DB_HOST" ] && [ -n "$DATABASE_URL" ]; then
  DB_HOST=$(printf '%s' "$DATABASE_URL" | sed 's|.*@\([^:/?]*\).*|\1|')
  DB_PORT=$(printf '%s' "$DATABASE_URL" | sed 's|.*@[^:]*:\([0-9]*\)/.*|\1|')
fi

echo "Waiting for PostgreSQL..."
for i in $(seq 1 60); do
  if pg_isready -h "${DB_HOST:-db}" -p "${DB_PORT:-5432}" -U "${POSTGRES_USER:-arkon}" -d "${POSTGRES_DB:-arkon_db}" >/dev/null 2>&1; then
    echo "Database is ready."
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "Database not ready after 120s" >&2
    exit 1
  fi
  sleep 2
done

echo "Generating Prisma Client..."
npx prisma generate

run_migrate_deploy() {
  npx prisma migrate deploy
}

run_auto_recovery() {
  if [ ! -f /app/scripts/prisma-migrate-recovery.sh ]; then
    echo "Recovery script not found at /app/scripts/prisma-migrate-recovery.sh" >&2
    return 1
  fi
  echo "Attempting automatic Prisma migration recovery (P3009)..."
  sh /app/scripts/prisma-migrate-recovery.sh
}

echo "Applying database schema..."
if [ -d "prisma/migrations" ] && [ -n "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  MIGRATE_AUTO_RECOVER="${MIGRATE_AUTO_RECOVER:-true}"
  if ! run_migrate_deploy; then
    if [ "$MIGRATE_AUTO_RECOVER" = "true" ]; then
      if ! run_auto_recovery; then
        echo "ERROR: migrate deploy and auto-recovery both failed." >&2
        npx prisma migrate status >&2 || true
        exit 1
      fi
    else
      echo "ERROR: prisma migrate deploy failed. Set MIGRATE_AUTO_RECOVER=true or run recovery manually." >&2
      npx prisma migrate status >&2 || true
      exit 1
    fi
  fi
else
  echo "No Prisma migrations found; running prisma db push."
  npx prisma db push
fi

if [ -f "prisma/seed.ts" ]; then
  if [ ! -f "prisma/seed.js" ] || [ "prisma/seed.ts" -nt "prisma/seed.js" ]; then
    echo "Compiling prisma/seed.ts..."
    if [ -f "tsconfig.seed.json" ]; then
      npx tsc -p tsconfig.seed.json
    else
      echo "tsconfig.seed.json not found; using existing prisma/seed.js"
    fi
  fi
fi

if [ -f "prisma/seed.js" ] || [ -f "prisma/seed.ts" ]; then
  echo "Seeding database..."
  npx prisma db seed || echo "Seed skipped (already seeded or seed error)."
else
  echo "prisma/seed.js not found; skipping seed."
fi

echo "Starting ARKON API..."
exec node dist/main.js
