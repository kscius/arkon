# 10 — Oportunidades de IA: arquitectura backend-first para ARKON CONAGUA

> Entregable del reanálisis ARKON CONAGUA. Define **dónde la IA aporta ROI** en gestión de programas de capital hídricos, con diseño **backend-first** (jobs, endpoints, scores persistidos) — no como chat obligatorio. Complementa el benchmark ([08-benchmark-internacional.md](./08-benchmark-internacional.md)) y alimenta las fases PR/PX del roadmap ([12-roadmap-implementacion-priorizado.md](./12-roadmap-implementacion-priorizado.md)).

---

## 0. Resumen ejecutivo

ARKON hoy tiene un **antipatrón**: `POST /api/chat/ask` con context-stuffing de toda la BD hacia `gpt-4o-mini`. El estado del arte 2026 invierte el modelo: **SQL y reglas producen números; el LLM solo narra, extrae o recupera** con trazabilidad.

Las cinco oportunidades de mayor ROI, en orden de prioridad:

1. **Scoring de riesgo nocturno** (determinista + explicable) — reemplaza `riesgo` manual.
2. **Detección de anomalías** físico-financieras y de estimaciones.
3. **IDP** sobre PDFs con validación vs BD y HITL obligatorio.
4. **RAG híbrido** (pgvector + full-text) sobre documentos y normativa PROAGUA.
5. **Briefing ejecutivo semanal** generado por job, no por conversación.

El chat puede permanecer como **consumidor opcional** de APIs ya calculadas; no debe ser el núcleo analítico.

---

## 1. Principios de diseño (no negociables)

| # | Principio | Implicación |
|---|-----------|-------------|
| P1 | **El LLM narra; los números vienen de SQL** | Briefings y resúmenes reciben JSON de KPIs precalculados |
| P2 | **No text-to-SQL crudo a ejecutivos** | Capa semántica de métricas pre-aprobadas (PR6) |
| P3 | **IA como jobs + endpoints** | `@nestjs/schedule` + colas; resultados en tablas derivadas |
| P4 | **Explicabilidad y auditoría** | Desglose de factores de riesgo; log de chunks RAG; versión de modelo |
| P5 | **HITL en efectos legales** | IDP que afecta pagos requiere aprobación humana |
| P6 | **LGPDPPSO** | ACL en embeddings; no entrenar con PII sin base legal ([09-adaptacion-mexico.md](./09-adaptacion-mexico.md)) |

### Arquitectura objetivo

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
│ Fuentes      │────▶│ Workers / Jobs  │────▶│ Tablas derivadas │
│ BD, PDFs,    │     │ IDP, RAG index, │     │ accion_scores,   │
│ normativa    │     │ risk, anomaly,  │     │ document_chunks, │
└──────────────┘     │ briefing        │     │ anomaly_flags    │
                     └────────┬────────┘     └────────┬─────────┘
                              │                       │
                              ▼                       ▼
                     ┌─────────────────┐     ┌──────────────────┐
                     │ LLM (opcional)  │     │ API REST + UI    │
                     │ narrar, extraer │     │ widgets, bandeja │
                     └─────────────────┘     └──────────────────┘
```

---

## 2. Inventario de oportunidades

| ID | Oportunidad | Tipo | Fase | Dimensiones scorecard | Esfuerzo | ROI |
|----|-------------|------|------|----------------------|:--------:|:---:|
| IA-01 | Scoring de riesgo multifactor | Determinista + reglas | QW1 | B3, B5 | Medio | **Muy alto** |
| IA-02 | EVM derivado (SPI/CPI/EAC) | Determinista | QW2 | B2 | Medio | **Muy alto** |
| IA-03 | Detección de anomalías | ML estadístico | PR5 | B4, B5 | Medio | Alto |
| IA-04 | IDP documentos PDF | LLM + OCR | PR1 | B7 | Medio-alto | Alto |
| IA-05 | RAG híbrido pgvector | Embeddings + FTS | PR2 | B8 | Medio | Alto |
| IA-06 | Briefing ejecutivo semanal | LLM narración | PR3 | B8, B12 | Bajo-medio | Alto |
| IA-07 | ML retraso / sobrecosto | Regresión / GBM | PR4 | B4 | Medio-alto | Medio-alto |
| IA-08 | Capa semántica NL métricas | Intent → query aprobada | PR6 | B12 | Medio | Medio |
| IA-09 | Recomendaciones prescriptivas | Reglas + ranking | PX1 | B4, B12 | Medio-alto | Alto |
| IA-10 | Forecast series temporales | Stats / Prophet-like | PX3 | B2, B4 | Medio | Medio-alto |

**Nota:** IA-01 e IA-02 no requieren LLM; se listan aquí porque compiten por el mismo “presupuesto de inteligencia” y habilitan las capacidades de IA posteriores.

---

## 3. Casos de uso detallados

### 3.1 IDP — Inteligencia de documentos (PR1)

**Problema:** ~176 documentos almacenados sin extracción; captura manual de montos y % avance en estimaciones y avances.

**Solución:**

1. Worker `idp-worker` procesa PDFs nuevos/modificados (cola o cron).
2. Extracción estructurada: montos, fechas, porcentajes, observaciones, firmas detectadas.
3. **Validación cruzada** vs `AvanceMensual`, `Estimacion`, `montoContratado`.
4. Flags de discrepancia → bandeja “Revisión documental” con diff lado a lado.
5. **HITL:** ningún campo extraído escribe en tablas de pago sin `aprobado_por`.

**Stack sugerido:** Azure Document Intelligence o pdf-parse + LLM estructurado (JSON mode); almacenar raw extraction en `documento_extracciones`.

**Datos:** corpus actual suficiente para piloto. **Riesgo:** PDFs escaneados de baja calidad — fallback OCR.

**Métricas de éxito:** % documentos con extracción; tasa de discrepancia detectada; tiempo medio de revisión humana.

---

### 3.2 RAG — Retrieval sobre documentos y normativa (PR2)

**Problema:** `chat.service.ts` inyecta listados completos de obras en el prompt (context-stuffing). No escala, no cita fuentes, alucina en detalle.

**Solución:**

1. Fase F: `CREATE EXTENSION vector`; tabla `document_chunks(embedding vector(1536), texto, accion_id, fuente, metadata)`.
2. Indexar: PDFs de expediente, `Observacion`, texto de normativa PROAGUA/PEAS (corpus estático en `docs/proagua/`).
3. **Búsqueda híbrida:** pgvector HNSW + `pg_trgm` full-text → fusión RRF.
4. Endpoints: `GET /rag/search?q=&accionId=`; widget “Documentos relacionados” en `ObraDetailPage`.
5. Chat (si se mantiene) **solo** consume top-k chunks con citas `[doc_id, página]`.

**Gobernanza:** `metadata.acl_roles`; no retornar chunks de expediente a rol contratista si no aplica.

**Métricas:** precision@5 en consultas de prueba; latencia p95 < 500 ms.

---

### 3.3 Risk scoring — Riesgo calculado multifactor (QW1 / IA-01)

**Problema:** `riesgo` y `en_riesgo` son campos manuales; `obras_riesgo` en dashboard cuenta enum, no score.

**Modelo propuesto (0–100, explicable):**

| Factor | Peso indicativo | Fuente |
|--------|:---------------:|--------|
| Rezago físico (programado − real) | 25% | `avanceFisicoProgramado`, `avanceFisicoReal` |
| Brecha financiera (financiero − físico) | 20% | Avances mensuales |
| Días sin actualización | 15% | `updatedAt`, último `AvanceMensual` |
| Alertas abiertas | 15% | `Alerta` activas |
| Exceso ejercido/contratado vs autorizado | 15% | Montos |
| Proximidad a plazos PROAGUA | 10% | Motor cumplimiento QW6 |

**Salida:** `accion_scores(riesgo_score, riesgo_nivel, factores_json, calculado_en)`; semáforo Rojo ≥70, Ámbar 40–69, Verde <40 (umbrales configurables).

**Sin LLM.** Job nocturno idempotente. UI: badge en listado y detalle; desglose en panel.

---

### 3.4 Briefing ejecutivo semanal (PR3 / IA-06)

**Problema:** directivos no tienen síntesis periódica accionable; dependen de dashboards que requieren interpretación.

**Solución:**

1. Job domingo 06:00 (configurable): agregar por SQL — KPIs portafolio, top 10 riesgo, cumplimiento plazos, anomalías nuevas, cola de decisiones.
2. Pasar **JSON estructurado** a LLM con plantilla fija: “Solo narra estos hechos; no inventes cifras.”
3. Persistir `briefings(semana, html, pdf_path, datos_json)`.
4. UI: descarga PDF/HTML; envío opcional email (futuro).

**Antipatrón evitado:** el usuario no “pregunta” al chat; recibe un artefacto generado y auditable.

---

### 3.5 Detección de anomalías (PR5 / IA-03)

**Problema:** solo 11 reglas de umbral + 1 alerta en estimaciones; sin detección de patrones atípicos.

**Técnicas (escalonadas):**

| Nivel | Técnica | Caso de uso |
|-------|---------|-------------|
| L1 | Z-score / IQR por programa | Desviación físico-financiera |
| L2 | Reglas compuestas | Estimación > 110% contratado sin anexo |
| L3 | Isolation Forest (sklearn vía microservicio o WASM) | Patrones multivariados por contratista |

**Salida:** `anomaly_flags(accion_id, tipo, severidad, explicacion, detectado_en)` → bandeja y alertas.

**N pequeño (~22 obras):** empezar L1–L2; L3 cuando N > 50 o con datos históricos importados.

---

### 3.6 ML de retraso y sobrecosto (PR4 / IA-07)

**Features:** historial de avances mensuales, SPI/CPI previos, días de retraso acumulados, score contratista, programa, marginación municipio, estacionalidad.

**Modelos:** regresión logística (retraso binario) + regresión robusta (sobrecosto %); gradient boosting cuando N permita.

**Explicabilidad:** SHAP o desglose de contribución por feature en UI.

**Salida:** `accion_scores(prob_retraso, prob_sobrecosto, modelo_version)`.

**Limitación honesta:** con seed demo, modelos son **ilustrativos**; producción requiere histórico multi-ejercicio.

---

### 3.7 Capa semántica NL (PR6 / IA-08)

**Problema:** ejecutivos quieren “lenguaje natural” pero text-to-SQL es inseguro (~64% precisión reportada en industria).

**Solución:** catálogo de **intents** → consultas parametrizadas:

```
"obras en riesgo en Yucatán" → GET /acciones?riesgo_nivel=rojo&entidad=yucatan
"avance financiero vs físico Q2" → métrica predefinida id=brecha_ff_q2
```

NL solo selecciona intent + slots validados; fallback “no entendí, opciones: …”.

Integración: barra de filtros en dashboard, no chat libre.

---

## 4. Lo que NO hacer (antipatrones ARKON)

| Antipatrón | Evidencia actual | Reemplazo |
|------------|------------------|-----------|
| Context-stuffing masivo | `chat.service.ts` serializa obras | RAG + APIs de métricas |
| KPIs inventados por LLM | Prompt pide “análisis” sin JSON | Briefing con datos SQL |
| Text-to-SQL abierto | No existe aún | Capa semántica |
| Chat como única IA | `AsistentePage.tsx` prominente | Widgets + bandeja + briefings |
| Riesgo manual perpetuo | `schema.prisma` L249-250 | `accion_scores` |

---

## 5. Stack técnico recomendado

| Componente | Elección | Notas |
|------------|----------|-------|
| Embeddings | OpenAI `text-embedding-3-small` o local `nomic-embed` | Costo vs soberanía |
| Vector store | pgvector en PostgreSQL 16 | Ya en roadmap Fase F |
| LLM narración | `gpt-4o-mini` (actual) o Azure OpenAI | Temperatura baja, JSON mode |
| IDP | Azure DI / Unstructured.io | Evaluar en piloto |
| ML | Python sidecar o `onnxruntime-node` | Solo si N crece |
| Jobs | `@nestjs/schedule` existente | Extender `alertas-scheduler` |
| Auditoría | Tabla `ia_audit_log` | prompt_hash, chunks_ids, modelo |

---

## 6. Roadmap de IA por fase (síntesis)

| Fase | Entregables IA | Índice madurez IA (aprox.) |
|------|----------------|:--------------------------:|
| **F** | pgvector, `accion_scores` vacía, data-quality | Infra lista |
| **QW** | Risk score, EVM (sin LLM) | Nivel 1→2 |
| **PR** | IDP, RAG, briefing, anomalías, ML piloto, NL métricas | Nivel 2→3 |
| **PX** | Recomendaciones HITL, forecast, auditoría XAI | Nivel 3→4 |
| **OP** | Anomalías operativas SCADA (si hay telemetría) | Nivel 4→5 (Track A) |

---

## 7. ROI y priorización

| Prioridad | Iniciativa | Esfuerzo (persona-semanas) | Impacto negocio | Dependencias |
|:---------:|------------|:--------------------------:|-----------------|--------------|
| P0 | Risk scoring (QW1) | 2–3 | Sustituye proceso manual crítico | Fase F |
| P0 | Anomalías L1–L2 (PR5) | 2 | Detección temprana fraude/error | Risk score |
| P1 | RAG (PR2) | 3–4 | Productividad revisión expedientes | pgvector |
| P1 | IDP piloto (PR1) | 4–5 | Reduce captura; habilita auditoría | Cola HITL |
| P1 | Briefing (PR3) | 1–2 | Valor ejecutivo inmediato | Métricas QW |
| P2 | ML retraso (PR4) | 3–4 | Forecast decisión portafolio | EVM + histórico |
| P2 | NL semántica (PR6) | 2–3 | UX sin riesgo SQL | Catálogo métricas |

**ROI compuesto:** QW1+QW2+PR3 entregan **80% del valor percibido** con **~30% del esfuerzo** total de IA.

---

## 8. Gobernanza y cumplimiento IA (México)

- Alineación con lineamientos de IA en sector público (LNIA, recomendaciones OECD): transparencia, supervisión humana, trazabilidad.
- Para ASF: export de `ia_audit_log` y versiones de modelo junto con anexos de ejercicio.
- Evaluación de impacto algorítmico ligera documentada en `docs/ia-impact-assessment.md` (futuro, Fase PX).

---

## 9. Conclusión

La IA en ARKON CONAGUA debe **desaparecer del camino crítico del usuario** y **aparecer en el backend**: scores nocturnos, bandejas de excepción, documentos relacionados, briefings descargables. El chat es un canal secundario sobre APIs ya confiables. Esta arquitectura cierra las dimensiones B3–B8 del scorecard hacia Nivel 3–4 sin sacrificar LGPDPPSO ni exigibilidad ante auditoría.

**Siguiente paso:** ejecutar Fase F (pgvector + `accion_scores`) y QW1 en paralelo — máximo ROI, cero dependencia de LLM en producción crítica.
