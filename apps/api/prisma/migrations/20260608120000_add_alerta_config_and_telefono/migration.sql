-- AlterTable
ALTER TABLE "users" ADD COLUMN "telefono" TEXT;

-- CreateTable
CREATE TABLE "alerta_configs" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "tipo" TEXT NOT NULL,
    "severidad" TEXT NOT NULL DEFAULT 'media',
    "programa_filtro" TEXT,
    "municipio_id" UUID,
    "obra_id" UUID,
    "umbral_dias" INTEGER,
    "umbral_porcentaje" DECIMAL(5,2),
    "umbral_monto" DECIMAL(14,2),
    "destinatarios_json" JSONB NOT NULL DEFAULT '[]',
    "creado_por" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alerta_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "alerta_configs_activa_idx" ON "alerta_configs"("activa");

-- CreateIndex
CREATE INDEX "alerta_configs_municipio_id_idx" ON "alerta_configs"("municipio_id");

-- CreateIndex
CREATE INDEX "alerta_configs_obra_id_idx" ON "alerta_configs"("obra_id");

-- CreateIndex
CREATE INDEX "alerta_configs_creado_por_idx" ON "alerta_configs"("creado_por");

-- AddForeignKey
ALTER TABLE "alerta_configs" ADD CONSTRAINT "alerta_configs_municipio_id_fkey" FOREIGN KEY ("municipio_id") REFERENCES "municipios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerta_configs" ADD CONSTRAINT "alerta_configs_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerta_configs" ADD CONSTRAINT "alerta_configs_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
