import { describe, expect, it } from 'vitest';
import { getAlertaTipoLabel, humanizeSnakeCase } from './utils';

describe('alerta label helpers', () => {
  it('maps known scheduler tipos', () => {
    expect(getAlertaTipoLabel('documentacion_incompleta')).toBe('Documentación incompleta');
    expect(getAlertaTipoLabel('retraso_fisico')).toBe('Retraso físico');
    expect(getAlertaTipoLabel('desvio_financiero')).toBe('Desvío financiero');
  });

  it('humanizes unknown snake_case tipos', () => {
    expect(humanizeSnakeCase('mi_tipo_nuevo')).toBe('Mi Tipo Nuevo');
    expect(getAlertaTipoLabel('mi_tipo_nuevo')).toBe('Mi Tipo Nuevo');
  });
});
