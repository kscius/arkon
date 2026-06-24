import { describe, expect, it } from 'vitest';
import { getPageTitle } from './page-titles';

describe('getPageTitle', () => {
  const product = 'CONAGUA';

  it('maps core and PROAGUA routes', () => {
    expect(getPageTitle('/dashboard', product)).toBe('Dashboard Ejecutivo');
    expect(getPageTitle('/solicitudes', product)).toBe('Solicitudes de Programa');
    expect(getPageTitle('/anexos', product)).toBe('Anexos XII y XIII');
    expect(getPageTitle('/cierres-ejercicio', product)).toBe('Cierre de Ejercicio');
    expect(getPageTitle('/proagua/import', product)).toBe('Importación PROAGUA');
    expect(getPageTitle('/admin/usuarios', product)).toBe('Administración de Usuarios');
    expect(getPageTitle('/configurador-alertas', product)).toBe('Configurador de Alertas');
  });

  it('falls back to product name for unknown paths', () => {
    expect(getPageTitle('/unknown', product)).toBe(product);
  });
});
