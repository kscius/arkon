# 02 — Inventario de datos ARKON CONAGUA

> Entregable del reanálisis ARKON CONAGUA. Catálogo de tablas, volúmenes del seed demo (`TENANT_ID=conagua`) y cobertura por programa federal.
>
> Fuente de verdad: `ARKON/apps/api/prisma/schema.prisma`, `seed.ts`, `seed-data/conagua/*.json`, [CONAGUA-datos.md](../CONAGUA-datos.md).

---

## 1. Resumen ejecutivo

ARKON CONAGUA persiste **26 modelos Prisma** mapeados a tablas PostgreSQL 16. En el tenant demo, **21 tablas están pobladas** con datos operativos; **5 tablas analíticas/IA** existen en esquema pero llegan vacías al seed (preparadas para jobs de scoring, snapshots y RAG).

El dataset demo es **pequeño pero representativo**: 22 acciones reales o ilustrativas de PROAGUA, PRODDER y PEAS, con series temporales de 8 meses por obra, expediente documental completo y flujos de validación municipal/estatal.

| Dimensión | Valor seed CONAGUA |
|-----------|-------------------|
| Acciones (CUAs) | 22 |
| Municipios | 14 |
| Contratistas / OO en legacy | 15 |
| Avances mensuales | 176 (22 × 8) |
| Estimaciones | 51 (derivadas de `avance_financiero`) |
| Documentos | 176 (22 × 8 categorías) |
| Alertas | 8 |
| Programas federales activos | 3 (PROAGUA, PRODDER, PEAS) |
| Inversión autorizada total | ~\$462 M MXN (suma seed) |

---

## 2. Inventario de tablas (26 modelos)

### 2.1 Capa geográfica y catálogos

| Tabla (`@@map`) | Modelo | Registros seed | Rol analítico |
|-----------------|--------|----------------|---------------|
| `entidades_federativas` | EntidadFederativa | 11 | Agrupación estatal, anexos de ejecución |
| `municipios` | Municipio | 14 | Alcance municipal, mapa, marginación (`es_zap`, `poblacion` latentes) |
| `organismos_operadores` | OrganismoOperador | 15 | Ejecutor / prestador de servicios |
| `programas` | Programa | 3 | Catálogo PROAGUA / PRODDER / PEAS |
| `acciones_programa` | AccionPrograma | 9 | Claves normativas AP/TAR/saneamiento por tipo de localidad |
| `contratistas` | Contratista | 15 | Legacy demo; en Fase C migran a OO |
| `users` | Usuario | 9 | RBAC estatal / municipal / contratista |

### 2.2 Núcleo transaccional (entidad central: `acciones`)

| Tabla | Modelo | Registros seed | Granularidad |
|-------|--------|----------------|--------------|
| `acciones` | Accion | 22 | CUA, montos, avances resumen, geo, ficha PROAGUA |
| `avances_mensuales` | AvanceMensual | 176 | Serie mensual programado / reportado / validado |
| `avances_trimestrales` | AvanceTrimestral | ~28 | Solo obras en ejecución; informes CONAC |
| `estimaciones` | Estimacion | 51 | Pipeline de pago municipal → estatal |
| `documentos` | Documento | 176 | Expediente por categoría (admin, técnica, ejecución, cierre, programa) |
| `observaciones` | Observacion | 16 | Supervisión (1 de cada 3 obras × 2 obs.) |
| `cofinanciamientos` | Cofinanciamiento | 44 | 50 % federal + 50 % estatal por obra |
| `alertas` | Alerta | 8 | Eventos presupuestarios/operativos |
| `alerta_configs` | AlertaConfig | 6 | Reglas PROAGUA (plazos U074) |
| `solicitudes_programa` | SolicitudPrograma | 3 | Anexo I (borrador → aprobada) |
| `anexos_ejecucion` | AnexoEjecucion | 2 | Durango 2024, Guanajuato 2026 |
| `anexos_tecnicos` | AnexoTecnico | 3 | Vinculados a OO (CAD, JAPAMI, SIMAPAG) |
| `cierres_ejercicio` | CierreEjercicio | 3 | Anexo XXII — reintegros TESOFE |

### 2.3 Capa analítica / IA (esquema listo, seed vacío)

| Tabla | Modelo | Estado seed | Uso previsto |
|-------|--------|-------------|--------------|
| `accion_scores` | AccionScore | Vacía | SPI/CPI/EAC, riesgo calculado, probabilidades |
| `metric_snapshots` | MetricSnapshot | Vacía | Histórico de KPIs por periodo |
| `document_chunks` | DocumentChunk | Vacía | Embeddings RAG sobre PDFs |
| `recomendaciones` | Recomendacion | Vacía | Acciones prescriptivas con HITL |
| `activos_hidraulicos` | ActivoHidraulico | Vacía | Registro post-obra (horizonte Capa A) |
| `ia_audit_logs` | IaAuditLog | Vacía | Trazabilidad ASF / LGPDPPSO |

**Acción inmediata:** poblar `accion_scores` con el primer job nocturno de EVM + riesgo (ver [11-roadmap-analitica-predictiva.md](./11-roadmap-analitica-predictiva.md)).

---

## 3. Distribución por programa

| Programa | Acciones | % portafolio | Patrón de datos |
|----------|:--------:|:------------:|-----------------|
| **PROAGUA** | 9 | 41 % | Obras de infraestructura AP/TAR con CUA, contrato ComprasMX, cobertura MIR |
| **PRODDER** | 8 | 36 % | Devolución de derechos; fuerte peso Guanajuato; alertas presupuestarias |
| **PEAS** | 5 | 23 % | Portafolio 2026; anexos técnicos Guanajuato; transición normativa DOF 5781302 |

Cada acción lleva `programa`, `tipo_programa` (federal), `dependencia` (CONAGUA), `tipo_obra` (`TipoAccion`, p.ej. `agua_potable`, `drenaje_saneamiento`) y opcionalmente `accion_programa_id` → clave normativa (`AP-N-R`, `TAR-M-U`, etc.).

---

## 4. Campos de alto valor (subutilizados hoy)

| Campo en `acciones` | Poblado en seed | Explotado en UI/API |
|---------------------|:---------------:|:-------------------:|
| `cua`, `id_sisba`, `num_contrato` | Sí (obras con CUA) | Parcial (detalle, exports) |
| `cobertura_ap_*`, `cobertura_tar_*` | Sí (enriquecimiento PROAGUA) | Solo export Anexo |
| `caudal_lps` | Sí (obras AP) | No en dashboards |
| `pob_incorporar`, `pob_mejorar`, desagregados | Sí | No agregados a MIR I.1–I.4 |
| `latitud`, `longitud` | Sí | Marcadores; sin choropleth |
| `riesgo` (manual) | Sí | Badge; no calculado |
| `evidencia_fotografica` (JSON) | `[]` | Vacío en demo |

---

## 5. Calidad y limitaciones del inventario demo

1. **Municipio vs localidad real:** 14 municipios seed rotan `municipioId`; el campo `localidad` conserva la ubicación verificable (p.ej. Ocampo para Tayoltita).
2. **Contratista vs organismo operador:** 15 filas en `contratistas` representan OO de agua; `organismo_operador_id` en acciones aún no siempre enlazado.
3. **Fechas como string:** `fecha_inicio`, periodos de avance — parseo inconsistente para ML; normalizar a `DATE` en Fase 2.
4. **Avance resumen vs serie:** `avance_fisico_real` en `acciones` debe cuadrar con último `avances_mensuales.validado`; hoy es coherente en seed pero no hay constraint DB.
5. **Tablas analíticas vacías:** el scorecard ([16-scorecard-madurez.md](./16-scorecard-madurez.md)) penaliza ausencia de inteligencia derivada — el esquema ya anticipa la solución.

---

## 6. Recomendaciones accionables

| Prioridad | Acción | Tablas impactadas |
|:---------:|--------|-------------------|
| P0 | Job nocturno que llene `accion_scores` desde avances + estimaciones | `accion_scores`, `metric_snapshots` |
| P0 | Validar integridad físico-financiera en seed y producción | `acciones`, `avances_mensuales`, `estimaciones` |
| P1 | Enlazar todas las acciones a `organismo_operador_id` | `acciones`, `organismos_operadores` |
| P1 | Agregar `marginacion`, `es_zap` a municipios CONAGUA | `municipios` |
| P2 | Ingesta piloto de chunks sobre 20 PDFs cargados | `document_chunks` |
| P2 | Registrar activos post-obra en 3 acciones piloto | `activos_hidraulicos` |

---

## 7. Referencias cruzadas

- Relaciones ER: [03-mapa-relaciones.md](./03-mapa-relaciones.md)
- Correlaciones para explotar: [04-correlaciones-ocultas.md](./04-correlaciones-ocultas.md)
- KPIs derivables: [07-catalogo-kpis.md](./07-catalogo-kpis.md)
- Benchmark SOTA: [08-benchmark-internacional.md](./08-benchmark-internacional.md)
