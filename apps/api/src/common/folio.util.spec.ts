import { buildFolio, nextFolioSequence, parseFolioSequence } from './folio.util';

describe('folio.util', () => {
  it('builds folio with padded sequence', () => {
    expect(buildFolio('FAPAA', 2024, 1)).toBe('FAPAA-2024-001');
    expect(buildFolio('fapaa', 2024, 12)).toBe('FAPAA-2024-012');
  });

  it('parses matching folio sequence', () => {
    expect(parseFolioSequence('FAPAA-2024-003', 'FAPAA', 2024)).toBe(3);
    expect(parseFolioSequence('PROAGUA-2023-015', 'PROAGUA', 2023)).toBe(15);
  });

  it('returns null for non-matching programa or year', () => {
    expect(parseFolioSequence('FAPAA-2024-001', 'CAM', 2024)).toBeNull();
    expect(parseFolioSequence('FAPAA-2023-001', 'FAPAA', 2024)).toBeNull();
    expect(parseFolioSequence('invalid', 'FAPAA', 2024)).toBeNull();
  });

  it('computes next sequence from existing folios', () => {
    const existing = ['FAPAA-2024-001', 'FAPAA-2024-003', 'CAM-2024-001', 'FAPAA-2023-099'];
    expect(nextFolioSequence(existing, 'FAPAA', 2024)).toBe(4);
    expect(nextFolioSequence([], 'FAPAA', 2024)).toBe(1);
  });
});
