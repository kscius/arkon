# 11 — Roadmap de analítica predictiva

> Entregable del reanálisis ARKON CONAGUA. Plan por fases para pasar de Nivel 1 (descriptivo) a Nivel 3–4 (predictivo/prescriptivo) usando datos actuales, sin SCADA.
>
> Contexto: scorecard [16](./16-scorecard-madurez.md) (índice 1.1/5), benchmark [08](./08-benchmark-internacional.md), KPIs [07](./07-catalogo-kpis.md).

---

## 1. Objetivo y principios

**Objetivo 18 meses:** índice de madurez **~3.5/5** en Capa B (programas de capital), con predicción de retraso/sobrecosto, riesgo explicable y briefings automatizados.

**Principios de diseño (no negociables):**

1. Los números vienen de **SQL/jobs deterministas**; el LLM solo narra.
2. Toda predicción con **explicabilidad** (`riesgo_factores`, SHAP en Fase 3).
3. **Human-in-the-loop** para pagos, sanciones y cambios de estatus legal.
4. Persistir en tablas analíticas existentes (`accion_scores`, `metric_snapshots`, `recomendaciones`, `ia_audit_logs`).
5. No text-to-SQL crudo a ejecutivos; capa semántica de métricas en Fase 3.

---

## 2. Estado actual vs. destino

| Capacidad | Hoy | Meta 18m |
|-----------|-----|----------|
| Riesgo | Campo manual `riesgo` | Score 0–100 nocturno |
| EVM | Ausente | SPI/CPI/EAC en cada acción |
| Forecast | Ausente | EAC + rango confianza |
| Anomalías | 1 regla estimaciones | z-score + Isolation Forest |
| Predictivo | 0 | prob_retraso / prob_sobrecosto |
| IDP / RAG | Chat context-stuffing | pgvector + HITL |
| Prescriptivo | Bandeja manual | `recomendaciones` priorizadas |

---

## 3. Fase 0 — Fundamentos (semanas 1–4)

| # | Entregable | Dependencias | Criterio de éxito |
|---|------------|--------------|-------------------|
| 0.1 | Migrar fechas críticas a tipo fecha | Prisma migration | ORDER BY cronológico en SQL |
| 0.2 | UNIQUE `(accion_id, periodo)` avances | DB constraint | Cero duplicados |
| 0.3 | Vista `vw_accion_integridad` | SQL | QA brecha FF, BAC vs montos |
| 0.4 | Poblar municipios: `marginacion`, `es_zap` | CONAPO 2020 | 14 municipios enriquecidos |
| 0.5 | Enlazar alertas seed a `obra_id` | Seed fix | Drill-down alerta → acción |

**Equipo:** 1 backend + 0.5 data. **Riesgo:** bajo.

---

## 4. Fase 1 — Analítica determinista (meses 2–4)

### 4.1 Job `computeAccionScores` (cron diario 02:00)

```
INPUT:  acciones + avances_mensuales + estimaciones + alertas + documentos
OUTPUT: accion_scores (upsert 1:1 por accion_id)
        metric_snapshots (append histórico)
```

**Cálculos:** E01–E10, L01, riesgo_score multifactor, `riesgo_nivel` RAG.

### 4.2 API y UI

| Entregable | Consumidor |
|------------|------------|
| `GET /acciones/:id/score` | Detalle obra |
| `GET /dashboard/portfolio-health` | Dashboard estatal |
| KPI cards SPI/CPI/brecha FF | Todos los roles |
| Exponer `ranking_score` contratistas | Estatal |

### 4.3 Detección de anomalías (reglas)

| Regla | Acción |
|-------|--------|
| \|brecha FF\| > 15 pp | `anomalia_score` += 30; recomendación |
| SPI < 0.9 tres meses | Alerta config nueva |
| CPI < 0.95 | Flag sobrecosto |
| Doc crítico `no_cargado` + avance > 50 % | Recomendación documental |

**Meta scorecard:** B2, B3, B5 → **3/5**. Índice global ~**2.0/5**.

---

## 5. Fase 2 — Forecast y GIS (meses 5–8)

### 5.1 Forecast de erogación y avance

| Modelo | Técnica | Output |
|--------|---------|--------|
| Curva-S extendida | Regresión sobre `metric_snapshots` | PV/EV/AC a 3 meses |
| EAC con intervalo | CPI/SPI compuesto + bootstrap simple | `eac` ± 10 % |
| Fecha fin probable | `fecha_termino` + (1−SPI)×plazo restante | `metadata` en score |

### 5.2 GIS de decisión

- Choropleth: inversión per cápita por municipio.
- Hot-spot: riesgo_score medio territorial.
- Capa ZAP (`es_zap`): índice equidad H04.

### 5.3 Document Intelligence (piloto)

| Paso | Detalle |
|------|---------|
| OCR/extracción | 20 PDFs `estatus=cargado` |
| Validación | Campos contrato vs. `acciones` |
| Chunks | `document_chunks` + embedding JSON |
| HITL | Validación estatal antes de auto-actualizar |

**Meta scorecard:** B6, B7 parcial → **3/5**. Índice ~**2.8/5**.

---

## 6. Fase 3 — ML predictivo (meses 9–12)

### 6.1 Umbral de datos

| Modelo | Mínimo N | Estado demo (N=22) |
|--------|:--------:|:------------------:|
| Reglas + logit | 15 | ✓ Usable ahora |
| Random Forest retraso | 50 | Insuficiente — reglas primero |
| Isolation Forest anomalía | 30 | Marginal — z-score primero |

**Estrategia:** reglas calibradas en Fase 1–2; entrenar ML cuando producción supere N=50 acciones activas.

### 6.2 Modelos

| ID | Target | Features | Algoritmo |
|----|--------|----------|-----------|
| M1 | `prob_retraso` | SPI, variación avance, días vencimiento, obs. abiertas | Logistic regression |
| M2 | `prob_sobrecosto` | CPI, brecha FF, nº estimaciones, programa | Logistic regression |
| M3 | `anomalia_score` | Vector [SPI,CPI,brecha,docs,alertas] | Isolation Forest |

Persistir: `accion_scores.prob_*`; explicación vía SHAP → `riesgo_factores`.

### 6.3 RAG y briefing ejecutivo

| Job | Frecuencia | Output |
|-----|------------|--------|
| `weeklyExecutiveBriefing` | Lunes 07:00 | Markdown + `recomendaciones` top 10 |
| `ragQuery` | On-demand | Retrieval sobre `document_chunks` + normativa |
| Auditoría | Cada inferencia | `ia_audit_logs` |

**Meta scorecard:** B4, B8 → **3–4/5**. Índice ~**3.5/5**.

---

## 7. Fase 4 — Prescriptivo y MIR (meses 13–18)

### 7.1 Motor de recomendaciones

```
recomendaciones (tipo, prioridad, factores, estatus)
  ← reglas + ML + cola pendientes
  → aprobación humana (aprobado_por)
```

Tipos: `retener_pago`, `visita_supervision`, `acelerar_estimacion`, `sancion_plazo`, `cierre_documental`.

### 7.2 Agregación MIR I.1–I.4

- Job trimestral `computeMirIndicators`.
- Export compatible PASH / tablero CONAC.
- Dashboard estatal: semáforo MIR por entidad.

### 7.3 Capa semántica NL (opcional)

- Métricas predefinidas en YAML (dbt-style).
- Preguntas ejecutivas → SQL parametrizado, no LLM libre.
- Cobertura objetivo: 98 % en métricas del catálogo [07](./07-catalogo-kpis.md).

---

## 8. Cronograma

| Periodo | Fases activas |
|---------|---------------|
| 2026 Q2 | Fase 0 + Fase 1 (scores, EVM, riesgo) |
| 2026 Q3 | Fase 2 (forecast, GIS, IDP piloto) |
| 2026 Q4 – 2027 Q1 | Fase 3 (ML, RAG, briefing) |
| 2027 Q2 | Fase 4 (recomendaciones, MIR I.1–I.4) |

---

## 9. Stack (sin re-plataforma)

PostgreSQL 16 (+ pgvector Fase 2), jobs NestJS `@Cron`, Prisma → `accion_scores`, React/Recharts, `ia_audit_logs` para gobernanza. BullMQ solo si el volumen lo exige.

---

## 10. Riesgos y mitigaciones

| Riesgo | Prob. | Mitigación |
|--------|:-----:|------------|
| N pequeño para ML | Alta | Reglas primero; ML gated por N>50 |
| Fechas string rompen forecast | Media | Fase 0 obligatoria |
| Resistencia a riesgo calculado | Media | Mostrar `riesgo_factores`; no auto-cambiar estatus |
| ASF / LGPDPPSO | Baja | Audit log + HITL + no PII en embeddings |
| Scope creep Capa A (SCADA) | Media | Explícitamente fuera hasta integración OO |

---

## 11. Métricas de éxito del roadmap

| KPI del programa | Línea base | Meta 12m | Meta 18m |
|------------------|:----------:|:--------:|:--------:|
| Índice madurez ([16](./16-scorecard-madurez.md)) | 1.1 | 2.8 | 3.5 |
| % acciones con `accion_scores` | 0 % | 100 % | 100 % |
| Tiempo detección brecha FF | Manual | < 24 h | < 1 h |
| Alertas falsas (precision) | — | > 70 % | > 85 % |
| Briefing semanal automatizado | No | Piloto | Producción |

---

## 12. Referencias

- Inventario datos: [02-inventario-datos.md](./02-inventario-datos.md)
- Correlaciones: [04-correlaciones-ocultas.md](./04-correlaciones-ocultas.md)
- Catálogo KPIs: [07-catalogo-kpis.md](./07-catalogo-kpis.md)
- Quick wins detallados: [13-quick-wins.md](./13-quick-wins.md)
- Implementación priorizada: [12-roadmap-implementacion-priorizado.md](./12-roadmap-implementacion-priorizado.md)
- Dashboards next-gen: [06-dashboards-next-gen.md](./06-dashboards-next-gen.md)
