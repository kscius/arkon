#!/bin/sh
# Recover from Prisma P3009 (failed migration) in production.
# Run inside the API container: sh /app/scripts/prisma-migrate-recovery.sh
# Or: docker compose exec api sh /app/scripts/prisma-migrate-recovery.sh

set -e

FAILED_MIGRATION="20260703120000_split_obra_from_accion"
API_DIR="/app/apps/api"

cd "$API_DIR"

echo "=== Prisma migration status ==="
npx prisma migrate status || true

echo ""
echo "=== Failed migration record ==="
psql "$DATABASE_URL" -c "
SELECT migration_name, started_at, finished_at, rolled_back_at, LEFT(logs, 500) AS logs_preview
FROM \"_prisma_migrations\"
WHERE migration_name = '${FAILED_MIGRATION}' OR finished_at IS NULL
ORDER BY started_at DESC
LIMIT 5;
" || echo "(psql not available; check logs above)"

echo ""
echo "=== Partial schema artifacts ==="
psql "$DATABASE_URL" -c "
SELECT
  EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EstatusFisicoObra') AS enum_exists,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'obras') AS obras_table_exists,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'acciones' AND column_name = 'obra_fisica_id'
  ) AS obra_fisica_column_exists;
" || true

echo ""
echo "=== Data integrity checks ==="
psql "$DATABASE_URL" -c "
SELECT 'orphan_municipio' AS issue, COUNT(*) AS count
FROM acciones a
LEFT JOIN municipios m ON m.id = a.municipio_id
WHERE m.id IS NULL
UNION ALL
SELECT 'orphan_entidad', COUNT(*)
FROM acciones a
WHERE a.entidad_federativa_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM entidades_federativas ef WHERE ef.id = a.entidad_federativa_id)
UNION ALL
SELECT 'orphan_organismo', COUNT(*)
FROM acciones a
WHERE a.organismo_operador_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM organismos_operadores oo WHERE oo.id = a.organismo_operador_id);
" || true

echo ""
echo "=== Cleanup partial state (safe if migration rolled back) ==="
psql "$DATABASE_URL" <<'SQL' || true
ALTER TABLE IF EXISTS "acciones" DROP CONSTRAINT IF EXISTS "acciones_obra_fisica_id_fkey";
DROP INDEX IF EXISTS "acciones_obra_fisica_id_idx";
ALTER TABLE IF EXISTS "acciones" DROP COLUMN IF EXISTS "obra_fisica_id";
DROP TABLE IF EXISTS "obras";
DROP TYPE IF EXISTS "EstatusFisicoObra";
SQL

echo ""
echo "=== Mark failed migration as rolled back ==="
npx prisma migrate resolve --rolled-back "$FAILED_MIGRATION"

echo ""
echo "=== Re-apply migrations ==="
npx prisma migrate deploy

echo ""
echo "=== Done. Migration status: ==="
npx prisma migrate status
