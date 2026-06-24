import { describe, expect, it } from 'vitest';
import { componenteToCatalogKey } from './SolicitudFormWizard';

describe('componenteToCatalogKey', () => {
  it('maps agua_potable to AP catalog key', () => {
    expect(componenteToCatalogKey('agua_potable')).toBe('AP');
  });

  it('passes through alcantarillado and saneamiento', () => {
    expect(componenteToCatalogKey('alcantarillado')).toBe('alcantarillado');
    expect(componenteToCatalogKey('saneamiento')).toBe('saneamiento');
  });
});
