-- CONAGUA standalone divergence: rename the core entity at the physical layer.
-- Renames the `obras` table to `acciones` and the status/type enum types.
-- FK columns (obra_id, tipo_obra, obra_resultante_id) are intentionally kept as-is
-- (they remain the JSON wire contract); only the table and enum type names change.
-- Existing indexes/constraints keep their original auto-generated names; this is
-- cosmetic only and has no runtime effect on this non-merging branch.

ALTER TABLE "obras" RENAME TO "acciones";

ALTER TYPE "EstatusObra" RENAME TO "EstatusAccion";
ALTER TYPE "TipoObra" RENAME TO "TipoAccion";
