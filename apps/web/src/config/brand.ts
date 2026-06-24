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

const ARKON_BRAND: BrandConfig = {
  tenantId: 'arkon',
  productName: 'ARKON',
  productShortName: 'ARKON',
  institutionName: 'Sistema Integral de Gestión de Obras Públicas',
  tagline: 'Plataforma multi-nivel para gobiernos estatales y municipales',
  loginSubtitle: 'Sistema Integral de Gestión de Obras Públicas',
  assistantName: 'Asistente ARKON',
  assistantGreeting:
    'Buen día. Soy el Asistente Inteligente de ARKON. Consulto obras, alertas, avances, estimaciones, documentos, observaciones, contratistas y municipios en tiempo real.\n\nCruzo datos físico-financieros, detecto riesgos, resumo por programa (FAPAA, CAM, FAIS) y te envío enlaces directos a cada obra.\n\nRecuerdo el contexto de nuestra conversación. ¿Cómo puedo ayudarte hoy?',
  programas: ['FAPAA', 'CAM', 'FAIS', 'FORTAMUN', 'FOMAGUA', 'FOISE', 'PEF', 'SISPLADE'],
  dependencias: [
    'Comision de Agua Potable',
    'Proteccion Civil Estatal',
    'Secretaria de Cultura',
    'Secretaria de Cultura y Deporte',
    'Secretaria de Desarrollo Social',
    'Secretaria de Educacion',
    'Secretaria de Energia',
    'Secretaria de Infraestructura',
    'Secretaria de Salud',
    'Secretaria del Medio Ambiente',
  ],
  assistantSuggestions: [
    'Compara fisico vs financiero por programa',
    'Detalle de obra: avances, docs y observaciones',
    'Alertas criticas sin atender y acciones sugeridas',
    'Inversion total por municipio y dependencia',
    'Estimaciones en revisión sin validar',
    'Obras en riesgo con enlaces directos',
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
  institutionName: 'Comisión Nacional del Agua',
  tagline: 'Seguimiento y control de obras públicas del sector hídrico',
  loginSubtitle: 'Comisión Nacional del Agua',
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
