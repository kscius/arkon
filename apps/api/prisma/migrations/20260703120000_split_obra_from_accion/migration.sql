-- Split physical Obra from program Accion: new `obras` table + FK on acciones.
-- Backfill: one physical obra per existing accion; wire keys (obra_id on child tables) unchanged.

-- acciones was renamed from obras; legacy constraint/index names still use obras_* prefix.
-- Rename them before creating the new physical obras table to avoid name collisions.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'obras_pkey') THEN
    ALTER TABLE "acciones" RENAME CONSTRAINT "obras_pkey" TO "acciones_pkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'obras_municipio_id_fkey') THEN
    ALTER TABLE "acciones" RENAME CONSTRAINT "obras_municipio_id_fkey" TO "acciones_municipio_id_fkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'obras_contratista_id_fkey') THEN
    ALTER TABLE "acciones" RENAME CONSTRAINT "obras_contratista_id_fkey" TO "acciones_contratista_id_fkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'obras_entidad_federativa_id_fkey') THEN
    ALTER TABLE "acciones" RENAME CONSTRAINT "obras_entidad_federativa_id_fkey" TO "acciones_entidad_federativa_id_fkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'obras_organismo_operador_id_fkey') THEN
    ALTER TABLE "acciones" RENAME CONSTRAINT "obras_organismo_operador_id_fkey" TO "acciones_organismo_operador_id_fkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'obras_accion_programa_id_fkey') THEN
    ALTER TABLE "acciones" RENAME CONSTRAINT "obras_accion_programa_id_fkey" TO "acciones_accion_programa_id_fkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'obras_anexo_tecnico_id_fkey') THEN
    ALTER TABLE "acciones" RENAME CONSTRAINT "obras_anexo_tecnico_id_fkey" TO "acciones_anexo_tecnico_id_fkey";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'obras_folio_key') THEN
    ALTER INDEX "obras_folio_key" RENAME TO "acciones_folio_key";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'obras_municipio_id_idx') THEN
    ALTER INDEX "obras_municipio_id_idx" RENAME TO "acciones_municipio_id_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'obras_contratista_id_idx') THEN
    ALTER INDEX "obras_contratista_id_idx" RENAME TO "acciones_contratista_id_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'obras_estatus_idx') THEN
    ALTER INDEX "obras_estatus_idx" RENAME TO "acciones_estatus_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'obras_entidad_federativa_id_idx') THEN
    ALTER INDEX "obras_entidad_federativa_id_idx" RENAME TO "acciones_entidad_federativa_id_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'obras_organismo_operador_id_idx') THEN
    ALTER INDEX "obras_organismo_operador_id_idx" RENAME TO "acciones_organismo_operador_id_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'obras_accion_programa_id_idx') THEN
    ALTER INDEX "obras_accion_programa_id_idx" RENAME TO "acciones_accion_programa_id_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'obras_anexo_tecnico_id_idx') THEN
    ALTER INDEX "obras_anexo_tecnico_id_idx" RENAME TO "acciones_anexo_tecnico_id_idx";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'obras_cua_idx') THEN
    ALTER INDEX "obras_cua_idx" RENAME TO "acciones_cua_idx";
  END IF;
END $$;

CREATE TYPE "EstatusFisicoObra" AS ENUM (
  'en_operacion',
  'en_construccion',
  'en_rehabilitacion',
  'planificada',
  'fuera_servicio',
  'concluida'
);

CREATE TABLE "obras" (
  "id" UUID NOT NULL,
  "clave" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "descripcion" TEXT,
  "tipo_obra" "TipoAccion" NOT NULL,
  "localidad" TEXT NOT NULL,
  "tipo_localidad" TEXT,
  "latitud" DECIMAL(10,6),
  "longitud" DECIMAL(10,6),
  "poblacion_beneficiada" INTEGER NOT NULL DEFAULT 0,
  "cobertura_ap_antes" DECIMAL(5,2),
  "cobertura_ap_meta" DECIMAL(5,2),
  "cobertura_tar_antes" DECIMAL(5,2),
  "cobertura_tar_meta" DECIMAL(5,2),
  "caudal_lps" DECIMAL(8,2),
  "pob_incorporar" INTEGER,
  "pob_mejorar" INTEGER,
  "pob_mujeres" INTEGER,
  "pob_indigena" INTEGER,
  "pob_afromexicano" INTEGER,
  "evidencia_fotografica" JSONB NOT NULL DEFAULT '[]',
  "estatus_fisico" "EstatusFisicoObra" NOT NULL DEFAULT 'planificada',
  "municipio_id" UUID NOT NULL,
  "entidad_federativa_id" UUID,
  "organismo_operador_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "obras_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "obras_clave_key" ON "obras"("clave");
CREATE INDEX "obras_municipio_id_idx" ON "obras"("municipio_id");
CREATE INDEX "obras_entidad_federativa_id_idx" ON "obras"("entidad_federativa_id");
CREATE INDEX "obras_organismo_operador_id_idx" ON "obras"("organismo_operador_id");
CREATE INDEX "obras_estatus_fisico_idx" ON "obras"("estatus_fisico");

ALTER TABLE "obras" ADD CONSTRAINT "obras_municipio_id_fkey"
  FOREIGN KEY ("municipio_id") REFERENCES "municipios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "obras" ADD CONSTRAINT "obras_entidad_federativa_id_fkey"
  FOREIGN KEY ("entidad_federativa_id") REFERENCES "entidades_federativas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "obras" ADD CONSTRAINT "obras_organismo_operador_id_fkey"
  FOREIGN KEY ("organismo_operador_id") REFERENCES "organismos_operadores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "acciones" ADD COLUMN IF NOT EXISTS "obra_fisica_id" UUID;

CREATE INDEX IF NOT EXISTS "acciones_obra_fisica_id_idx" ON "acciones"("obra_fisica_id");

-- Sanitize orphaned FKs before backfill (common cause of failed deploy in prod)
UPDATE "acciones" SET "entidad_federativa_id" = NULL
WHERE "entidad_federativa_id" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "entidades_federativas" ef
    WHERE ef."id" = "acciones"."entidad_federativa_id"
  );

UPDATE "acciones" SET "organismo_operador_id" = NULL
WHERE "organismo_operador_id" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "organismos_operadores" oo
    WHERE oo."id" = "acciones"."organismo_operador_id"
  );

-- Backfill: 1 physical obra per accion (clave = OBRA-{folio})
INSERT INTO "obras" (
  "id",
  "clave",
  "nombre",
  "descripcion",
  "tipo_obra",
  "localidad",
  "tipo_localidad",
  "latitud",
  "longitud",
  "poblacion_beneficiada",
  "cobertura_ap_antes",
  "cobertura_ap_meta",
  "cobertura_tar_antes",
  "cobertura_tar_meta",
  "caudal_lps",
  "pob_incorporar",
  "pob_mejorar",
  "pob_mujeres",
  "pob_indigena",
  "pob_afromexicano",
  "evidencia_fotografica",
  "estatus_fisico",
  "municipio_id",
  "entidad_federativa_id",
  "organismo_operador_id",
  "created_at",
  "updated_at"
)
SELECT
  gen_random_uuid(),
  'OBRA-' || a."folio",
  a."nombre",
  a."descripcion",
  a."tipo_obra",
  COALESCE(NULLIF(TRIM(a."localidad"), ''), 'Sin localidad'),
  a."tipo_localidad",
  a."latitud",
  a."longitud",
  a."poblacion_beneficiada",
  a."cobertura_ap_antes",
  a."cobertura_ap_meta",
  a."cobertura_tar_antes",
  a."cobertura_tar_meta",
  a."caudal_lps",
  a."pob_incorporar",
  a."pob_mejorar",
  a."pob_mujeres",
  a."pob_indigena",
  a."pob_afromexicano",
  a."evidencia_fotografica",
  CASE
    WHEN a."estatus" = 'concluida' THEN 'concluida'::"EstatusFisicoObra"
    WHEN a."estatus" IN ('en_ejecucion_a_tiempo', 'en_ejecucion_retraso', 'en_riesgo') THEN 'en_construccion'::"EstatusFisicoObra"
    WHEN a."estatus" = 'suspendida' THEN 'fuera_servicio'::"EstatusFisicoObra"
    ELSE 'planificada'::"EstatusFisicoObra"
  END,
  a."municipio_id",
  a."entidad_federativa_id",
  a."organismo_operador_id",
  a."created_at",
  COALESCE(a."updated_at", a."created_at", CURRENT_TIMESTAMP)
FROM "acciones" a
WHERE EXISTS (SELECT 1 FROM "municipios" m WHERE m."id" = a."municipio_id");

UPDATE "acciones" a
SET "obra_fisica_id" = o."id"
FROM "obras" o
WHERE o."clave" = 'OBRA-' || a."folio";

ALTER TABLE "acciones" ADD CONSTRAINT "acciones_obra_fisica_id_fkey"
  FOREIGN KEY ("obra_fisica_id") REFERENCES "obras"("id") ON DELETE SET NULL ON UPDATE CASCADE;
