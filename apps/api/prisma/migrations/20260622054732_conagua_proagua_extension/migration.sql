-- AlterTable
ALTER TABLE "municipios" ADD COLUMN     "clave_inegi" TEXT,
ADD COLUMN     "entidad_id" UUID,
ADD COLUMN     "es_zap" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "marginacion" TEXT,
ADD COLUMN     "poblacion" INTEGER,
ADD COLUMN     "tipo_localidad" TEXT;

-- AlterTable
ALTER TABLE "obras" ADD COLUMN     "accion_programa_id" UUID,
ADD COLUMN     "anexo_tecnico_id" UUID,
ADD COLUMN     "caudal_lps" DECIMAL(8,2),
ADD COLUMN     "cobertura_ap_antes" DECIMAL(5,2),
ADD COLUMN     "cobertura_ap_meta" DECIMAL(5,2),
ADD COLUMN     "cobertura_tar_antes" DECIMAL(5,2),
ADD COLUMN     "cobertura_tar_meta" DECIMAL(5,2),
ADD COLUMN     "compras_mx_folio" TEXT,
ADD COLUMN     "cua" TEXT,
ADD COLUMN     "entidad_federativa_id" UUID,
ADD COLUMN     "fecha_fallo" TEXT,
ADD COLUMN     "id_sisba" TEXT,
ADD COLUMN     "num_contrato" TEXT,
ADD COLUMN     "organismo_operador_id" UUID,
ADD COLUMN     "pob_afromexicano" INTEGER,
ADD COLUMN     "pob_incorporar" INTEGER,
ADD COLUMN     "pob_indigena" INTEGER,
ADD COLUMN     "pob_mejorar" INTEGER,
ADD COLUMN     "pob_mujeres" INTEGER,
ADD COLUMN     "subcomponente" TEXT,
ADD COLUMN     "tipo_adjudicacion" TEXT,
ADD COLUMN     "tipo_localidad" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "rol_conagua" TEXT;

-- CreateTable
CREATE TABLE "entidades_federativas" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entidades_federativas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organismos_operadores" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "siglas" TEXT,
    "tipo_organismo" TEXT NOT NULL,
    "entidad_id" UUID,
    "municipio_id" UUID,
    "rfc" TEXT,
    "director" TEXT,
    "email" TEXT,
    "telefono" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organismos_operadores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acciones_programa" (
    "id" UUID NOT NULL,
    "programa" TEXT NOT NULL,
    "componente" TEXT NOT NULL,
    "subcomponente" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "unidad" TEXT NOT NULL,
    "tipo_localidad" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acciones_programa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cofinanciamientos" (
    "id" UUID NOT NULL,
    "obra_id" UUID NOT NULL,
    "fuente" TEXT NOT NULL,
    "monto" DECIMAL(14,2) NOT NULL,
    "porcentaje" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "descripcion" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cofinanciamientos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anexos_ejecucion" (
    "id" UUID NOT NULL,
    "numero" TEXT NOT NULL,
    "ejercicio_fiscal" INTEGER NOT NULL,
    "entidad_federativa" TEXT NOT NULL,
    "monto_federal" DECIMAL(14,2) NOT NULL,
    "monto_estatal" DECIMAL(14,2) NOT NULL,
    "fecha_firma" TEXT,
    "fecha_vigencia_fin" TEXT,
    "estatus" TEXT NOT NULL DEFAULT 'vigente',
    "archivo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "anexos_ejecucion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anexos_tecnicos" (
    "id" UUID NOT NULL,
    "anexo_ejecucion_id" UUID NOT NULL,
    "organismo_operador_id" UUID,
    "ejercicio_fiscal" INTEGER NOT NULL,
    "tipo_localidad" TEXT NOT NULL,
    "estatus" TEXT NOT NULL DEFAULT 'vigente',
    "archivo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "anexos_tecnicos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avances_trimestrales" (
    "id" UUID NOT NULL,
    "obra_id" UUID NOT NULL,
    "ejercicio_fiscal" INTEGER NOT NULL,
    "trimestre" INTEGER NOT NULL,
    "avance_fisico_anterior" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "avance_fisico_trimestre" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "avance_fisico_acumulado" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "avance_fin_anterior" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "avance_fin_trimestre" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "avance_fin_acumulado" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "fecha_entrega" TEXT,
    "estatus" "EstatusAvance" NOT NULL DEFAULT 'pendiente',
    "observaciones" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "avances_trimestrales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cierres_ejercicio" (
    "id" UUID NOT NULL,
    "anexo_ejecucion_id" UUID NOT NULL,
    "ejercicio_fiscal" INTEGER NOT NULL,
    "tipo_apoyo" TEXT NOT NULL,
    "monto_transferido" DECIMAL(14,2) NOT NULL,
    "monto_reintegrado_ejercicio" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "monto_modificado_31dic" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "monto_informe_final" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "monto_reintegrado_15ene" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "monto_por_reintegrar" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "fecha_cierre" TEXT,
    "estatus" TEXT NOT NULL DEFAULT 'pendiente',
    "archivo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cierres_ejercicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitudes_programa" (
    "id" UUID NOT NULL,
    "programa" TEXT NOT NULL,
    "ejercicio_fiscal" INTEGER NOT NULL,
    "entidad_id" UUID NOT NULL,
    "municipio_id" UUID NOT NULL,
    "tipo_apoyo" TEXT NOT NULL,
    "componente" TEXT NOT NULL,
    "monto_solicitado" DECIMAL(14,2) NOT NULL,
    "estatus" TEXT NOT NULL DEFAULT 'borrador',
    "obra_resultante_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitudes_programa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "entidades_federativas_nombre_key" ON "entidades_federativas"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "entidades_federativas_clave_key" ON "entidades_federativas"("clave");

-- CreateIndex
CREATE INDEX "organismos_operadores_entidad_id_idx" ON "organismos_operadores"("entidad_id");

-- CreateIndex
CREATE INDEX "organismos_operadores_municipio_id_idx" ON "organismos_operadores"("municipio_id");

-- CreateIndex
CREATE UNIQUE INDEX "acciones_programa_clave_key" ON "acciones_programa"("clave");

-- CreateIndex
CREATE INDEX "acciones_programa_programa_componente_idx" ON "acciones_programa"("programa", "componente");

-- CreateIndex
CREATE INDEX "cofinanciamientos_obra_id_idx" ON "cofinanciamientos"("obra_id");

-- CreateIndex
CREATE UNIQUE INDEX "anexos_ejecucion_numero_key" ON "anexos_ejecucion"("numero");

-- CreateIndex
CREATE INDEX "anexos_ejecucion_ejercicio_fiscal_idx" ON "anexos_ejecucion"("ejercicio_fiscal");

-- CreateIndex
CREATE INDEX "anexos_tecnicos_anexo_ejecucion_id_idx" ON "anexos_tecnicos"("anexo_ejecucion_id");

-- CreateIndex
CREATE INDEX "anexos_tecnicos_organismo_operador_id_idx" ON "anexos_tecnicos"("organismo_operador_id");

-- CreateIndex
CREATE INDEX "avances_trimestrales_obra_id_idx" ON "avances_trimestrales"("obra_id");

-- CreateIndex
CREATE UNIQUE INDEX "avances_trimestrales_obra_id_ejercicio_fiscal_trimestre_key" ON "avances_trimestrales"("obra_id", "ejercicio_fiscal", "trimestre");

-- CreateIndex
CREATE INDEX "cierres_ejercicio_anexo_ejecucion_id_idx" ON "cierres_ejercicio"("anexo_ejecucion_id");

-- CreateIndex
CREATE UNIQUE INDEX "cierres_ejercicio_anexo_ejecucion_id_tipo_apoyo_key" ON "cierres_ejercicio"("anexo_ejecucion_id", "tipo_apoyo");

-- CreateIndex
CREATE INDEX "solicitudes_programa_entidad_id_idx" ON "solicitudes_programa"("entidad_id");

-- CreateIndex
CREATE INDEX "solicitudes_programa_municipio_id_idx" ON "solicitudes_programa"("municipio_id");

-- CreateIndex
CREATE INDEX "solicitudes_programa_obra_resultante_id_idx" ON "solicitudes_programa"("obra_resultante_id");

-- CreateIndex
CREATE INDEX "solicitudes_programa_estatus_idx" ON "solicitudes_programa"("estatus");

-- CreateIndex
CREATE INDEX "municipios_entidad_id_idx" ON "municipios"("entidad_id");

-- CreateIndex
CREATE INDEX "obras_entidad_federativa_id_idx" ON "obras"("entidad_federativa_id");

-- CreateIndex
CREATE INDEX "obras_organismo_operador_id_idx" ON "obras"("organismo_operador_id");

-- CreateIndex
CREATE INDEX "obras_accion_programa_id_idx" ON "obras"("accion_programa_id");

-- CreateIndex
CREATE INDEX "obras_anexo_tecnico_id_idx" ON "obras"("anexo_tecnico_id");

-- CreateIndex
CREATE INDEX "obras_cua_idx" ON "obras"("cua");

-- AddForeignKey
ALTER TABLE "municipios" ADD CONSTRAINT "municipios_entidad_id_fkey" FOREIGN KEY ("entidad_id") REFERENCES "entidades_federativas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organismos_operadores" ADD CONSTRAINT "organismos_operadores_entidad_id_fkey" FOREIGN KEY ("entidad_id") REFERENCES "entidades_federativas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organismos_operadores" ADD CONSTRAINT "organismos_operadores_municipio_id_fkey" FOREIGN KEY ("municipio_id") REFERENCES "municipios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obras" ADD CONSTRAINT "obras_entidad_federativa_id_fkey" FOREIGN KEY ("entidad_federativa_id") REFERENCES "entidades_federativas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obras" ADD CONSTRAINT "obras_organismo_operador_id_fkey" FOREIGN KEY ("organismo_operador_id") REFERENCES "organismos_operadores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obras" ADD CONSTRAINT "obras_accion_programa_id_fkey" FOREIGN KEY ("accion_programa_id") REFERENCES "acciones_programa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obras" ADD CONSTRAINT "obras_anexo_tecnico_id_fkey" FOREIGN KEY ("anexo_tecnico_id") REFERENCES "anexos_tecnicos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cofinanciamientos" ADD CONSTRAINT "cofinanciamientos_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anexos_tecnicos" ADD CONSTRAINT "anexos_tecnicos_anexo_ejecucion_id_fkey" FOREIGN KEY ("anexo_ejecucion_id") REFERENCES "anexos_ejecucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anexos_tecnicos" ADD CONSTRAINT "anexos_tecnicos_organismo_operador_id_fkey" FOREIGN KEY ("organismo_operador_id") REFERENCES "organismos_operadores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avances_trimestrales" ADD CONSTRAINT "avances_trimestrales_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "obras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cierres_ejercicio" ADD CONSTRAINT "cierres_ejercicio_anexo_ejecucion_id_fkey" FOREIGN KEY ("anexo_ejecucion_id") REFERENCES "anexos_ejecucion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_programa" ADD CONSTRAINT "solicitudes_programa_entidad_id_fkey" FOREIGN KEY ("entidad_id") REFERENCES "entidades_federativas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_programa" ADD CONSTRAINT "solicitudes_programa_municipio_id_fkey" FOREIGN KEY ("municipio_id") REFERENCES "municipios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_programa" ADD CONSTRAINT "solicitudes_programa_obra_resultante_id_fkey" FOREIGN KEY ("obra_resultante_id") REFERENCES "obras"("id") ON DELETE SET NULL ON UPDATE CASCADE;
