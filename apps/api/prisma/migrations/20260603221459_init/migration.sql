-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('estatal', 'municipal', 'contratista');

-- CreateEnum
CREATE TYPE "EstatusObra" AS ENUM ('en_ejecucion_a_tiempo', 'en_ejecucion_retraso', 'concluida', 'en_riesgo', 'en_preparacion', 'en_revision', 'suspendida', 'en_adjudicacion', 'en_licitacion', 'cancelada', 'cerrada');

-- CreateEnum
CREATE TYPE "TipoObra" AS ENUM ('pavimentacion_urbana', 'infraestructura_educativa', 'drenaje_saneamiento', 'electrificacion', 'agua_potable', 'espacios_publicos', 'salud', 'proteccion_civil', 'infraestructura_comercial', 'patrimonio_cultural', 'puentes_vialidades', 'caminos_rurales', 'alumbrado_publico');

-- CreateEnum
CREATE TYPE "EstatusAvance" AS ENUM ('pendiente', 'en_revision', 'validado', 'observado');

-- CreateEnum
CREATE TYPE "EstatusEstimacion" AS ENUM ('no_presentada', 'presentada', 'en_revision_municipal', 'observada_municipio', 'validada_municipio', 'en_revision_estatal', 'observada_estado', 'autorizada', 'pagada', 'rechazada');

-- CreateEnum
CREATE TYPE "EstadoDocumento" AS ENUM ('no_cargado', 'cargado', 'en_revision', 'observado', 'validado');

-- CreateEnum
CREATE TYPE "CategoriaDocumento" AS ENUM ('administrativa', 'tecnica', 'ejecucion', 'cierre', 'programa');

-- CreateEnum
CREATE TYPE "EstatusObservacion" AS ENUM ('abierta', 'en_atencion', 'atendida', 'cerrada');

-- CreateTable
CREATE TABLE "municipios" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "latitud" DECIMAL(10,6),
    "longitud" DECIMAL(10,6),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "municipios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contratistas" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "rfc" TEXT NOT NULL,
    "representante" TEXT NOT NULL,
    "email" TEXT,
    "telefono" TEXT,
    "registro_padron" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contratistas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "avatar_initials" TEXT NOT NULL DEFAULT 'US',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login" TIMESTAMP(3),
    "municipio_id" UUID,
    "contratista_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programas" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "nombre_corto" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "dependencia" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "obras" (
    "id" UUID NOT NULL,
    "folio" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "localidad" TEXT NOT NULL,
    "programa" TEXT NOT NULL,
    "tipo_programa" TEXT NOT NULL DEFAULT 'federal',
    "dependencia" TEXT NOT NULL,
    "tipo_obra" "TipoObra" NOT NULL,
    "descripcion" TEXT,
    "poblacion_beneficiada" INTEGER NOT NULL DEFAULT 0,
    "monto_autorizado" DECIMAL(14,2) NOT NULL,
    "monto_contratado" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "monto_ejercido" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "supervisor" TEXT,
    "fecha_inicio" TEXT,
    "fecha_termino_programada" TEXT,
    "fecha_termino_real" TEXT,
    "plazo_ejecucion" INTEGER NOT NULL DEFAULT 0,
    "avance_fisico_programado" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "avance_fisico_real" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "avance_financiero" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "estatus" "EstatusObra" NOT NULL DEFAULT 'en_preparacion',
    "riesgo" TEXT NOT NULL DEFAULT 'bajo',
    "latitud" DECIMAL(10,6),
    "longitud" DECIMAL(10,6),
    "evidencia_fotografica" JSONB NOT NULL DEFAULT '[]',
    "municipio_id" UUID NOT NULL,
    "contratista_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "obras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avances_mensuales" (
    "id" UUID NOT NULL,
    "periodo" TEXT NOT NULL,
    "programado" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "reportado" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "validado" DECIMAL(5,2),
    "variacion" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "estatus" "EstatusAvance" NOT NULL DEFAULT 'pendiente',
    "actividades" TEXT NOT NULL DEFAULT '',
    "comentarios" TEXT NOT NULL DEFAULT '',
    "obra_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "avances_mensuales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estimaciones" (
    "id" UUID NOT NULL,
    "numero" INTEGER NOT NULL,
    "periodo" TEXT NOT NULL,
    "monto_estimado" DECIMAL(14,2) NOT NULL,
    "monto_acumulado" DECIMAL(14,2) NOT NULL,
    "porcentaje_financiero" DECIMAL(5,2) NOT NULL,
    "estatus" "EstatusEstimacion" NOT NULL DEFAULT 'no_presentada',
    "fecha_presentacion" TEXT,
    "fecha_revision" TEXT,
    "fecha_autorizacion" TEXT,
    "validacion_municipal" BOOLEAN NOT NULL DEFAULT false,
    "validacion_estatal" BOOLEAN NOT NULL DEFAULT false,
    "observaciones" TEXT NOT NULL DEFAULT '',
    "obra_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estimaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos" (
    "id" UUID NOT NULL,
    "categoria" "CategoriaDocumento" NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'pdf',
    "estatus" "EstadoDocumento" NOT NULL DEFAULT 'no_cargado',
    "fecha_carga" TEXT,
    "responsable" TEXT,
    "archivo" TEXT,
    "tamano_bytes" INTEGER,
    "obra_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "observaciones" (
    "id" UUID NOT NULL,
    "usuario_emisor" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "severidad" TEXT NOT NULL DEFAULT 'media',
    "responsable" TEXT,
    "fecha_compromiso" TEXT,
    "estatus" "EstatusObservacion" NOT NULL DEFAULT 'abierta',
    "respuestas_json" JSONB NOT NULL DEFAULT '[]',
    "obra_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "observaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alertas" (
    "id" UUID NOT NULL,
    "municipio" TEXT NOT NULL,
    "municipio_id" UUID,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "severidad" TEXT NOT NULL DEFAULT 'media',
    "fecha_generacion" TEXT NOT NULL,
    "atendida" BOOLEAN NOT NULL DEFAULT false,
    "accion_tomada" TEXT,
    "obra_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alertas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "municipios_nombre_key" ON "municipios"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "contratistas_rfc_key" ON "contratistas"("rfc");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_municipio_id_idx" ON "users"("municipio_id");

-- CreateIndex
CREATE INDEX "users_contratista_id_idx" ON "users"("contratista_id");

-- CreateIndex
CREATE UNIQUE INDEX "obras_folio_key" ON "obras"("folio");

-- CreateIndex
CREATE INDEX "obras_municipio_id_idx" ON "obras"("municipio_id");

-- CreateIndex
CREATE INDEX "obras_contratista_id_idx" ON "obras"("contratista_id");

-- CreateIndex
CREATE INDEX "obras_estatus_idx" ON "obras"("estatus");

-- CreateIndex
CREATE INDEX "avances_mensuales_obra_id_idx" ON "avances_mensuales"("obra_id");

-- CreateIndex
CREATE INDEX "estimaciones_obra_id_idx" ON "estimaciones"("obra_id");

-- CreateIndex
CREATE INDEX "documentos_obra_id_idx" ON "documentos"("obra_id");

-- CreateIndex
CREATE INDEX "observaciones_obra_id_idx" ON "observaciones"("obra_id");

-- CreateIndex
CREATE INDEX "alertas_atendida_severidad_idx" ON "alertas"("atendida", "severidad");

-- CreateIndex
CREATE INDEX "alertas_municipio_id_idx" ON "alertas"("municipio_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_municipio_id_fkey" FOREIGN KEY ("municipio_id") REFERENCES "municipios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_contratista_id_fkey" FOREIGN KEY ("contratista_id") REFERENCES "contratistas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obras" ADD CONSTRAINT "obras_municipio_id_fkey" FOREIGN KEY ("municipio_id") REFERENCES "municipios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obras" ADD CONSTRAINT "obras_contratista_id_fkey" FOREIGN KEY ("contratista_id") REFERENCES "contratistas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avances_mensuales" ADD CONSTRAINT "avances_mensuales_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimaciones" ADD CONSTRAINT "estimaciones_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observaciones" ADD CONSTRAINT "observaciones_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas" ADD CONSTRAINT "alertas_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas" ADD CONSTRAINT "alertas_municipio_id_fkey" FOREIGN KEY ("municipio_id") REFERENCES "municipios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
