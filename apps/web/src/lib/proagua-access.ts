import type { User } from '@/types';
import { getBrand } from '@/config/brand';

export const ROL_CONAGUA_LABELS: Record<string, string> = {
  director_conagua: 'Director CONAGUA',
  coordinador_regional: 'Coordinador regional',
  corese: 'CORESE',
  ejecutor_municipal: 'Ejecutor municipal',
  contratista_oo: 'Contratista OO',
  responsable_estatal: 'Responsable estatal',
};

const INSTITUTIONAL_APPROVE = new Set([
  'director_conagua',
  'coordinador_regional',
  'responsable_estatal',
]);

const TRIMESTRAL_VALIDATE = new Set(['director_conagua', 'corese']);

export function getRolConaguaLabel(rol?: string | null): string {
  if (!rol) return '—';
  return ROL_CONAGUA_LABELS[rol] ?? rol.replace(/_/g, ' ');
}

export function canManageSolicitudEstatal(user: User | null): boolean {
  if (!user || user.role !== 'estatal') return false;
  if (getBrand().tenantId !== 'conagua') return true;
  if (!user.rolConagua) return true;
  return INSTITUTIONAL_APPROVE.has(user.rolConagua);
}

export function canValidateTrimestral(user: User | null): boolean {
  if (!user) return false;
  if (user.role === 'estatal') return true;
  if (getBrand().tenantId !== 'conagua' || !user.rolConagua) return false;
  return TRIMESTRAL_VALIDATE.has(user.rolConagua);
}

export function canCaptureTrimestral(user: User | null): boolean {
  if (!user) return false;
  return user.role === 'estatal' || user.role === 'municipal' || user.role === 'contratista';
}

export function canEditCofinanciamiento(user: User | null): boolean {
  if (!user) return false;
  return user.role === 'estatal' || user.role === 'municipal';
}

export function parseEjercicioFromFolio(folio: string): number | undefined {
  const match = folio.match(/\d{4}/);
  return match ? Number(match[0]) : undefined;
}
