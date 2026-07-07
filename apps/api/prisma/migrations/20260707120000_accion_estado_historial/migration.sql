-- Accion estado historial: audited state transitions for program acciones
CREATE TABLE "accion_estado_historial" (
    "id" UUID NOT NULL,
    "accion_id" UUID NOT NULL,
    "estatus_anterior" "EstatusAccion",
    "estatus_nuevo" "EstatusAccion" NOT NULL,
    "motivo" TEXT,
    "usuario_id" UUID,
    "usuario_nombre" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accion_estado_historial_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "accion_estado_historial_accion_id_idx" ON "accion_estado_historial"("accion_id");

CREATE INDEX "accion_estado_historial_accion_id_created_at_idx" ON "accion_estado_historial"("accion_id", "created_at");

ALTER TABLE "accion_estado_historial" ADD CONSTRAINT "accion_estado_historial_accion_id_fkey" FOREIGN KEY ("accion_id") REFERENCES "acciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
