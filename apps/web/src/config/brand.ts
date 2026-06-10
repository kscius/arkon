export type TenantId = 'arkon' | 'conagua' | 'ceaspue';

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
  /** Optional institutional banner on login (CEASPUE / Gobierno del Estado). */
  loginBannerSrc?: string | null;
  /** Invert logo colors on dark login header. */
  logoInvertOnDark?: boolean;
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
    'Buen dia. Soy el Asistente Inteligente de ARKON. Consulto obras, alertas, avances, estimaciones, documentos, observaciones, contratistas y municipios en tiempo real.\n\nCruzo datos fisico-financieros, detecto riesgos, resumo por programa (FAPAA, CAM, FAIS) y te envio enlaces directos a cada obra.\n\nRecuerdo el contexto de nuestra conversacion. Como puedo ayudarte hoy?',
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
    'Estimaciones en revision sin validar',
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
  institutionName: 'Comision Nacional del Agua',
  tagline: 'Seguimiento y control de obras publicas del sector hidrico',
  loginSubtitle: 'Comision Nacional del Agua',
  assistantName: 'Asistente CONAGUA',
  assistantGreeting:
    'Buen dia. Soy el Asistente Inteligente de CONAGUA. Accedo al portafolio hidrico completo: obras PROAGUA, PEAS, PRODDER, PTAR, avances, alertas, estimaciones y documentos.\n\nAnalizo desviaciones fisico-financieras, inversion por programa, alertas criticas y te comparto enlaces directos a cada obra.\n\nMantengo el hilo de nuestra conversacion. Como puedo ayudarte hoy?',
  programas: ['PROAGUA', 'PEAS', 'PRODDER'],
  dependencias: ['CONAGUA'],
  assistantSuggestions: [
    'Fisico vs financiero en PROAGUA y PEAS',
    'Detalle PTAR: avances, docs y alertas',
    'Alertas criticas sin atender en saneamiento',
    'Inversion por programa y macromedicion',
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

const CEASPUE_BRAND: BrandConfig = {
  tenantId: 'ceaspue',
  productName: 'CEASPUE',
  productShortName: 'CEASPUE',
  institutionName: 'Comision Estatal de Agua y Saneamiento del Estado de Puebla',
  tagline: 'Comision Estatal de Agua y Saneamiento del Estado de Puebla',
  loginSubtitle: 'Sistema de Gestion de Obras Publicas',
  assistantName: 'Asistente Inteligente de CEASPUE',
  assistantGreeting:
    'Buen dia. Soy el Asistente Inteligente de CEASPUE, tu apoyo para la gestion de obras de agua y saneamiento en el estado de Puebla.\n\nPuedo consultarte avances fisico-financieros, detectar obras con retraso o riesgo, y generar resumenes por programa presupuestal.\n\nComo puedo ayudarte hoy?',
  programas: ['FAPAA', 'CAM', 'FAIS', 'FORTAMUN', 'FOMAGUA', 'FOISE', 'PEF', 'SISPLADE'],
  dependencias: [
    'Comision Estatal de Agua y Saneamiento de Puebla',
    'SOAPAP',
    'Organismo Operador Municipal de Agua',
    'Secretaria de Infraestructura',
  ],
  assistantSuggestions: [
    'Obras con retraso critico',
    'Avance fisico vs financiero',
    'Obras de agua potable en riesgo',
    'Presupuesto ejercido por programa',
    'Alertas activas del sistema',
    'Resumen ejecutivo de avances',
  ],
  demoEmail: 'estatal@sigopem.gob.mx',
  demoPasswordHint: 'Sigopem2024!',
  logoSrc: 'brands/ceaspue/logo.png',
  loginBannerSrc: 'brands/ceaspue/banner.png',
  logoInvertOnDark: true,
  logoAlt: 'CEASPUE - Comision Estatal de Agua y Saneamiento del Estado de Puebla',
  colors: {
    primary: '#8B1538',
    primaryLight: '#A8193F',
    secondary: '#6B1028',
    accent: '#C41E5C',
    surface: '#F7F8FA',
    surfaceDark: '#E2E8F0',
  },
  roleColors: {
    estatal: '#8B1538',
    municipal: '#6B1028',
    contratista: '#C41E5C',
  },
};

const BRANDS: Record<TenantId, BrandConfig> = {
  arkon: ARKON_BRAND,
  conagua: CONAGUA_BRAND,
  ceaspue: CEASPUE_BRAND,
};

function resolveTenantId(): TenantId {
  const raw = (import.meta.env.VITE_TENANT as string | undefined)?.trim().toLowerCase();
  if (raw === 'conagua') return 'conagua';
  if (raw === 'ceaspue') return 'ceaspue';
  return 'arkon';
}

function resolvePublicAsset(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = import.meta.env.BASE_URL ?? '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const cleanPath = path.replace(/^\//, '');
  return `${normalizedBase}${cleanPath}`;
}

function withResolvedAssets(brand: BrandConfig): BrandConfig {
  const resolved: BrandConfig = { ...brand };
  if (brand.logoSrc) {
    resolved.logoSrc = resolvePublicAsset(brand.logoSrc);
  }
  if (brand.loginBannerSrc) {
    resolved.loginBannerSrc = resolvePublicAsset(brand.loginBannerSrc);
  }
  return resolved;
}

export function getBrand(): BrandConfig {
  return withResolvedAssets(BRANDS[resolveTenantId()]);
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
