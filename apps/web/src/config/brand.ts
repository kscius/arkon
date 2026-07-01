export type TenantId = 'conagua';

/**
 * Terminology for the core tracked entity. CONAGUA (PROAGUA) manages each
 * record as an "acción" (1 acción = 1 CUA). These labels drive all
 * user-visible copy.
 */
export type EntityTerms = {
  /** lowercase singular, mid-sentence (e.g. "nueva acción"). */
  singular: string;
  /** lowercase plural, mid-sentence (e.g. "obras en riesgo"). */
  plural: string;
  /** Capitalized singular, start-of-phrase/label (e.g. "Detalle de Acción"). */
  singularCap: string;
  /** Capitalized plural, headings/menus (e.g. "Catálogo de Acciones"). */
  pluralCap: string;
};

export type BrandConfig = {
  tenantId: TenantId;
  productName: string;
  productShortName: string;
  institutionName: string;
  tagline: string;
  loginSubtitle: string;
  /** Terminology for the core tracked entity (obra vs acción). */
  entity: EntityTerms;
  assistantName: string;
  assistantGreeting: string;
  /** Program codes for obra forms and filters (tenant-specific). */
  programas?: string[];
  /** Executing agencies for obra forms (tenant-specific). */
  dependencias?: string[];
  /** Suggested prompts shown on the assistant page. */
  assistantSuggestions?: string[];
  demoEmail: string;
  demoPasswordHint: string;
  logoSrc: string | null;
  logoAlt: string;
  colors: {
    primary: string;
    primaryLight: string;
    secondary: string;
    accent: string;
    surface: string;
    surfaceDark: string;
  };
  roleColors: {
    estatal: string;
    municipal: string;
    contratista: string;
  };
};

const CONAGUA_BRAND: BrandConfig = {
  tenantId: 'conagua',
  productName: 'CONAGUA',
  productShortName: 'CONAGUA',
  institutionName: 'Comisión Nacional del Agua',
  tagline: 'Seguimiento y control de obras del sector hídrico',
  loginSubtitle: 'Comisión Nacional del Agua',
  entity: {
    singular: 'obra',
    plural: 'obras',
    singularCap: 'Obra',
    pluralCap: 'Obras',
  },
  assistantName: 'Asistente CONAGUA',
  assistantGreeting:
    'Buen día. Soy el Asistente CONAGUA. Accedo al portafolio hídrico completo: obras PROAGUA, PEAS, PRODDER, PTAR, avances, alertas, estimaciones y documentos.\n\nAnalizo desviaciones físico-financieras, inversión por programa, alertas críticas y te comparto enlaces directos a cada obra.\n\nMantengo el hilo de nuestra conversación. ¿Cómo puedo ayudarte hoy?',
  programas: ['PROAGUA', 'PEAS', 'PRODDER'],
  dependencias: ['CONAGUA'],
  assistantSuggestions: [
    'Físico vs financiero en PROAGUA y PEAS',
    'Detalle PTAR: avances, docs y alertas',
    'Alertas críticas sin atender en saneamiento',
    'Inversión por programa y macromedición',
    'Estimaciones y documentos pendientes de validar',
    'Obras PROAGUA en riesgo con enlaces',
  ],
  demoEmail: 'estatal@conagua.gob.mx',
  demoPasswordHint: 'Conagua2024!',
  logoSrc: 'brands/conagua/logo.jpg',
  logoAlt: 'CONAGUA - Comision Nacional del Agua',
  colors: {
    primary: '#1B3664',
    primaryLight: '#3B83BD',
    secondary: '#2A6F97',
    accent: '#C5A059',
    surface: '#F5F7FA',
    surfaceDark: '#E2E8F0',
  },
  roleColors: {
    estatal: '#1B3664',
    municipal: '#2A6F97',
    contratista: '#C5A059',
  },
};

const BRANDS: Record<TenantId, BrandConfig> = {
  conagua: CONAGUA_BRAND,
};

function resolveTenantId(): TenantId {
  return 'conagua';
}

function resolvePublicAsset(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = import.meta.env.BASE_URL ?? '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const cleanPath = path.replace(/^\//, '');
  return `${normalizedBase}${cleanPath}`;
}

function withResolvedLogo(brand: BrandConfig): BrandConfig {
  if (!brand.logoSrc) return brand;
  return { ...brand, logoSrc: resolvePublicAsset(brand.logoSrc) };
}

export function getBrand(): BrandConfig {
  return withResolvedLogo(BRANDS[resolveTenantId()]);
}

export function getBrandCssVars(brand: BrandConfig): Record<string, string> {
  return {
    '--brand-primary': brand.colors.primary,
    '--brand-primary-light': brand.colors.primaryLight,
    '--brand-secondary': brand.colors.secondary,
    '--brand-accent': brand.colors.accent,
    '--brand-surface': brand.colors.surface,
    '--brand-surface-dark': brand.colors.surfaceDark,
    '--arkon-primary': brand.colors.primary,
    '--arkon-primary-light': brand.colors.primaryLight,
    '--arkon-secondary': brand.colors.secondary,
    '--arkon-accent': brand.colors.accent,
    '--arkon-surface': brand.colors.surface,
    '--arkon-surface-dark': brand.colors.surfaceDark,
  };
}

/** Chart / map palette: brand trio first, then tenant-neutral accents. */
export function getMunicipioChartColors(): string[] {
  const { colors } = getBrand();
  return [
    colors.primary,
    colors.secondary,
    colors.accent,
    '#38A169',
    '#3182CE',
    '#805AD5',
    '#D69E2E',
    '#DD6B20',
    '#DC2626',
    '#059669',
    '#2B6CB0',
    '#276749',
  ];
}

/** Program IDs mapped to brand colors (keys match obra.programa casing from seed). */
export function getProgramaBrandColors(): Record<string, string> {
  const { colors } = getBrand();
  return {
    fise: colors.primary,
    fism: colors.secondary,
    fortamun: colors.accent,
    fais: '#38A169',
    faeispum: '#D69E2E',
    pem: '#3182CE',
    pds: '#805AD5',
    'proteccion-civil': '#DD6B20',
    PROAGUA: colors.primary,
    PEAS: colors.primaryLight,
    PRODDER: colors.accent,
    proagua: colors.primary,
    peas: colors.primaryLight,
    prodder: colors.accent,
  };
}
