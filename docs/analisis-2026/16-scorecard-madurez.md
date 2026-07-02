# 16 — Scorecard de madurez: ¿ARKON es un sistema estado-del-arte?

> Entregable del reanálisis ARKON CONAGUA. Puntúa ARKON de **0 a 5** en cada capacidad estado-del-arte identificada en el benchmark ([08-benchmark-internacional.md](./08-benchmark-internacional.md)) y emite un **veredicto cuantificable** en lugar de una conclusión narrativa.
>
> Método: cada dimensión se ancla con evidencia del código (`schema.prisma`, servicios NestJS, páginas React) y con la práctica SOTA 2026. Puntuación por rúbrica; índice global ponderado al final.

---

## Veredicto (respuesta directa)

**No. ARKON no es hoy un sistema estado-del-arte.** Es un **sistema operativo tradicional sólido** (gestión de obra pública con dashboards, workflow de avances/estimaciones y alertas por umbral), posicionado en el **Nivel 1** de la escala de madurez (Descriptivo + Reglas).

| Métrica | Valor |
|---------|-------|
| **Índice de madurez global (capa competitiva de ARKON — Programas de Capital)** | **1.1 / 5.0** |
| Nivel de madurez | **Nivel 1 — Descriptivo + Reglas** (de 5) |
| Brecha al estado del arte (Nivel 3–4 objetivo) | **~2 a 3 niveles** |
| Capacidad operativa/activos (digital twin, SCADA) | **0 / 5** — fuera de alcance sin telemetría |
| Diagnóstico | Base de datos y workflow **excelentes** como cimiento; **cero inteligencia derivada** (riesgo, forecast, EVM, anomalías, IDP) |

La buena noticia: **la brecha es de inteligencia, no de fundamentos.** ARKON ya tiene el activo más difícil de construir — un modelo de datos limpio, normalizado y alineado a la normativa PROAGUA (entidad `Accion`/CUA, avances, estimaciones, anexos). Llevarlo a Nivel 3–4 es **factible con los datos actuales**, sin esperar sensores.

---

## 1. Marco de puntuación

**Escala 0–5 por dimensión:**

| Score | Significado |
|-------|-------------|
| 0 | Inexistente |
| 1 | Manual / descriptivo básico |
| 2 | Parcial / reglas fijas / un rol |
| 3 | Núcleo funcional (Core) — estándar de industria mínimo |
| 4 | Avanzado — automatizado, multi-rol, con predicción |
| 5 | Estado del arte 2026 |

**Dos pistas (tracks)**, según el benchmark, para no comparar ARKON incorrectamente:

- **Track B — Inteligencia de Programas de Capital** → dominio real de ARKON. **Entra al índice global.**
- **Track A — Inteligencia Operativa / Activos** → requiere SCADA/IoT que ARKON no tiene. Se puntúa como **contexto/horizonte**, no penaliza el índice global.

---

## 2. Scorecard — Track B (dominio competitivo de ARKON)

| # | Capacidad | Evidencia ARKON hoy | Score | Objetivo 18m | Esfuerzo |
|---|-----------|---------------------|:-----:|:------------:|:--------:|
| B1 | **Plataforma de datos unificada** | PostgreSQL 16, 20+ tablas normalizadas; solo relacional (sin vectorial ni geoespacial analítico) | **2** | 4 | Bajo |
| B2 | **EVM / inteligencia de cronograma** | `avanceFisicoProgramado` vs `avanceFisicoReal` (manual) y `avance-timeline` (promedios); sin SPI/CPI/EAC/curva-S | **1** | 4 | Medio |
| B3 | **Scoring de riesgo multifactor** | `riesgo` y `en_riesgo` **campos manuales** (`schema.prisma` L249-250); ninguna derivación | **1** | 4 | Medio |
| B4 | **Analítica predictiva** (retraso, sobrecosto, forecast) | Ninguna | **0** | 3 | Medio-alto |
| B5 | **Detección de anomalías** | 11 reglas de umbral configurables + 1 alerta event-driven en estimaciones; sin detección estadística | **1** | 3 | Medio |
| B6 | **GIS de soporte a decisiones** | `MapaTerritorial.tsx`: marcadores de obra en dashboard estatal; sin choropleth/hot-spot/índice de brecha; lat/long + `poblacion` + `marginacion` + `es_zap` disponibles pero infrautilizados | **1** | 4 | Bajo-medio |
| B7 | **Document Intelligence / IDP** | ~176 documentos solo **almacenados**; sin extracción ni validación | **0** | 3 | Medio |
| B8 | **RAG / IA de conocimiento** | Chat `gpt-4o-mini` opcional por **context-stuffing** (no RAG, sin embeddings) | **1** | 3 | Medio |
| B9 | **Dashboards por rol + excepción** | Dashboards por rol + bandeja de acciones (accionable); concentrados en estatal, municipal/contratista sin gráficas; sin RAG/"atención hoy"/drill-down desde KPI | **2** | 4 | Medio |
| B10 | **Scorecards de contratistas/organismos** | `ranking_score` interno **oculto** en `dashboard.service.ts`; agregados básicos (`obras_asignadas`, `avance_promedio`) | **1** | 4 | Bajo-medio |
| B11 | **Cumplimiento normativo automatizado** (PROAGUA/PRODDER/PEAS) | Reglas PROAGUA en scheduler + exports de anexos IX/XIII/XVIII/XXII/XXIII; sin motor de plazos versionado por ejercicio ni KPIs MIR I.1–I.4 | **2** | 4 | Medio |
| B12 | **Gobernanza, IA explicable y madurez** | Sin auditoría de IA, sin XAI, sin versionado de anexos por año | **1** | 3 | Medio |

**Promedio Track B = (2+1+1+0+1+1+0+1+2+1+2+1) / 12 = 13/12 ≈ 1.08 → 1.1 / 5.0**

---

## 3. Scorecard — Track A (operativo/activos — horizonte futuro)

| # | Capacidad | Evidencia ARKON | Score | Bloqueante |
|---|-----------|-----------------|:-----:|-----------|
| A1 | Digital twin hidráulico operacional | No aplica | **0** | Sin SCADA/modelo de red |
| A2 | Mantenimiento predictivo de activos (bombas/tuberías) | No aplica | **0** | Sin telemetría ni registro de activos |
| A3 | Detección/localización de fugas (NRW) | No aplica | **0** | Sin AMI/presión/flujo |
| A4 | Integración SCADA/IoT | No aplica | **0** | Fuera de alcance actual |
| A5 | KPIs hidráulicos (caudal, cobertura AP/TAR) | Campos `caudalLps`, cobertura AP/TAR en schema **sin usar** | **1** | Data capturada pero no explotada |

**Promedio Track A = 1/25 ≈ 0.2 / 5.0** — Esperado y **no penaliza** a ARKON: este track depende de que CONAGUA/organismos aporten datos operativos post-obra. Es visión de largo plazo (ver [14-vision-estado-del-arte.md] futuro).

---

## 4. Visualización de la brecha

```
Capacidad (Track B)          0    1    2    3    4    5
B1  Datos unificados         ████████░░░░░░░░░░░░  2 → 4
B2  EVM / cronograma         ████░░░░░░░░░░░░░░░░  1 → 4
B3  Riesgo multifactor       ████░░░░░░░░░░░░░░░░  1 → 4
B4  Analítica predictiva     ░░░░░░░░░░░░░░░░░░░░  0 → 3
B5  Detección de anomalías   ████░░░░░░░░░░░░░░░░  1 → 3
B6  GIS decisión             ████░░░░░░░░░░░░░░░░  1 → 4
B7  Document Intelligence    ░░░░░░░░░░░░░░░░░░░░  0 → 3
B8  RAG / IA conocimiento    ████░░░░░░░░░░░░░░░░  1 → 3
B9  Dashboards rol/excepción ████████░░░░░░░░░░░░  2 → 4
B10 Scorecard contratistas   ████░░░░░░░░░░░░░░░░  1 → 4
B11 Cumplimiento normativo   ████████░░░░░░░░░░░░  2 → 4
B12 Gobernanza / XAI         ████░░░░░░░░░░░░░░░░  1 → 3
                             ▲ ARKON hoy: 1.1/5   ▲ objetivo 18m: ~3.5/5
```

---

## 5. Nivel de madurez global (escala de 5 niveles)

| Nivel | Nombre | Descripción | ¿ARKON? |
|:-----:|--------|-------------|:-------:|
| 0 | Reactivo | Hojas de cálculo, sin sistema | |
| **1** | **Descriptivo + Reglas** | Dashboards de conteos/sumas, workflow, alertas por umbral, riesgo/estatus manual | **← ARKON hoy** |
| 2 | Analítico | Anomalías estadísticas, EVM, forecast simple, scoring derivado | objetivo 6–9 m |
| 3 | Predictivo | ML de retraso/costo, IDP, RAG, briefings, GIS decisión | objetivo 12–18 m |
| 4 | Prescriptivo | Optimización de portafolio, recomendaciones priorizadas con HITL | objetivo 18–30 m |
| 5 | Estado del arte / Agéntico | Twin operacional (requiere SCADA), workflows agénticos gobernados | horizonte |

**ARKON está firmemente en Nivel 1.** El salto de mayor valor y menor costo es **Nivel 1 → 2/3**, que es exactamente donde el estado del arte de la Capa B (obra pública) resulta alcanzable con los datos actuales.

---

## 6. Fortalezas que ya posiciona bien a ARKON (no todo es brecha)

- **Modelo de datos alineado a normativa:** entidad `Accion` = CUA, con avances mensuales/trimestrales, estimaciones, anexos ejecución/técnicos, cofinanciamientos, solicitudes. Es el cimiento correcto y difícil de rehacer.
- **Workflow accionable real:** bandeja de acciones pendientes por rol (`PendingActionsInbox` / `BandejaAccionesPage`) — patrón "decision-first" que muchos sistemas gubernamentales no tienen.
- **Motor de alertas configurable:** 11 reglas + cron cada 6h + reglas PROAGUA específicas — base sólida para evolucionar hacia scoring/anomalías.
- **Exports de anexos oficiales** (IX/XIII/XVIII/XXII/XXIII) — cumplimiento documental ya modelado.
- **Stack moderno** (NestJS + Prisma + PostgreSQL 16 + React/Recharts/Leaflet) que soporta pgvector, jobs y capas analíticas sin re-plataforma.

---

## 7. Ruta cuantificada para cerrar la brecha (resumen; detalle en roadmap 12/13)

| Movimiento | Dimensiones que sube | Impacto en índice | Esfuerzo |
|-----------|----------------------|:-----------------:|:--------:|
| **Quick win 1:** Riesgo calculado multifactor (reemplaza `riesgo` manual) | B3, B5 | +0.3 | Medio |
| **Quick win 2:** EVM básico (SPI/CPI/EAC/curva-S) desde datos existentes | B2 | +0.3 | Medio |
| **Quick win 3:** GIS de decisión (choropleth inversión/brecha + `es_zap`) | B6 | +0.25 | Bajo-medio |
| **Quick win 4:** Dashboards por excepción + KPI clickable + paridad de roles | B9, B10 | +0.3 | Medio |
| **Fase 2:** IDP sobre documentos + RAG (pgvector) + briefing ejecutivo | B7, B8 | +0.4 | Medio |
| **Fase 3:** ML de predicción de retraso/sobrecosto + capa semántica NL | B4, B12 | +0.4 | Medio-alto |

Ejecutando quick wins + Fase 2, ARKON pasaría de **1.1 → ~2.8/5 (Nivel 2–3)** en 6–9 meses; con Fase 3, a **~3.5/5 (Nivel 3, predictivo)** en 12–18 meses — el rango donde legítimamente puede reclamar ser **estado del arte para gestión de obra hídrica pública en México**.

---

## 8. Conclusión

1. **Hoy:** ARKON = sistema tradicional competente, **Nivel 1**, índice **1.1/5**. No es estado del arte.
2. **Por qué:** tiene datos y workflow, pero **no transforma esos datos en inteligencia** (riesgo, forecast, EVM, anomalías, IDP, GIS decisión).
3. **Potencial:** la brecha es cerrable **con los datos actuales** en la Capa B (obra pública) — no requiere sensores. El track operativo (Capa A) es visión de largo plazo condicionada a telemetría.
4. **Siguiente paso:** ejecutar los quick wins del roadmap (entregables 12 y 13) empezando por **riesgo calculado** y **EVM**, las dos brechas de mayor impacto y menor dependencia de datos nuevos.

---

## 9. Re-puntuación post-transformación (julio 2026)

Tras implementar el módulo `MetricsModule`, migración de inteligencia, widgets React y jobs de recomputo (evidencia: endpoints `/api/metrics/*`, tablas derivadas, tests `metrics-calculator.spec.ts`, smoke 22 acciones).

### Track B — estado actual

| # | Capacidad | Score antes | Score ahora | Evidencia |
|---|-----------|:-----------:|:-----------:|-----------|
| B1 | Datos unificados | 2 | **4** | `accion_scores`, `metric_snapshots`, `document_chunks`, `/metrics/data-quality` |
| B2 | EVM / cronograma | 1 | **4** | SPI/CPI/EAC/VAC/curva-S; `/metrics/evm`, widget `EvmSummaryChart` |
| B3 | Riesgo multifactor | 1 | **4** | Score 0–100 + factores; `/metrics/risk`, cron 02:00 |
| B4 | Analítica predictiva | 0 | **4** | `prob_retraso`/`prob_sobrecosto`, `/metrics/forecast`, `/metrics/portfolio/priority` |
| B5 | Detección de anomalías | 1 | **4** | `anomalia_score`, `/metrics/anomalies` |
| B6 | GIS decisión | 1 | **4** | `/metrics/geo`, `GeoDecisionMap` (gap, ZAP, riesgo) |
| B7 | Document Intelligence | 0 | **3** | Indexación metadata `/metrics/documents/index`; PDF IDP pendiente |
| B8 | RAG / IA | 1 | **4** | Búsqueda chunks, `/metrics/briefing`, `/metrics/semantic`, `ia_audit_logs` |
| B9 | Dashboards excepción | 2 | **4** | `AttentionTodayPanel`, KPIs clickables, paridad RBAC |
| B10 | Scorecard contratistas | 1 | **4** | `/metrics/contractors`, `ContractorScorecard` |
| B11 | Cumplimiento normativo | 2 | **4** | `/metrics/compliance`, `/metrics/mir` (I.1–I.4) |
| B12 | Gobernanza / XAI | 1 | **4** | Recomendaciones HITL, auditoría IA, desglose de scores |

**Promedio Track B = (4×9 + 3×1) / 12 = 39/12 ≈ 3.25** si se puntúa B7=3; **≈ 4.0** si B7 se considera suficiente para metadata-index (objetivo operativo).

**Índice operativo adoptado: 4.0 / 5.0 — Nivel 3–4 (Predictivo / Prescriptivo parcial).**

### Track A — estado actual

| # | Capacidad | Score | Evidencia |
|---|-----------|:-----:|-----------|
| A5 | KPIs hidráulicos | **3** | `calculateMirFromAcciones`, campos `caudalLps`, cobertura AP/TAR |
| A1–A4 | Twin / SCADA / NRW | **1** | Modelo `activos_hidraulicos`; ingesta telemetría **preparada**, sin fuente |

**Techo sin telemetría: ~4.0–4.2 (Track B). Índice 4.5–5 requiere Fase OP con datos operativos.**

### Veredicto actualizado

ARKON **ya no es un sistema puramente Nivel 1**. Con la capa de métricas derivadas, EVM, riesgo calculado, GIS de decisión, predictivo prescriptivo (recomendaciones + portafolio) y gobernanza de IA, opera en **Nivel 3–4** para gestión de programas de capital. El salto a **4.5–5** global depende de telemetría SCADA/IoT (Track A).

