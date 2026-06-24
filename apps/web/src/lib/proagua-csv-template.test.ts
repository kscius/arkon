import { describe, expect, it } from 'vitest';
import { PROAGUA_CSV_TEMPLATE_HEADER, PROAGUA_CSV_TEMPLATE_SAMPLE } from './proagua-csv-template';

describe('proagua-csv-template', () => {
  it('includes required CUA column', () => {
    expect(PROAGUA_CSV_TEMPLATE_HEADER).toContain('cua');
  });

  it('sample has header plus one data row', () => {
    const lines = PROAGUA_CSV_TEMPLATE_SAMPLE.trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('CUA-EJEMPLO-001');
  });
});
