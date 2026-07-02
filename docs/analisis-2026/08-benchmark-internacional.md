# 08 — Benchmark internacional: sistemas de gestión de infraestructura hídrica (2025–2026)

> Entregable del reanálisis ARKON CONAGUA. Responde a la pregunta **"¿qué es el estado del arte en 2026?"** para poder medir la brecha de ARKON en el scorecard ([16-scorecard-madurez.md](./16-scorecard-madurez.md)).
>
> Fuentes: 7 investigaciones paralelas (plataformas de agua, EAM/ISO 55000, digital twin/mantenimiento predictivo, project controls/EVM, GIS, IA aplicada, marco regulatorio México). URLs citadas por sección.

---

## 0. Resumen ejecutivo del benchmark

El estado del arte 2026 **no es un solo producto**, sino la convergencia de **dos capas** que ARKON debe distinguir para no compararse incorrectamente:

- **Capa A — Inteligencia Operativa / de Activos** (utilities operadoras): gemelos digitales hidráulicos, detección de fugas/NRW, mantenimiento predictivo de bombas/tuberías, integración SCADA/IoT. **Requiere telemetría** que ARKON **no** tiene hoy.
- **Capa B — Inteligencia de Programas de Capital / Obra Pública** (dueños de programa, agencias, gobierno): EVM (SPI/CPI/EAC), scoring de riesgo de portafolio, predicción de retraso/sobrecosto, scorecards de contratistas, dashboards por rol, transparencia georreferenciada. **Se alimenta de datos de proyecto/financieros** — exactamente los que ARKON ya posee.

**Conclusión de posicionamiento:** ARKON compite en la **Capa B** (gestión de obra federal PROAGUA/PRODDER/PEAS). Contra esa capa, el estado del arte es **alcanzable** con la data actual. La Capa A es un horizonte futuro que depende de que CONAGUA/organismos operadores aporten SCADA o registros de activos post-obra.

---

## 1. Plataformas de referencia global

### 1.1 Capa A — Operativa / activos (utilities)

| Plataforma | Enfoque | Capacidades estado-del-arte | Depende de |
|-----------|---------|----------------------------|------------|
| **Autodesk / Innovyze Info360 + OpenFlows** | Modelado hidráulico + operación + capital | Gemelo operacional recalibrado en near-real-time, forecast de demanda con ML, deterioration modeling (Weibull), IA de defectos CCTV | SCADA/IoT + GIS |
| **Bentley OpenFlows WaterSight + iTwin** | Gemelo digital hidráulico | Simulación en vivo, MNF, Anomaly Leak Finder con ML (caso PUB Singapur), what-if por activo | SCADA/AMI |
| **Esri ArcGIS Utility Network** | System of record geoespacial de red | Modelo de red conectada, trazabilidad, dashboards por audiencia | Topología de red (tuberías/válvulas) |
| **Oracle Utilities WAM** | EAM/CMMS ciclo de vida | Asset Performance Management, GenAI Asset Summarization, next-best-action | Registro de activos + sensores |
| **IBM Maximo (MAS)** | EAM empresarial | Monitor (IoT), Predict (fallas de bombas), Health (condition scores), APM | SCADA/IoT |
| **SAP Intelligent Asset Management** | ERP + EAM + APM | Linear/Spatial Asset Management (federación Esri), ASPM (RCM/FMEA) | Registro + finanzas + IoT |
| **Xylem Vue / Siemens SIWA / SUEZ Aquadvanced / Veolia Hubgrade / AVEVA** | Suites operativas del ciclo del agua | NRW, DMAs virtuales, optimización energética/química, digital twin de planta | SCADA/AMI/telemetría |

**Lectura para ARKON:** todas estas suites brillan en **operación** de redes/plantas. Su valor transferible a ARKON es de **patrones**: integración de datos, dashboards por rol, alertas inteligentes, gobernanza de KPIs — no sus motores hidráulicos.

### 1.2 Capa B — Programas de capital / obra pública (el dominio de ARKON)

| Plataforma | Enfoque | KPIs / capacidades relevantes |
|-----------|---------|-------------------------------|
| **Oracle Primavera P6 / Cloud / Unifier** | Project controls | EVM nativo (CPI/SPI/EAC), portfolio scorecards, IA de resúmenes y pagos (Unifier 2026) |
| **InEight** | Controles integrados costo-cronograma | EVM ligado a WBS, CSRA (riesgo costo-cronograma), Schedule Critique con IA, recomendaciones de mitigación |
| **Procore (owners suite 2026)** | PMIS dueños | Portfolio + capital planning, Analytics/Helix, riesgo financiero/cronograma con IA agéntica |
| **Kahua** | PMIS gobierno (FedRAMP/CMMC) | Noa AI (resúmenes, retrieval), kBuilder NL apps |
| **Autodesk Construction Cloud** | Construcción | Construction IQ (ML de riesgo), Insight Executive Overview, Data Connector → BI |
| **SmartPM / XIS / PrimControls** | Overlays analíticos | 35+ métricas de calidad de cronograma, fecha de término predicha, índice de riesgo 0–100 |

### 1.3 Autoridades nacionales / referencia de gobierno

| Sistema | Patrón destacado |
|---------|------------------|
| **Singapur — PUB (SMART PUB / IWMS)** | Centro de mando integral end-to-end; IWMS reduce 75% tiempo de planificación de demanda |
| **Reino Unido — Ofwat / Discover Water** | Regulación por *outcomes*: 24 performance commitments comunes, dashboard comparativo inter-utility, categorías leading/average/lagging |
| **Australia — Sydney Water + InEight (P4S)** | Plataforma unificada dueño + 12 constructoras, visibilidad costo/cronograma/contratista en tiempo real |
| **México — Obra Pública Abierta (SHCP)** | Mapa georreferenciado, búsqueda de proyecto, API de datos abiertos, avance físico/financiero, refresco trimestral |
| **DPWH Filipinas / PAIMANA India / World Bank STEP** | Conteos por etapa de ciclo, costo original vs revisado, % avance, drill-down mapa+tabla |

---

## 2. Las 12 capacidades que definen el estado del arte (2026)

Síntesis transversal de las 7 investigaciones. Estas son las **dimensiones del scorecard**.

| # | Capacidad SOTA 2026 | Capa | ¿Factible con datos ARKON hoy? |
|---|---------------------|------|--------------------------------|
| 1 | **Plataforma de datos unificada** (relacional + documentos + geo + vectorial) | A+B | Sí — ya es PostgreSQL 16 |
| 2 | **EVM e inteligencia de cronograma** (SPI, CPI, EAC, TCPI, curva-S, BEI/CPLI) | B | **Sí** — con avances/estimaciones/fechas existentes |
| 3 | **Scoring de riesgo multifactor** (PoF×CoF / índice 0–100 con explicabilidad) | A+B | **Sí** — reemplaza el `riesgo` manual |
| 4 | **Analítica predictiva** (retraso, sobrecosto, forecast de avance/erogación) | B | Parcial — reglas+regresión hoy; ML cuando N crezca |
| 5 | **Detección de anomalías** (físico-financiero, estimaciones, procurement) | B | **Sí** — Isolation Forest / z-score / reglas |
| 6 | **GIS de soporte a decisiones** (choropleth, hot-spots, índice de brecha equitativo) | A+B | **Sí** — lat/long + población + marginación + `es_zap` |
| 7 | **Document Intelligence / IDP** (extracción de PDFs, validación vs BD) | B | Sí (piloto con HITL) — sobre los ~176 documentos |
| 8 | **RAG sobre documentos + normativa** (pgvector, búsqueda híbrida) | B | **Sí** — corpus pequeño pero de alto valor |
| 9 | **Dashboards por rol + excepción** (RAG, "qué requiere atención hoy", drill-down) | B | **Sí** — evolución de dashboards actuales |
| 10 | **Scorecards de contratistas/organismos** (multi-dimensional ponderado) | B | Sí (heurístico primero, ML después) |
| 11 | **Digital twin operacional + mantenimiento predictivo de activos** | A | **No** — requiere SCADA/IoT/registro de activos |
| 12 | **Gobernanza, IA explicable y madurez medible** (auditoría, SHAP, XAI, versionado normativo) | A+B | **Sí** — requisito de diseño, no de datos |

---

## 3. KPIs estándar de la industria (catálogo de referencia)

### 3.1 Inteligencia de cronograma / costo (EVM) — núcleo Capa B

| KPI | Fórmula | Interpretación |
|-----|---------|----------------|
| SPI | EV / PV | <1 = atraso en trabajo devengado |
| CPI | EV / AC | <1 = sobrecosto |
| EAC | AC + (BAC − EV)/CPI | Costo final pronosticado |
| EAC (compuesto) | AC + (BAC − EV)/(CPI×SPI) | Pesimista cuando ambos caen |
| TCPI | (BAC − EV)/(BAC − AC) | Eficiencia requerida; >1.10 usualmente irrecuperable |
| VAC | BAC − EAC | Brecha final de presupuesto |
| Curva-S | PV/EV/AC acumulado en el tiempo | Brecha PV–EV = cronograma; EV–AC = costo |
| BEI / CPLI | índices de ejecución y ruta crítica | ≥0.95 = ejecutando a plan |

> **Nota clave:** los líderes automatizan EV/AC desde campo + ERP con **reglas de medición física** (unidades completas, pesos de hito), no % subjetivo (ANSI/EIA-748 Rev E, 27 guías).

### 3.2 Asset management / ISO 55000 — Capa A (horizonte futuro)

Índice de Salud de Activos (AHI), Infrastructure Value Index (IVI), Asset Sustainability Index (ASI = presupuestado/necesario), backlog de mantenimiento, condition index 1–5, criticidad PoF×CoF, RUL/% vida remanente, BRE ($). Estándares: ISO 55001:2024, GFMAM Landscape v3, IIMM 7, ISO 24516/24510–12, guía EPA, roadmap Ofwat 2025–27.

### 3.3 KPIs oficiales México (MIR/SED — obligatorios, no inventar paralelos)

| ID | Indicador | Fórmula (resumen) |
|----|-----------|-------------------|
| I.1 | % población con acceso formal a agua potable | Hab. incorporados / pob. sin acceso × 100 |
| I.2 | % población con acceso formal a alcantarillado | Análogo alcantarillado/saneamiento |
| I.3 | % cobertura de tratamiento de aguas residuales | Caudal tratado / caudal colectado × 100 |
| I.4 | % caudal desinfectado | Caudal desinfectado / caudal producido × 100 |

Reporte a SHCP vía PASH; CONAC trimestral; fiscalización ASF. Fuente: Reglas PROAGUA 2025 (DOF 5750579), Anexo I.

---

## 4. Convenciones de dashboard / UX (2025–2026)

- **Tres capas de dashboard:** estratégico (KPIs agregados) → analítico (tendencias) → operacional (tiempo real/alarmas). Referencia: ArcGIS Dashboards, AVEVA UOC.
- **Diseño "decision-first" y por excepción:** partir de 3 preguntas ejecutivas semanales; mostrar outliers, no todo. Portafolio "en verde" = escaneo rápido.
- **8–12 métricas por rol**; umbrales RAG objetivos (Verde <5% variación, Ámbar 5–15%, Rojo >15%); flechas de tendencia en cada celda.
- **Drill-down:** portafolio → programa → proyecto → contratista → estimación/documento. KPI clickable → lista filtrada.
- **"Cola de decisiones":** ítems esperando acción del ejecutivo + días en espera.
- **"Qué requiere atención hoy":** riesgos estancados, decisiones bloqueadas, top slips de ruta crítica.
- **Forecast con supuestos** (EAC + rango de confianza, no punto único).
- **Mapa + serie temporal + tabla + export/API** (patrón de transparencia Obra Pública Abierta).
- **Accesibilidad WCAG 2.1/2.2 AA:** color + icono (no color solo); glosario de métricas; "última actualización" visible.
- **Vistas por rol:** Director/CONAGUA central (portafolio RAG, brecha físico-financiera, top-10 en riesgo, scorecard contratistas, cola de decisiones); Estatal/OO (KPIs de programa, mapa, estimaciones pendientes, alertas); Contratista (cumplimiento de hitos, documentos, pipeline de pagos); Ciudadanía (subconjunto público read-only).

---

## 5. IA aplicada — patrones estado-del-arte (backend-first)

El SOTA 2026 separa **analítica determinista** (reglas, EVM, ML scoring) de **capa LLM probabilística** (resúmenes, extracción, retrieval). Las plataformas maduras exponen la IA como **jobs programados + salidas de API** (scores, campos extraídos, briefings, flags de anomalía), **no como chat**.

**Ladder de madurez de IA (dominio obra pública):**

```
Nivel 0 — Descriptivo    Dashboards, CSV, riesgo/estatus manual   ← ARKON hoy
Nivel 1 — Reglas         Alertas por umbral, EVM, cumplimiento     ← ARKON parcial
Nivel 2 — ML/Estadística Anomalías, clasificadores de retraso, forecast
Nivel 3 — LLM/RAG        IDP, resúmenes, retrieval semántico, métricas NL
Nivel 4 — Multimodal     Progreso por foto/dron, OCR de planos
Nivel 5 — Agéntico       Workflows orquestados con human-in-the-loop + gates
```

**Antipatrones a retirar** (todos presentes o latentes en ARKON): *context stuffing* de toda la BD en el prompt del chat; text-to-SQL crudo sin supervisión; KPIs generados por el LLM sin fundamento SQL.

**Reglas de diseño confirmadas por la investigación:**
- El LLM **narra**; los números vienen de SQL.
- **No** exponer text-to-SQL crudo a ejecutivos (~64% precisión, errores silenciosos). Usar **capa semántica de métricas** (98–100% en métricas cubiertas, falla en voz alta).
- RAG sobre PostgreSQL + **pgvector HNSW** + full-text/trigram + RRF; supera al context-stuffing en corpus >20–50 registros.
- IDP con **human-in-the-loop** obligatorio para documentos con efecto legal/pago.

**Casos de uso de mayor ROI para ARKON (ver detalle en [10-oportunidades-ia.md] futuro):** P0 scoring de riesgo nocturno; P0 detección de anomalía físico-financiera; P1 IDP sobre PDFs; P1 briefing ejecutivo semanal; P1 RAG sobre documentos + normativa; P2 forecast EVM; P2 índice de desempeño de contratistas; P2 capa semántica de métricas NL.

---

## 6. Restricciones regulatorias mexicanas que condicionan el diseño

Del análisis del marco CONAGUA 2024–2026 (ver detalle en [09-adaptacion-mexico.md] futuro):

- **Entidad central = Acción (CUA)**, no solo "obra"; PROAGUA | PRODDER | PEAS con reglas distintas pero expediente común. (ARKON ya modeló `Accion` — decisión acertada.)
- **Motor de plazos parametrizable por ejercicio fiscal** (Tabla 5 Reglas 2025: solicitud, Comité Técnico 30d, formalización 5d, licitación 30d, avances primeros 5 días de cada mes, conclusión 31-dic, cierre enero, reintegro 15 días a TESOFE).
- **Anexos versionados por año** (numeración 2025 ≠ Lineamientos U074 2026; ej. Anexo XXIII = informe final aparece en 2026).
- **Transición PRODDER → PEAS** (DOF 03-mar-2026): nuevo flujo prestador-centric por derechos (LFD 231-A / art. 279), vertientes A/B.
- **KPIs = MIR I.1–I.4** (no inventar indicadores paralelos); reporte PASH + CONAC trimestral.
- **IA explicable y con aprobación humana** para pagos/sanciones/estatus legal; trazabilidad para ASF; **LGPDPPSO** (minimización de PII, RBAC, no entrenar con datos identificables sin base legal); separar datasets públicos (obras, montos) de expedientes con PII.

---

## 7. Implicaciones directas para ARKON

| Dimensión SOTA | Estado ARKON (evidencia código) | Prioridad de brecha |
|----------------|--------------------------------|---------------------|
| EVM / curva-S / SPI-CPI | Ausente; solo promedios y `avance-timeline` | **Alta** |
| Riesgo calculado | `riesgo`/`en_riesgo` **manuales** (schema.prisma L249-250) | **Crítica** |
| Predicción retraso/costo | Ninguna | Alta |
| Anomalía físico-financiera | Solo una alerta event-driven en estimaciones | Alta |
| GIS decisión | Solo marcadores en dashboard estatal (`MapaTerritorial.tsx`) | Media-alta |
| IDP / documentos | Solo almacenamiento (~176 docs) | Media |
| RAG / IA | Chat `gpt-4o-mini` opcional por context-stuffing (no RAG) | Media |
| Dashboards por rol/excepción | Concentrados en estatal; municipal/contratista sin gráficas | Media-alta |
| Scorecard contratistas | Solo `ranking_score` interno oculto | Media |
| Digital twin / PdM activos | No aplica sin SCADA | Baja (fuera de alcance) |
| Gobernanza/XAI/normativa | Sin auditoría de IA ni versionado de anexos | Media |

**Recomendación de benchmark híbrido:** medir ARKON contra la **Capa B** (InEight, CIPO, Oracle WAM project, OpenGov) extrayendo UX/KPIs de reguladores (Ofwat, AWWA/IWA, Obra Pública Abierta), y reservar la **Capa A** como visión de largo plazo condicionada a integración de telemetría.

---

## 8. Fuentes principales

Plataformas de agua: Autodesk Info360, Bentley WaterSight/iTwin, Esri ArcGIS Utility Network 2025, Oracle Utilities WAM 25.4, IBM Maximo APM, SAP IAM, Xylem Vue, Siemens SIWA, SUEZ Aquadvanced, Veolia Hubgrade, AVEVA UOC. 
EAM/estándares: ISO 55001:2024, GFMAM Landscape v3.0 (2024), IIMM 7, ISO 24516/24510-12, EPA Asset Management, Ofwat PR24 roadmap. 
Project controls: PMI EVM, ANSI/EIA-748 Rev E, Oracle Primavera Cloud, InEight, Procore, Autodesk ACC, SmartPM, DCMA 14-point. 
Digital twin/PdM: Bentley/Siemens/AVEVA/Autodesk casos, survival models (Weibull/Cox/DeepSurv), BattLeDIM, Deloitte MPWiK Wrocław. 
GIS: Esri Capital Project Coordination/Tracking, H3, MapLibre/deck.gl, CONAPO Índice de Marginación 2020, CONEVAL IRS, CONAGUA SINA/EAM. 
IA: Azure Document Intelligence, pgvector/RAG en producción, dbt semantic layer vs text-to-SQL 2026, Thoughtworks Radar Vol 33, YOLOv8/DroneDeploy, OECD/UK/Mexico LNIA gobernanza IA. 
Regulatorio MX: DOF PROAGUA 2025 (5750579), PEAS 2026 (5781302), Lineamientos U074 2026, MIR/PASH, CONAC, ASF CP2024, LGPDPPSO, SISBA/CUA.

*(URLs completas en las transcripciones de investigación; se consolidarán en la bibliografía del entregable final 15-resumen-ejecutivo.md.)*
