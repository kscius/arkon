#!/bin/sh
# Recover from Prisma P3009 (failed migration). Used by docker-entrypoint on deploy failure.
set -e

API_DIR="${API_DIR:-/app/apps/api}"
cd "$API_DIR"

echo "=== Prisma migration recovery ==="
npx prisma migrate status || true

FAILED_MIGRATIONS=$(psql "$DATABASE_URL" -tA -c "
SELECT migration_name
FROM \"_prisma_migrations\"
WHERE finished_at IS NULL
  AND rolled_back_at IS NULL
  AND started_at IS NOT NULL
ORDER BY started_at;
" 2>/dev/null || true)

if [ -z "$FAILED_MIGRATIONS" ]; then
  echo "No failed migrations found in _prisma_migrations."
  exit 1
fi

echo "Failed migrations:"
printf '%s\n' "$FAILED_MIGRATIONS"

# Cleanup partial artifacts for known split_obra migration
if printf '%s\n' "$FAILED_MIGRATIONS" | grep -q '20260703120000_split_obra_from_accion'; then
  echo "Cleaning partial state for split_obra_from_accion..."
  psql "$DATABASE_URL" <<'SQL'
ALTER TABLE IF EXISTS "acciones" DROP CONSTRAINT IF EXISTS "acciones_obra_fisica_id_fkey";
DROP INDEX IF EXISTS "acciones_obra_fisica_id_idx";
ALTER TABLE IF EXISTS "acciones" DROP COLUMN IF EXISTS "obra_fisica_id";
DROP TABLE IF EXISTS "obras";
DROP TYPE IF EXISTS "EstatusFisicoObra";
-- Drop partial indexes from a failed CREATE TABLE attempt
DROP INDEX IF EXISTS "obras_clave_key";
DROP INDEX IF EXISTS "obras_estatus_fisico_idx";
SQL
fi

for migration in $FAILED_MIGRATIONS; do
  echo "Marking rolled back: $migration"
  npx prisma migrate resolve --rolled-back "$migration"
done

echo "Re-applying migrations..."
npx prisma migrate deploy

echo "=== Recovery complete ==="
npx prisma migrate status
