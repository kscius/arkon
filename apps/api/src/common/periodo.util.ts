const SPANISH_MONTHS: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

/** Numeric key for chronological ordering of periodo labels (e.g. "Marzo 2024"). */
export function periodoSortKey(periodo: string): number {
  const trimmed = periodo.trim();
  if (!trimmed) return Number.MAX_SAFE_INTEGER;

  const yearMatch = trimmed.match(/(\d{4})\s*$/);
  const year = yearMatch ? Number.parseInt(yearMatch[1], 10) : 0;
  const withoutYear = yearMatch ? trimmed.slice(0, yearMatch.index).trim() : trimmed;

  const bimonthMatch = withoutYear.match(/^(\d{1,2})\s*-\s*(\d{1,2})$/);
  if (bimonthMatch) {
    const month = Number.parseInt(bimonthMatch[1], 10);
    return year * 100 + month;
  }

  const firstWord = withoutYear.split(/\s+/)[0]?.toLowerCase() ?? '';
  const monthNum =
    SPANISH_MONTHS[firstWord] ?? SPANISH_MONTHS[withoutYear.toLowerCase()];
  if (monthNum) {
    return year * 100 + monthNum;
  }

  return year * 10_000 + trimmed.toLowerCase().charCodeAt(0);
}

export function comparePeriodo(a: string, b: string): number {
  const diff = periodoSortKey(a) - periodoSortKey(b);
  return diff !== 0 ? diff : a.localeCompare(b, 'es');
}
