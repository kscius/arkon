const FOLIO_PATTERN = /^([A-Z0-9]+)-(\d{4})-(\d+)$/i;

function normalizePrograma(programa: string): string {
  return programa.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function buildFolio(programa: string, year: number, sequence: number): string {
  const prog = normalizePrograma(programa);
  const seq = String(sequence).padStart(3, '0');
  return `${prog}-${year}-${seq}`;
}

export function parseFolioSequence(folio: string, programa: string, year: number): number | null {
  const match = folio.trim().match(FOLIO_PATTERN);
  if (!match) return null;
  const [, prog, yr, seq] = match;
  if (normalizePrograma(prog) !== normalizePrograma(programa)) return null;
  if (Number(yr) !== year) return null;
  return Number(seq);
}

export function nextFolioSequence(existingFolios: string[], programa: string, year: number): number {
  let max = 0;
  for (const folio of existingFolios) {
    const seq = parseFolioSequence(folio, programa, year);
    if (seq !== null && seq > max) max = seq;
  }
  return max + 1;
}
