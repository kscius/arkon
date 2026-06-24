-- Backfill Anexo XIII (técnicos) for AE-GTO-2026-001 when XII exists.
-- Inserts JAPAMI and SIMAPAG independently if each is missing.

INSERT INTO "anexos_tecnicos" (
  "id",
  "anexo_ejecucion_id",
  "organismo_operador_id",
  "ejercicio_fiscal",
  "tipo_localidad",
  "estatus",
  "created_at",
  "updated_at"
)
SELECT
  gen_random_uuid(),
  ae."id",
  japami."id",
  ae."ejercicio_fiscal",
  'urbana',
  'vigente',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "anexos_ejecucion" ae
CROSS JOIN LATERAL (
  SELECT oo."id"
  FROM "organismos_operadores" oo
  WHERE oo."siglas" = 'JAPAMI'
  LIMIT 1
) japami
WHERE ae."numero" = 'AE-GTO-2026-001'
  AND NOT EXISTS (
    SELECT 1
    FROM "anexos_tecnicos" at
    WHERE at."anexo_ejecucion_id" = ae."id"
      AND at."organismo_operador_id" = japami."id"
  );

INSERT INTO "anexos_tecnicos" (
  "id",
  "anexo_ejecucion_id",
  "organismo_operador_id",
  "ejercicio_fiscal",
  "tipo_localidad",
  "estatus",
  "created_at",
  "updated_at"
)
SELECT
  gen_random_uuid(),
  ae."id",
  simapag."id",
  ae."ejercicio_fiscal",
  'urbana',
  'vigente',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "anexos_ejecucion" ae
CROSS JOIN LATERAL (
  SELECT oo."id"
  FROM "organismos_operadores" oo
  WHERE oo."siglas" = 'SIMAPAG'
  LIMIT 1
) simapag
WHERE ae."numero" = 'AE-GTO-2026-001'
  AND NOT EXISTS (
    SELECT 1
    FROM "anexos_tecnicos" at
    WHERE at."anexo_ejecucion_id" = ae."id"
      AND at."organismo_operador_id" = simapag."id"
  );
