#!/bin/sh
set -e

cd /app/apps/api

echo "Waiting for PostgreSQL..."
for i in $(seq 1 60); do
  if pg_isready -h "${DB_HOST:-db}" -p "${DB_PORT:-5432}" -U "${POSTGRES_USER:-sigopem}" -d "${POSTGRES_DB:-sigopem_db}" >/dev/null 2>&1; then
    echo "Database is ready."
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "Database not ready after 120s" >&2
    exit 1
  fi
  sleep 2
done

echo "Applying database schema..."
if [ -d "prisma/migrations" ] && [ -n "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  npx prisma migrate deploy
else
  echo "No Prisma migrations found; running prisma db push."
  npx prisma db push
fi

if [ -f "prisma/seed.ts" ]; then
  echo "Seeding database..."
  npx prisma db seed || echo "Seed skipped (already seeded or seed error)."
else
  echo "prisma/seed.ts not found; skipping seed."
fi

echo "Starting SIGOPEM API..."
exec node dist/main.js
