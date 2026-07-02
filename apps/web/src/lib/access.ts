import type { UserRole } from '@/types';

/** Route access rules shared by AppContext and unit tests. */
export function canAccessRoute(
  role: UserRole | null | undefined,
  route: string,
  isAuthenticated: boolean,
): boolean {
  if (!isAuthenticated || !role) return route === '/';

  if (route === '/alertas') return true;
  if (route === '/configurador-alertas') {
    return role === 'estatal' || role === 'municipal';
  }
  if (route === '/asistente') {
    return false;
  }
  if (route === '/acciones' || route.startsWith('/acciones/')) return true;
  if (route === '/bandeja') return true;
  if (route === '/solicitudes') {
    return role === 'estatal' || role === 'municipal';
  }
  if (route === '/anexos' || route === '/cierres-ejercicio' || route === '/proagua/import') {
    return role === 'estatal' || role === 'municipal';
  }

  if (role === 'estatal') {
    if (route.startsWith('/admin/')) return route === '/admin/usuarios';
    return true;
  }

  if (role === 'municipal') {
    return (
      route === '/dashboard' ||
      route === '/bandeja' ||
      route === '/acciones' ||
      route.startsWith('/acciones/') ||
      route === '/solicitudes' ||
      route === '/municipios' ||
      route.startsWith('/municipios/') ||
      route === '/contratistas' ||
      route.startsWith('/contratistas/')
    );
  }

  if (role === 'contratista') {
    return (
      route === '/dashboard' ||
      route === '/bandeja' ||
      route === '/acciones' ||
      route.startsWith('/acciones/') ||
      route === '/contratistas' ||
      route.startsWith('/contratistas/')
    );
  }

  return false;
}
