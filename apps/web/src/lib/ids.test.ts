import { describe, expect, it } from 'vitest';
import { isValidUuid } from './ids';

describe('isValidUuid', () => {
  it('accepts canonical UUIDs', () => {
    expect(isValidUuid('ac1ee561-c0b8-45e5-b7f1-a198b702859f')).toBe(true);
  });

  it('rejects numeric or slug ids', () => {
    expect(isValidUuid('1')).toBe(false);
    expect(isValidUuid('PROAGUA-2025-001')).toBe(false);
    expect(isValidUuid('')).toBe(false);
  });
});
