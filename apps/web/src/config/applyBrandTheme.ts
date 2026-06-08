import { getBrand, getBrandCssVars } from './brand';

function hexToHslChannels(hex: string): string {
  const normalized = hex.replace('#', '');
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function applyBrandTheme(): void {
  const brand = getBrand();
  const root = document.documentElement;
  root.dataset.tenant = brand.tenantId;

  const vars = getBrandCssVars(brand);
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }

  const primaryHsl = hexToHslChannels(brand.colors.primary);
  const secondaryHsl = hexToHslChannels(brand.colors.secondary);
  const accentHsl = hexToHslChannels(brand.colors.accent);
  const primaryLightHsl = hexToHslChannels(brand.colors.primaryLight);

  root.style.setProperty('--primary', primaryHsl);
  root.style.setProperty('--secondary', secondaryHsl);
  root.style.setProperty('--accent', accentHsl);
  root.style.setProperty('--ring', primaryHsl);
  root.style.setProperty('--sidebar-background', primaryHsl);
  root.style.setProperty('--sidebar-primary', accentHsl);
  root.style.setProperty('--sidebar-accent', primaryLightHsl);
  root.style.setProperty('--sidebar-ring', accentHsl);
  root.style.setProperty('--sidebar-border', primaryLightHsl);

  document.title = brand.productName;
}
