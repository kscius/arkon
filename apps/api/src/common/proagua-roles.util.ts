import { Rol, Usuario } from '@prisma/client';
import { getApiBrand } from './brand';

const INSTITUTIONAL_APPROVE = new Set([
  'director_conagua',
  'coordinador_regional',
  'responsable_estatal',
]);

const TRIMESTRAL_VALIDATE = new Set(['director_conagua', 'corese']);

export function isConaguaTenant(): boolean {
  return getApiBrand().tenantId === 'conagua';
}

export function canManageSolicitudInstitutional(user: Usuario): boolean {
  if (user.rol !== Rol.estatal) return false;
  if (!isConaguaTenant()) return true;
  if (!user.rolConagua) return true;
  return INSTITUTIONAL_APPROVE.has(user.rolConagua);
}

export function canValidateTrimestralInstitutional(user: Usuario): boolean {
  if (user.rol === Rol.estatal) return true;
  if (!isConaguaTenant() || !user.rolConagua) return false;
  return TRIMESTRAL_VALIDATE.has(user.rolConagua);
}
