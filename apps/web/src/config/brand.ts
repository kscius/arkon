export type TenantId = 'arkon' | 'conagua';

export type BrandConfig = {
  tenantId: TenantId;
  productName: string;
  productShortName: string;
  institutionName: string;
  tagline: string;
  loginSubtitle: string;
  assistantName: string;
  assistantGreeting: string;
  /** Program codes for obra forms and filters (tenant-specific). */
  programas?: string[];
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

const ARKON_BRAND: BrandConfig = {
  tenantId: 'arkon',
  productName: 'ARKON',
  productShortName: 'ARKON',
  institutionName: 'Sistema Integral de Gestion de Obras Publicas',
  tagline: 'Plataforma multi-nivel para gobiernos estatales y municipales',
  loginSubtitle: 'Sistema Integral de Gestion de Obras Publicas',
  assistantName: 'Asistente ARKON',
  assistantGreeting:
    'Buen dia. Soy el Asistente Inteligente de ARKON, tu apoyo para la gestion de obras estatales y municipales.\n\nPuedo consultarte avances fisico-financieros, detectar obras con retraso o riesgo, y generar resumenes por programa presupuestal.\n\nComo puedo ayudarte hoy?',
  programas: ['FAPAA', 'CAM', 'FAIS', 'FORTAMUN', 'FOMAGUA', 'FOISE', 'PEF', 'SISPLADE'],
  assistantSuggestions: [
    'Obras con retraso critico',
    'Avance fisico vs financiero',
    'Obras en riesgo de incumplimiento',
    'Presupuesto ejercido por programa',
    'Alertas activas del sistema',
    'Resumen ejecutivo de avances',
  ],
  demoEmail: 'estatal@arkon.gob.mx',
  demoPasswordHint: 'Arkon2024!',
  logoSrc: null,
  logoAlt: 'ARKON',
  colors: {
    primary: '#1B3A5C',
    primaryLight: '#2C5282',
    secondary: '#0D7377',
    accent: '#E8913A',
    surface: '#F7F8FA',
    surfaceDark: '#E2E8F0',
  },
  roleColors: {
    estatal: '#1B3A5C',
    municipal: '#0D7377',
    contratista: '#E8913A',
  },
};

const CONAGUA_BRAND: BrandConfig = {
  tenantId: 'conagua',
  productName: 'CONAGUA',
  productShortName: 'CONAGUA',
  institutionName: 'Comision Nacional del Agua',
  tagline: 'Seguimiento y control de obras publicas del sector hidrico',
  loginSubtitle: 'Comision Nacional del Agua',
  assistantName: 'Asistente CONAGUA',
  assistantGreeting:
    'Buen dia. Soy el Asistente Inteligente de CONAGUA, tu apoyo para el seguimiento de la infraestructura hidrica nacional.\n\nPuedo consultarte avances por programa (PROAGUA, PEAS, PRODDER), detectar obras de agua potable o saneamiento con desviaciones, y revisar el estado de recursos no dispersados.\n\nComo puedo ayudarte hoy?',
  programas: ['PROAGUA', 'PEAS', 'PRODDER'],
  assistantSuggestions: [
    'Obras PROAGUA con retraso',
    'Inversion ejercida por PRODDER',
    'PTAR con avance critico',
    'Obras de saneamiento en riesgo',
    'Eficiencia hidrica y macromedicion',
    'Derechos sin dispersar (PEAS)',
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
  arkon: ARKON_BRAND,
  conagua: CONAGUA_BRAND,
};

function resolveTenantId(): TenantId {
  const raw = (import.meta.env.VITE_TENANT as string | undefined)?.trim().toLowerCase();
  if (raw === 'conagua') return 'conagua';
  return 'arkon';
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
