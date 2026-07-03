# ARKON CONAGUA — Design System (MASTER)

Marca institucional CONAGUA. Producto: **Seguimiento de acciones de los programas** del sector hídrico, con catálogo de **obras físicas** vinculadas.

## Identidad

| Token | Valor | Uso |
|-------|-------|-----|
| `--brand-primary` | `#1B3664` | Encabezados, sidebar, CTAs primarios |
| `--brand-primary-light` | `#3B83BD` | Links, acentos secundarios |
| `--brand-secondary` | `#2A6F97` | KPIs, badges municipales |
| `--brand-accent` | `#C5A059` | Montos, contratistas, highlights |
| `--brand-surface` | `#F5F7FA` | Fondo de app |
| `--brand-surface-dark` | `#E2E8F0` | Bordes, divisores |

## Tipografía

- **Familia:** Inter (system-ui fallback)
- **Cuerpo:** 16px mínimo en móvil, line-height 1.5–1.75
- **Títulos de página:** `text-lg lg:text-xl font-bold text-brand-primary`
- **KPIs:** `text-2xl font-bold` + label `text-xs text-gray-500`
- **Tablas:** `text-xs` / `text-[11px]` para data-dense

## Espaciado y layout

- Contenedor principal: `p-4 lg:p-6`
- Cards: `rounded-lg border border-gray-200 bg-white shadow-sm`
- Grid programas: `grid gap-4 sm:grid-cols-2 lg:grid-cols-3`
- Max ancho legible en copy: ~65–75 caracteres

## Interacción (ui-ux-pro-max)

- Targets táctiles ≥ 44px en botones y filas clicables
- `cursor-pointer` en cards/filas navegables
- Transiciones: `transition-colors duration-200`
- Focus visible: anillo `ring-2 ring-brand-primary/40`
- Skeletons en cargas (`Spinner` / placeholders)
- Iconos: **Lucide** únicamente (sin emojis como iconos)
- `prefers-reduced-motion`: respetar en animaciones futuras

## Z-index

| Capa | Valor |
|------|-------|
| sticky header | 10 |
| drawer móvil | 20 |
| dropdown | 30 |
| toast | 50 |

## Jerarquía de producto (IA)

1. **Bandeja de Acciones** — landing; tareas pendientes del usuario
2. **Programas** — PROAGUA / PEAS / PRODDER con roll-up
3. **Obras** — infraestructura física (1 obra → N acciones)
4. **Acciones** — intervenciones de programa (CUA, montos, avances)
5. **Dashboard** — KPIs ejecutivos (segundo en menú Trabajo)

## Componentes reutilizados

- `@/components/ui/card`, `badge`, `button`, `tabs`, `table`
- `BrandLogo`, variables CSS en `getBrandCssVars()`
- Charts: Recharts con `getMunicipioChartColors()` / `getProgramaBrandColors()`

## Accesibilidad

- Contraste texto/cuerpo ≥ 4.5:1 (slate-900 sobre surface)
- Labels en formularios (`htmlFor` + `id`)
- Tablas con `<th scope="col">`
- Color no es único indicador de estado (badge + texto)

## Anti-patrones

- No mezclar rutas `/obras` (físico) con IDs de acción de programa
- No usar `obra_id` en UI copy; usar "Acción" / "Obra" según `entity` / `obraEntity`
- No glass cards con opacidad < 80% en modo claro
