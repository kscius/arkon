import { describe, expect, it } from 'vitest';
import { canAccessRoute } from './access';

describe('canAccessRoute', () => {
  it('allows login route when unauthenticated', () => {
    expect(canAccessRoute(null, '/', false)).toBe(true);
    expect(canAccessRoute(null, '/dashboard', false)).toBe(false);
  });

  it('grants estatal full navigation', () => {
    expect(canAccessRoute('estatal', '/dashboard', true)).toBe(true);
    expect(canAccessRoute('estatal', '/admin/usuarios', true)).toBe(true);
    expect(canAccessRoute('estatal', '/municipios/abc', true)).toBe(true);
  });

  it('restricts municipal to municipal and contractor catalog routes', () => {
    expect(canAccessRoute('municipal', '/dashboard', true)).toBe(true);
    expect(canAccessRoute('municipal', '/municipios/x', true)).toBe(true);
    expect(canAccessRoute('municipal', '/contratistas', true)).toBe(true);
    expect(canAccessRoute('municipal', '/asistente', true)).toBe(true);
    expect(canAccessRoute('municipal', '/admin/usuarios', true)).toBe(false);
  });

  it('restricts contratista to dashboard and contractor panel routes', () => {
    expect(canAccessRoute('contratista', '/dashboard', true)).toBe(true);
    expect(canAccessRoute('contratista', '/contratistas/xyz', true)).toBe(true);
    expect(canAccessRoute('contratista', '/alertas', true)).toBe(true);
    expect(canAccessRoute('contratista', '/obras/1', true)).toBe(true);
    expect(canAccessRoute('contratista', '/municipios', true)).toBe(false);
    expect(canAccessRoute('contratista', '/asistente', true)).toBe(false);
    expect(canAccessRoute('contratista', '/admin/usuarios', true)).toBe(false);
  });
});
