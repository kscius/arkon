# 04 — Correlaciones ocultas entre datasets

> Entregable del reanálisis ARKON CONAGUA. Patrones no evidentes en dashboards actuales pero derivables con SQL/jobs sobre el seed y datos de producción.
>
> Método: análisis del seed CONAGUA, `dashboard.service.ts`, alertas demo y campos latentes del schema.

---

## 1. Resumen: de datos silenciados a señales

Los dashboards actuales agregan promedios y conteos. El modelo relacional ya contiene **correlaciones accionables** entre dimensión física, financiera, geográfica, contractual y normativa. Ninguna se materializa hoy en `accion_scores` (tabla vacía).

| Correlación | Variables | Señal para decisión |
|-------------|-----------|---------------------|
| Brecha físico-financiera | `avance_fisico_real` vs `avance_financiero` | Sobrepago / subejecución |
| Retraso silencioso | `avance_mensual.variacion` acumulada vs `estatus` | Obra "a tiempo" con SPI < 1 |
| Riesgo municipal | `marginacion` + concentración PRODDER | Priorizar supervisión |
| Patrón contratista | alertas activas / obras / avance promedio | Scorecard OO |
| Leading vs lagging | avances validados → estimaciones autorizadas | Predictor de flujo de caja |

---

## 2. Brecha físico-financiera (la correlación más valiosa)

### 2.1 Definición

```
brecha_ff = avance_financiero - avance_fisico_real   (en puntos porcentuales)
```

En el dashboard estatal, el gráfico "Avance Físico vs. Financiero" (`DashboardEstatalPage.tsx`) muestra solo las **10 obras con monto > \$1M** — oculta el 55 % del portafolio demo.

### 2.2 Hallazgos en seed (22 acciones)

| Rango brecha | Interpretación | Acción sugerida |
|:------------:|----------------|-----------------|
| > +15 pp | Financiero adelantado | Retener estimaciones; auditoría |
| −5 a +5 pp | Alineado | Monitoreo estándar |
| < −15 pp | Físico adelantado, pago rezagado | Acelerar autorización estatal |
| Signo invertido + `estatus` = `en_ejecucion_a_tiempo` | **Falso verde** | Recalcular riesgo |

**Correlación oculta:** obras PRODDER en Guanajuato (León, Irapuato) combinan alta brecha positiva con alertas presupuestarias (`alertas.json` #1, #3) — el sistema no las cruza automáticamente.

### 2.3 Implementación

```sql
-- Job nocturno: flag anomalía
SELECT id, folio,
       avance_financiero - avance_fisico_real AS brecha_ff
FROM acciones
WHERE ABS(avance_financiero - avance_fisico_real) > 15;
```

Persistir en `accion_scores.anomalia_score` y `riesgo_factores->>'brecha_ff'`.

---

## 3. Patrones por contratista / organismo operador

### 3.1 Ranking oculto

`topContratistas()` calcula internamente:

```
ranking_score = avance_promedio - (alertas_activas × 5)
```

pero **elimina el score** antes de enviar la respuesta (L321). La UI muestra avance promedio sin penalización por alertas.

### 3.2 Correlaciones detectables

| Patrón | Evidencia seed | KPI derivado |
|--------|----------------|--------------|
| Alto volumen + bajo avance | SAPAL (2 obras, ~\$84M) | `obras_count` × inverse(`avance_promedio`) |
| Alertas presupuestarias | León, Guanajuato, Cuernavaca | `alertas_activas / obras_count` |
| Validación lenta | Irapuato (alerta #5) | Días estimación en `en_revision_municipal` |
| Cierre documental exitoso | JAPAM San Juan del Río (#7 atendida) | Tiempo cierre vs plazo U074 |

**Acción:** publicar `ContractorScore` = f(cumplimiento documental, SPI medio, alertas, observaciones abiertas). Tabla destino: extensión de `accion_scores` o vista por `contratista_id`.

---

## 4. Riesgo municipal y equidad territorial

### 4.1 Concentración geográfica

| Municipio | Programas | Monto relativo | Alertas |
|-----------|:---------:|:--------------:|:-------:|
| León | PRODDER | Alto | Retraso devolución 2025 |
| Irapuato | PRODDER/PEAS | Alto | Validación pendiente |
| Tulum | PROAGUA | Medio | Retraso saneamiento |
| Puebla | PEAS | Medio | Incumplimiento SOAPAP (crítica) |

**Correlación oculta:** municipios con **múltiples programas** (`topMunicipios` ordena por `programas_count`) no necesariamente tienen mejor avance — León lidera programas pero aparece en alerta alta.

### 4.2 Campos latentes para índice de riesgo territorial

Cuando se poblen `municipios.marginacion` y `es_zap`:

```
riesgo_municipal = w1×brecha_ff_media + w2×alertas_abiertas + w3×indice_marginación
```

Choropleth en `MapaTerritorial.tsx` hoy solo colorea por estatus de obra individual, no por riesgo compuesto del municipio.

---

## 5. Indicadores adelantados vs rezagados

### 5.1 Clasificación

| Tipo | Indicador | Fuente | Horizonte |
|------|-----------|--------|-----------|
| **Leading** | Avances mensuales validados | `avances_mensuales` | 1–2 meses |
| **Leading** | Documentos en revisión | `documentos.estatus` | Inmediato |
| **Leading** | Observaciones abiertas | `observaciones` | 2–4 semanas |
| **Leading** | Informes trimestrales pendientes | `avances_trimestrales` | Trimestral |
| **Lagging** | `avance_financiero` | `acciones` | 1–3 meses post-obra |
| **Lagging** | Estimaciones pagadas | `estimaciones` | Post-autorización |
| **Lagging** | `estatus` = concluida | `acciones` | Al cierre |
| **Lagging** | Reintegro TESOFE | `cierres_ejercicio` | Enero siguiente |

### 5.2 Correlación predictiva (reglas, sin ML)

En seed, **6 de 8 meses** de avance están validados; meses 7–8 pendientes. Obras con últimos avances `pendiente` y estimaciones `presentada` predicen retraso de pago en 60–90 días.

```
SI último_avance.estatus = 'pendiente'
   Y estimaciones recientes = 'presentada'
   Y DATEDIFF(hoy, fecha_termino_programada) > 0
ENTONCES prob_retraso := 0.7+
```

Persistir en `accion_scores.prob_retraso`.

---

## 6. Correlaciones normativas PROAGUA

| Regla U074 | Dataset | Correlación no explotada |
|------------|---------|--------------------------|
| Avance primeros 5 días del mes | `avances_mensuales.created_at` | Retraso de captura → sanción |
| Conclusión 31-dic | `fecha_termino_programada` | Obras activas post-ejercicio |
| Reintegro 15 días | `cierres_ejercicio.monto_por_reintegrar` | Guanajuato 2026: \$3.2M pendientes |
| Anexo técnico 10 días | `anexos_tecnicos` sin `archivo_url` | Solo 2 entidades con anexos en seed |

Las 6 `alerta_configs` PROAGUA evalúan estas reglas cada 6 h (`alertas-scheduler.service.ts`), pero **no alimentan** el campo `riesgo` de la acción ni el dashboard.

---

## 7. Matriz de explotación (prioridad × facilidad)

| Correlación | Facilidad | Impacto | Entrega |
|-------------|:---------:|:-------:|---------|
| Brecha físico-financiera | Alta | Crítico | Sprint 1 — `accion_scores` |
| ranking_score visible | Alta | Alto | Sprint 1 — API dashboard |
| Alerta × obra × municipio | Media | Alto | Sprint 1 — enriquecer seed + join |
| Leading/lagging pipeline | Media | Alto | Sprint 2 — `metric_snapshots` |
| Riesgo municipal (marginación) | Media | Medio | Sprint 2 — enriquecer municipios |
| ML prob_retraso | Baja | Alto | Sprint 3 — ver roadmap 11 |

---

## 8. Referencias

- ER y campos: [03-mapa-relaciones.md](./03-mapa-relaciones.md)
- KPIs: [07-catalogo-kpis.md](./07-catalogo-kpis.md)
- Roadmap predictivo: [11-roadmap-analitica-predictiva.md](./11-roadmap-analitica-predictiva.md)
- Madurez actual: [16-scorecard-madurez.md](./16-scorecard-madurez.md)
