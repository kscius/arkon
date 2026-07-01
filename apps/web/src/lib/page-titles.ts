import { getBrand } from '@/config/brand';

/** Resolves the TopBar title for a given app route pathname. */
export function getPageTitle(pathname: string, productName: string): string {
  const path = pathname.replace(/\/+$/, '') || '/';
  const { entity } = getBrand();

  if (path === '/dashboard') return 'Dashboard Ejecutivo';
  if (path === '/acciones') return `Catálogo de ${entity.pluralCap}`;
  if (path.startsWith('/acciones/')) return `Detalle de ${entity.singularCap}`;
  if (path === '/solicitudes') return 'Solicitudes de Programa';
  if (path === '/anexos') return 'Anexos XII y XIII';
  if (path === '/cierres-ejercicio') return 'Cierre de Ejercicio';
  if (path === '/proagua/import') return 'Importación PROAGUA';
  if (path.startsWith('/municipios/')) return 'Panel del Municipio';
  if (path.startsWith('/contratistas/')) return 'Panel del Contratista';
  if (path === '/admin/usuarios') return 'Administración de Usuarios';
  if (path === '/alertas') return 'Centro de Alertas';
  if (path === '/configurador-alertas') return 'Configurador de Alertas';
  if (path === '/asistente') return 'Asistente de IA';

  return productName;
}
