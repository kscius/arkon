import { comparePeriodo, periodoSortKey } from './periodo.util';

describe('periodo.util', () => {
  it('orders Spanish month labels with year chronologically', () => {
    const months = [
      'Abril 2024',
      'Agosto 2024',
      'Enero 2024',
      'Febrero 2024',
      'Julio 2024',
      'Junio 2024',
      'Marzo 2024',
      'Mayo 2024',
    ];
    const sorted = [...months].sort(comparePeriodo);
    expect(sorted).toEqual([
      'Enero 2024',
      'Febrero 2024',
      'Marzo 2024',
      'Abril 2024',
      'Mayo 2024',
      'Junio 2024',
      'Julio 2024',
      'Agosto 2024',
    ]);
  });

  it('orders plain month names without year', () => {
    expect(periodoSortKey('Enero')).toBeLessThan(periodoSortKey('Marzo'));
    expect(comparePeriodo('Enero', 'Marzo')).toBeLessThan(0);
  });

  it('orders bimonthly period labels', () => {
    expect(comparePeriodo('2-3 2024', '4-5 2024')).toBeLessThan(0);
  });
});
