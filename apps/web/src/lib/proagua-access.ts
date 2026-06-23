import type { User } from '@/types';

export const ROL_CONAGUA_LABELS: Record<string, string> = {
  director_conagua: 'Director CONAGUA',
  coordinador_regional: 'Coordinador regional',
  corese: 'CORESE',
  ejecutor_municipal: 'Ejecutor municipal',
  contratista_oo: 'Contratista OO',
  responsable_estatal: 'Responsable estatal',
};

export function getRolConaguaLabel(rol?: string | null): string {
  if (!rol) return '—';
  return ROL_CONAGUA_LABELS[rol] ?? rol.replace(/_/g, ' ');
}

export function canManageSolicitudEstatal(user: User | null): boolean {
  return user?.role === 'estatal';
}

export function canValidateTrimestral(user: User | null): boolean {
  if (!user) return false;
  if (user.role === 'estatal') return true;
  return user.rolConagua === 'corese' || user.rolConagua === 'director_conagua';
}

export function canCaptureTrimestral(user: User | null): boolean {
  if (!user) return false;
  return user.role === 'estatal' || user.role === 'municipal' || user.role === 'contratista';
}

export function parseEjercicioFromFolio(folio: string): number | undefined {
  const match = folio.match(/\d{4}/);
  return match ? Number(match[0]) : undefined;
}
