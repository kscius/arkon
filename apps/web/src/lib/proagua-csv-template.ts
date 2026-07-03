/** Columnas mínimas para importación histórica PROAGUA (upsert por CUA). */
export const PROAGUA_CSV_TEMPLATE_HEADER =
  'cua,folio,nombre,programa,monto_autorizado,municipio,localidad,estatus,componente';

export const PROAGUA_CSV_TEMPLATE_SAMPLE = `${PROAGUA_CSV_TEMPLATE_HEADER}
CUA-EJEMPLO-001,PROAGUA-2026-001,Acción de ejemplo importación,PROAGUA,5000000,Cuernavaca,Centro,en_preparacion,AP`;

export function downloadProaguaCsvTemplate(): void {
  const blob = new Blob([PROAGUA_CSV_TEMPLATE_SAMPLE], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'plantilla-importacion-proagua.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}
