# 05 — Evaluación de dashboards actuales por rol

> Entregable del reanálisis ARKON CONAGUA. Auditoría de widgets por rol (estatal / municipal / contratista): qué es accionable vs. vanidad ("vanity metrics").
>
> Fuentes: `DashboardEstatalPage.tsx`, `DashboardMunicipalPage.tsx`, `DashboardContratistaPage.tsx`, `dashboard.service.ts`, `PendingActionsInbox`, scorecard [16](./16-scorecard-madurez.md).

---

## 1. Marco de evaluación

Cada widget se clasifica:

| Clase | Criterio | Ejemplo SOTA ([08](./08-benchmark-internacional.md) §4) |
|-------|----------|----------------------------------------------------------|
| **Accionable** | Lleva a decisión concreta en ≤2 clics | KPI → lista filtrada de pendientes |
| **Contexto** | Orienta pero no prescribe acción | Distribución por programa |
| **Vanidad** | Número bonito sin umbral ni drill-down | Promedio sin varianza ni tendencia |
| **Ausente** | Dato existe en BD pero no se muestra | SPI, brecha FF, ranking contratista |

Escala de utilidad: ★ (baja) a ★★★★★ (decision-first).

---

## 2. Rol estatal (`DashboardEstatalPage`)

**Usuario tipo:** Director CONAGUA, coordinador regional. **Alcance:** portafolio nacional completo.

### 2.1 KPI cards (6 widgets)

| Widget | Clase | Utilidad | Observación |
|--------|-------|:--------:|-------------|
| Total de acciones | Contexto | ★★☆☆☆ | Sin comparación vs. ejercicio anterior |
| Inversión autorizada | Contexto | ★★★☆☆ | Falta % ejercido con semáforo |
| Acciones en ejecución | Contexto | ★★☆☆☆ | No distingue a tiempo vs. retraso interno |
| Acciones con retraso | **Accionable** | ★★★☆☆ | No es clickable → lista filtrada |
| Avance físico prom. | **Vanidad** | ★☆☆☆☆ | Oculta dispersión; meta "65%" hardcodeada |
| Monto ejercido | Contexto | ★★★☆☆ | Sin curva de erogación |

**Veredicto KPI row:** descriptivo, no "decision-first". Brecha vs. SOTA: sin RAG, sin TCPI, sin cola de decisiones.

### 2.2 Gráficas y mapa

| Widget | Clase | Utilidad | Observación |
|--------|-------|:--------:|-------------|
| Avance programado vs real (línea) | Contexto | ★★★☆☆ | Promedio portafolio; pierde obras outlier |
| Acciones por estatus (barras) | Contexto | ★★★☆☆ | Buena visión de embudo |
| Top 10 municipios | **Accionable** | ★★★★☆ | Click → `/municipios/:id` ✓ |
| Avance físico vs financiero (top 10 \$) | **Accionable** | ★★★★☆ | Muestra brecha; sesgo por monto |
| Inversión por programa (dona) | Contexto | ★★☆☆☆ | Sin % avance por programa |
| `MapaTerritorial` | Contexto | ★★★☆☆ | Marcadores por estatus; sin choropleth |
| Ranking contratistas | **Vanidad** | ★★☆☆☆ | Oculta `ranking_score`; sin drill-down |
| Panel alertas recientes | **Accionable** | ★★★★☆ | Enlace a `/alertas` |
| Export CSV/JSON | Accionable | ★★★★☆ | Cumple patrón transparencia |

### 2.3 Fortalezas estatales

- Mayor densidad visual del sistema (6 KPIs + 6 visualizaciones).
- `DashboardExportActions` alineado a Obra Pública Abierta.
- Integración con `fetchChartTopContratistas` y timeline.

### 2.4 Brechas críticas

1. Sin widget "Qué requiere atención hoy" (existe `getPendientes()` pero en bandeja separada).
2. Sin EVM (SPI/CPI/EAC) pese a datos suficientes.
3. `riesgo` manual no contrastado con brecha calculada.
4. Campos MIR (`cobertura_ap`, `caudal_lps`) invisibles.

**Score rol estatal: 2.5 / 5** — informativo, parcialmente accionable.

---

## 3. Rol municipal (`DashboardMunicipalPage`)

**Usuario tipo:** Ejecutor municipal, CORESE. **Alcance:** filtrado por `municipio_id`.

### 3.1 Widgets

| Widget | Clase | Utilidad | Observación |
|--------|-------|:--------:|-------------|
| KPIs locales (4–5 cards) | Contexto/Vanidad | ★★☆☆☆ | Conteos sin umbrales |
| Lista de obras del municipio | **Accionable** | ★★★★☆ | Navegación a detalle |
| Avances pendientes de validar | **Accionable** | ★★★★★ | Flujo real de trabajo |
| Formulario crear estimación | **Accionable** | ★★★★★ | Operación core |
| `EstimacionesPendientesList` | **Accionable** | ★★★★☆ | Validación municipal |
| Alertas del municipio | **Accionable** | ★★★☆☆ | Filtro por nombre, frágil |
| Alta contratista / obra | Accionable | ★★★☆☆ | Onboarding |
| **Gráficas temporales** | **Ausente** | — | Cero charts Recharts |
| **Mapa local** | **Ausente** | — | Geo solo en estatal |
| Comparación vs. otros municipios | Ausente | — | Benchmarking |

### 3.2 Anti-patrón detectado

Carga N+1: `fetchAvancesByObra` en loop por cada obra municipal (`DashboardMunicipalPage` L69–77). Escala mal; debería ser endpoint agregado.

### 3.3 Veredicto

El dashboard municipal es **operativo** (bandeja implícita) pero **no analítico**. Cumple captura/validación; no ayuda a priorizar entre obras del mismo municipio.

**Score rol municipal: 3.0 / 5** — accionable en workflow, pobre en inteligencia.

---

## 4. Rol contratista (`DashboardContratistaPage`)

**Usuario tipo:** OO / empresa ejecutora. **Alcance:** `contratista_id`.

### 4.1 Widgets

| Widget | Clase | Utilidad | Observación |
|--------|-------|:--------:|-------------|
| KPIs (obras asignadas, avance, alertas) | Contexto | ★★☆☆☆ | Sin meta contractual |
| Formulario reportar avance | **Accionable** | ★★★★★ | Core del rol |
| Pipeline estimaciones | Contexto | ★★★☆☆ | Estados sin SLA |
| Entregables pendientes (plazos) | **Accionable** | ★★★★☆ | Heurística por fecha término |
| Actividad reciente (12 ítems) | Contexto | ★★☆☆☆ | Log, no priorizado |
| Alertas de mis obras | **Accionable** | ★★★☆☆ | Sin acción sugerida |
| Documentos por cargar | **Accionable** | ★★★★☆ | Via bandeja pendientes |
| **Gráficas de desempeño** | **Ausente** | — | Sin histórico propio |
| **Scorecard propio** | **Ausente** | — | Ranking solo visible a estatal |

### 4.2 Veredicto

Orientado a **cumplimiento de reportes**, no a mejora de desempeño. El contratista no ve su posición relativa ni proyección de pago.

**Score rol contratista: 2.8 / 5** — transaccional sólido, cero analytics.

---

## 5. Componente transversal: bandeja de pendientes

`getPendientes()` + `PendingActionsInbox` / `BandejaAccionesPage`:

| Aspecto | Evaluación |
|---------|------------|
| Diseño decision-first | ★★★★★ |
| Matriz por rol (`PENDIENTE_MATRIX`) | ★★★★★ |
| Integración en dashboard principal | ★★☆☆☆ — página separada |
| Severidad y orden | ★★★★☆ |

**Recomendación P0:** widget "Cola de decisiones" (top 5 pendientes) embebido en **cada** dashboard por rol.

---

## 6. Cuadro comparativo vanity vs. accionable

| Rol | Widgets totales (aprox.) | Accionables | Vanidad/Contexto | Ausentes clave |
|-----|:------------------------:|:-----------:|:----------------:|----------------|
| Estatal | ~14 | 4 | 8 | EVM, riesgo calc., MIR |
| Municipal | ~8 | 5 | 3 | Charts, mapa, priorización |
| Contratista | ~7 | 4 | 3 | Score propio, forecast pago |

---

## 7. Plan de mejora (sprint 1–2)

| # | Mejora | Rol | Esfuerzo |
|---|--------|-----|:--------:|
| 1 | KPI clickable → `/acciones?filtro=...` | Todos | Bajo |
| 2 | Widget brecha FF con semáforo RAG | Estatal | Bajo |
| 3 | Cola top-5 pendientes en home | Todos | Bajo |
| 4 | Exponer ranking contratista con score | Estatal | Bajo |
| 5 | Mini timeline avance por obra | Municipal/Contratista | Medio |
| 6 | SPI/CPI en card por programa | Estatal | Medio |
| 7 | Endpoint avances pendientes agregado | Municipal | Medio |

Detalle de dashboards objetivo: entregable 06 (siguiente generación).

---

## 8. Referencias

- KPIs a incorporar: [07-catalogo-kpis.md](./07-catalogo-kpis.md)
- Correlaciones: [04-correlaciones-ocultas.md](./04-correlaciones-ocultas.md)
- Benchmark UX: [08-benchmark-internacional.md](./08-benchmark-internacional.md) §4
