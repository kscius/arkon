# 07 — Catálogo de KPIs: existentes y latentes

> Entregable del reanálisis ARKON CONAGUA. Inventario completo de indicadores: los que ya expone la API/UI, los derivables con datos actuales y los obligatorios MIR/SED.
>
> Fuentes: `dashboard.service.ts`, `schema.prisma` (`AccionScore`), [08-benchmark-internacional.md](./08-benchmark-internacional.md) §3, Reglas PROAGUA 2025.

---

## 1. Taxonomía

| Capa | Descripción | Estado ARKON |
|------|-------------|:------------:|
| **A — Descriptivos** | Conteos, sumas, promedios | Implementados |
| **B — Derivados** | Ratios y brechas calculados | Parciales / ocultos |
| **C — EVM** | SPI, CPI, EAC, TCPI, curva-S | Esquema listo, sin cómputo |
| **D — Predictivos** | Probabilidades, forecast | Esquema listo, sin cómputo |
| **E — Normativos** | MIR I.1–I.4, CONAC | Campos capturados, sin agregación |
| **F — Portafolio** | Salud agregada, equidad | No implementados |

---

## 2. KPIs existentes (Capa A)

### 2.1 Endpoint `GET /dashboard/kpis`

| ID | KPI | Fórmula actual | Rol | Limitación |
|----|-----|----------------|-----|------------|
| K01 | `total_obras` | COUNT acciones en scope | Todos | Sin tendencia |
| K02 | `obras_ejecucion` | estatus = `en_ejecucion_a_tiempo` | Todos | Excluye retraso explícito |
| K03 | `obras_retraso` | estatus = `en_ejecucion_retraso` | Todos | Manual en seed |
| K04 | `obras_concluidas` | estatus = `concluida` | Todos | — |
| K05 | `obras_riesgo` | estatus = `en_riesgo` | Todos | No es score calculado |
| K06 | `monto_autorizado` | SUM `monto_autorizado` | Todos | — |
| K07 | `monto_ejercido` | SUM `monto_ejercido` | Todos | ≠ SUM estimaciones pagadas |
| K08 | `avance_fisico_promedio` | AVG `avance_fisico_real` | Todos | Oculta dispersión (σ) |
| K09 | `avance_financiero_promedio` | AVG `avance_financiero` | Todos | Idem |
| K10 | `alertas_criticas/altas/total` | COUNT alertas no atendidas | Todos | Sin SLA de atención |

### 2.2 Charts API

| ID | KPI | Endpoint | Notas |
|----|-----|----------|-------|
| K11 | Obras por estatus | `/dashboard/obras-por-estatus` | Embudo ciclo de vida |
| K12 | Obras por programa | `/dashboard/obras-por-programa` | PROAGUA/PRODDER/PEAS |
| K13 | Top municipios | `/dashboard/top-municipios` | Por programas, obras, inversión |
| K14 | Timeline avance | `/dashboard/avance-timeline` | Promedio mensual portafolio |
| K15 | Top contratistas | `/dashboard/top-contratistas` | `ranking_score` **no expuesto** |

### 2.3 Bandeja pendientes

| ID | KPI | Fuente |
|----|-----|--------|
| K16 | `pendientes.total` | Suma por tipo según rol |
| K17 | `pendientes.totales.*` | avances, estimaciones, documentos, obs., alertas, solicitudes |

---

## 3. KPIs latentes inmediatos (Capa B) — datos listos

| ID | KPI | Fórmula | Umbral RAG | Persistencia |
|----|-----|---------|:----------:|--------------|
| L01 | **Brecha físico-financiera** | `avance_financiero - avance_fisico_real` | ±15 pp | `accion_scores.anomalia_score` |
| L02 | **Variación avance mensual** | `reportado - programado` (último periodo) | < −5 pp ámbar | `metric_snapshots` |
| L03 | **% ejercido** | `monto_ejercido / monto_autorizado × 100` | < avance físico −10 | dashboard KPI |
| L04 | **Cumplimiento documental** | docs `validado` / total requeridos | < 80 % rojo | por acción |
| L05 | **Días sin avance validado** | hoy − último `validado` | > 35 días | alerta config |
| L06 | **Estimaciones en pipeline** | COUNT por estatus | > 3 en revisión | municipal |
| L07 | **Observaciones abiertas** | COUNT estatus `abierta` | > 0 alta | acción |
| L08 | **Reintegro pendiente** | `monto_por_reintegrar` / transferido | > 0 crítico | cierre ejercicio |
| L09 | **Concentración programa** | HHI por municipio | > 0.5 | portafolio |
| L10 | **Ranking contratista** | `avance_prom − 5×alertas` | bottom 20 % | API (exponer score) |

---

## 4. KPIs EVM (Capa C) — estándar PMI / ANSI-EIA-748

Mapeo a columnas `accion_scores`:

| ID | KPI | Fórmula | Campos BD | Interpretación |
|----|-----|---------|-----------|----------------|
| E01 | **BAC** | `monto_contratado` o `monto_autorizado` | `bac` | Presupuesto a la conclusión |
| E02 | **PV** | Curva-S programada al periodo | `pv` | Valor planeado |
| E03 | **EV** | `BAC × avance_fisico_real / 100` | `ev` | Valor ganado |
| E04 | **AC** | SUM estimaciones autorizadas/pagadas | `ac` | Costo real |
| E05 | **SPI** | `EV / PV` | `spi` | < 1 = atraso |
| E06 | **CPI** | `EV / AC` | `cpi` | < 1 = sobrecosto |
| E07 | **EAC** | `AC + (BAC − EV) / CPI` | `eac` | Costo estimado final |
| E08 | **ETC** | `EAC − AC` | `etc` | Costo para terminar |
| E09 | **VAC** | `BAC − EAC` | `vac` | Variación final |
| E10 | **TCPI** | `(BAC − EV) / (BAC − AC)` | `tcpi` | > 1.10 = irrecuperable |
| E11 | **Curva-S** | PV/EV/AC acumulados por mes | `metric_snapshots` | Visual estatal |

**Nota de medición:** usar `avances_mensuales.validado` para EV, no `reportado` sin validar (alineación ANSI).

---

## 5. KPIs de riesgo y portafolio (Capa D–F)

### 5.1 Risk score multifactor (reemplaza `riesgo` manual)

```
riesgo_score = Σ (w_i × factor_i normalizado)   → 0–100
```

| Factor | Peso sugerido | Fuente |
|--------|:-------------:|--------|
| Brecha FF | 25 % | L01 |
| SPI | 20 % | E05 |
| CPI | 15 % | E06 |
| Alertas activas | 15 % | alertas |
| Docs incompletos | 10 % | L04 |
| Días a vencimiento | 10 % | fechas |
| Observaciones abiertas | 5 % | L07 |

Persistencia: `accion_scores.riesgo_score`, `riesgo_nivel` (verde/ámbar/rojo), `riesgo_factores` (JSON explicable).

### 5.2 Probabilidades predictivas

| ID | KPI | Campo BD | Método fase 1 | Método fase 3 |
|----|-----|----------|---------------|---------------|
| P01 | Prob. retraso | `prob_retraso` | Reglas leading/lagging | Clasificador ML |
| P02 | Prob. sobrecosto | `prob_sobrecosto` | CPI < 0.95 + TCPI | Regresión |
| P03 | Anomalía global | `anomalia_score` | z-score brecha FF | Isolation Forest |

### 5.3 Portfolio health

| ID | KPI | Fórmula portafolio |
|----|-----|-------------------|
| H01 | **Salud portafolio** | AVG `salud_score` ponderado por BAC |
| H02 | **% acciones en rojo** | COUNT `riesgo_nivel=rojo` / total |
| H03 | **VAC agregado** | SUM `vac` |
| H04 | **Índice equidad** | inversión per cápita en municipios `es_zap` vs. resto |

---

## 6. KPIs MIR oficiales (Capa E) — no inventar paralelos

| ID MIR | Indicador | Numerador (campos ARKON) | Denominador | Agregación |
|:------:|-----------|--------------------------|-------------|------------|
| **I.1** | % acceso formal AP | SUM `pob_incorporar` (obras concluidas AP) | Población sin acceso (INEGI) | Estatal → PASH |
| **I.2** | % acceso formal alcantarillado | SUM población beneficiada obras TAR | Población sin alcantarillado | Estatal |
| **I.3** | % cobertura tratamiento AR | `caudal_lps` tratado (futuro PTAR) | Caudal colectado | Requiere activos |
| **I.4** | % caudal desinfectado | Caudal desinfectado | Caudal producido | `caudal_lps` + metadata |

**Estado:** campos `cobertura_ap_*`, `pob_incorporar`, `caudal_lps` poblados en seed; **cero widgets** ni export MIR consolidado.

---

## 7. Contractor / OO scorecard

| Dimensión | Peso | Métrica |
|-----------|:----:|---------|
| Cumplimiento avance | 30 % | AVG SPI obras del contratista |
| Calidad documental | 20 % | L04 promedio |
| Alertas | 20 % | L10 (alertas activas / obras) |
| Observaciones | 15 % | Ratio cerradas / totales |
| Plazo | 15 % | % obras concluidas a tiempo |

Score 0–100 por `contratista_id`; visible a estatal y al propio contratista (rol).

---

## 8. KPIs de calidad de datos (Capa B — confianza analítica)

Sin datos completos, EVM y riesgo producen falsos positivos. ARKON expone un gate en `GET /metrics/data-quality` (`metrics-calculator.ts` → `dataQuality()`).

| ID | KPI | Fórmula | Umbral RAG | Uso |
|----|-----|---------|:----------:|-----|
| DQ01 | **Score global calidad** | Promedio ponderado de 5 dimensiones × 100 | ≥85 V / 70–84 A / <70 R | Widget estatal |
| DQ02 | % con georreferencia | `con_geo / total` | Meta 100 % PROAGUA | GIS, choropleth |
| DQ03 | % con contratista | `con_contratista / total` | Meta 100 % | Scorecard OO |
| DQ04 | % con serie avances | `con_avances / total` | Meta 100 % en ejecución | EVM, SPI |
| DQ05 | % con expediente documental | `con_documentos / total` | Meta ≥ 90 % | L04, IDP |
| DQ06 | % con CUA | `con_cua / total` | Meta 100 % federal | SISBA, MIR |
| DQ07 | Integridad brecha FF | Acciones donde \|FF − físico\| > 15 pp sin alerta | 0 ideal | QA job |
| DQ08 | Coherencia BAC vs montos | `monto_contratado ≤ monto_autorizado` | 100 % | Vista `vw_accion_integridad` |
| DQ09 | Duplicados avance periodo | COUNT violaciones UNIQUE `(accion_id, periodo)` | 0 | Fase 0 migración |
| DQ10 | Frescura último avance | Días desde último `validado` | < 35 días | L05, riesgo |

**Estado seed CONAGUA:** con 22 acciones, el widget reporta completitud alta en geo y avances; CUA parcial en obras PRODDER históricas. El score global alimenta confianza en el panel de excepción ([06-dashboards-next-gen.md](./06-dashboards-next-gen.md) §3.3).

**Regla de gobernanza:** si DQ01 < 70, los KPIs predictivos (P01–P03) muestran banner "datos incompletos" en UI.

---

## 9. Matriz de implementación

| Sprint | KPIs | Entregable |
|:------:|------|------------|
| 1 | L01, L03, L10, E05–E07, riesgo_score, DQ01–DQ06 | Job `computeAccionScores` + data-quality |
| 2 | E01–E11, H01–H02, K15 score visible | Dashboard estatal v2 |
| 3 | P01–P03, H03–H04 | Roadmap [11](./11-roadmap-analitica-predictiva.md) |
| 4 | MIR I.1–I.4 | Export PASH / CONAC |

---

## 10. Referencias

- Benchmark KPIs: [08-benchmark-internacional.md](./08-benchmark-internacional.md) §3
- Correlaciones: [04-correlaciones-ocultas.md](./04-correlaciones-ocultas.md)
- Dashboards: [06-dashboards-next-gen.md](./06-dashboards-next-gen.md), [05-evaluacion-dashboards-actual.md](./05-evaluacion-dashboards-actual.md)
- Tabla destino: `accion_scores` en [02-inventario-datos.md](./02-inventario-datos.md)
