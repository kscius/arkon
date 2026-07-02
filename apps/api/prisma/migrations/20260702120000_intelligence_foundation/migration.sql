-- Intelligence foundation: scores, snapshots, RAG chunks, recommendations, assets, audit
CREATE TABLE "accion_scores" (
    "id" UUID NOT NULL,
    "accion_id" UUID NOT NULL,
    "riesgo_score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "riesgo_nivel" TEXT NOT NULL DEFAULT 'verde',
    "riesgo_factores" JSONB NOT NULL DEFAULT '{}',
    "spi" DECIMAL(8,4),
    "cpi" DECIMAL(8,4),
    "eac" DECIMAL(14,2),
    "etc" DECIMAL(14,2),
    "vac" DECIMAL(14,2),
    "tcpi" DECIMAL(8,4),
    "pv" DECIMAL(14,2),
    "ev" DECIMAL(14,2),
    "ac" DECIMAL(14,2),
    "bac" DECIMAL(14,2),
    "prob_retraso" DECIMAL(5,4),
    "prob_sobrecosto" DECIMAL(5,4),
    "anomalia_score" DECIMAL(5,2),
    "salud_score" DECIMAL(5,2),
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accion_scores_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "accion_scores_accion_id_key" ON "accion_scores"("accion_id");

CREATE TABLE "metric_snapshots" (
    "id" UUID NOT NULL,
    "accion_id" UUID,
    "metric_key" TEXT NOT NULL,
    "periodo" TEXT,
    "valor" DECIMAL(14,4) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metric_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "metric_snapshots_accion_id_metric_key_captured_at_idx" ON "metric_snapshots"("accion_id", "metric_key", "captured_at");

CREATE TABLE "document_chunks" (
    "id" UUID NOT NULL,
    "accion_id" UUID,
    "documento_id" UUID,
    "fuente" TEXT NOT NULL DEFAULT 'documento',
    "chunk_text" TEXT NOT NULL,
    "embedding" JSONB,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "document_chunks_accion_id_idx" ON "document_chunks"("accion_id");

CREATE TABLE "recomendaciones" (
    "id" UUID NOT NULL,
    "accion_id" UUID,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "prioridad" TEXT NOT NULL DEFAULT 'media',
    "estatus" TEXT NOT NULL DEFAULT 'pendiente',
    "factores" JSONB NOT NULL DEFAULT '{}',
    "aprobado_por" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recomendaciones_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "recomendaciones_estatus_prioridad_idx" ON "recomendaciones"("estatus", "prioridad");

CREATE TABLE "activos_hidraulicos" (
    "id" UUID NOT NULL,
    "accion_id" UUID NOT NULL,
    "tipo_activo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "condicion" TEXT NOT NULL DEFAULT 'desconocida',
    "criticidad" TEXT NOT NULL DEFAULT 'media',
    "pof" DECIMAL(5,2),
    "cof" DECIMAL(5,2),
    "riesgo_score" DECIMAL(5,2),
    "rul_anios" DECIMAL(6,2),
    "caudal_lps" DECIMAL(8,2),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activos_hidraulicos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "activos_hidraulicos_accion_id_idx" ON "activos_hidraulicos"("accion_id");

CREATE TABLE "ia_audit_logs" (
    "id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "modelo" TEXT,
    "inputs" JSONB NOT NULL DEFAULT '{}',
    "outputs" JSONB NOT NULL DEFAULT '{}',
    "usuario_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ia_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ia_audit_logs_tipo_created_at_idx" ON "ia_audit_logs"("tipo", "created_at");

ALTER TABLE "accion_scores" ADD CONSTRAINT "accion_scores_accion_id_fkey" FOREIGN KEY ("accion_id") REFERENCES "acciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "metric_snapshots" ADD CONSTRAINT "metric_snapshots_accion_id_fkey" FOREIGN KEY ("accion_id") REFERENCES "acciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_accion_id_fkey" FOREIGN KEY ("accion_id") REFERENCES "acciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recomendaciones" ADD CONSTRAINT "recomendaciones_accion_id_fkey" FOREIGN KEY ("accion_id") REFERENCES "acciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "activos_hidraulicos" ADD CONSTRAINT "activos_hidraulicos_accion_id_fkey" FOREIGN KEY ("accion_id") REFERENCES "acciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
