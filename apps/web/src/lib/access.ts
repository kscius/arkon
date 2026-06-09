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
    return role === 'estatal' || role === 'municipal';
  }
  if (route === '/obras' || route.startsWith('/obras/')) return true;

  if (role === 'estatal') {
    if (route.startsWith('/admin/')) return route === '/admin/usuarios';
    return true;
  }

  if (role === 'municipal') {
    return (
      route === '/dashboard' ||
      route === '/obras' ||
      route.startsWith('/obras/') ||
      route === '/municipios' ||
      route.startsWith('/municipios/') ||
      route === '/contratistas' ||
      route.startsWith('/contratistas/')
    );
  }

  if (role === 'contratista') {
    return (
      route === '/dashboard' ||
      route === '/obras' ||
      route.startsWith('/obras/') ||
      route === '/contratistas' ||
      route.startsWith('/contratistas/')
    );
  }

  return false;
}
