# 09 — Adaptación regulatoria México: PROAGUA, PRODDER, PEAS y marco institucional

> Entregable del reanálisis ARKON CONAGUA. Traduce el benchmark internacional ([08-benchmark-internacional.md](./08-benchmark-internacional.md)) al **marco normativo, fiscal y de datos** que condiciona el diseño del sistema. Sin esta capa, cualquier “estado del arte” importado sería incompatible con CONAGUA, SHCP, ASF y la LGPDPPSO.

---

## 0. Resumen ejecutivo

ARKON ya tomó la decisión arquitectónica correcta al centrar el modelo en **`Accion` = CUA** (Clave Única de Acción), no en una abstracción genérica de “obra”. Lo que falta no es re-modelar, sino **operacionalizar la normativa** en software: motor de plazos versionado por ejercicio, KPIs MIR I.1–I.4, anexos diferenciados 2025 vs U074 2026, transición PRODDER → PEAS, trazabilidad SISBA/CUA y gobernanza LGPDPPSO sobre expedientes con PII.

**Implicación para el roadmap:** la Fase QW (motor PROAGUA, QW6) y la Fase PX (KPIs MIR, versionado de anexos) no son “nice to have” regulatorios — son requisitos de legitimidad institucional que habilitan auditoría ASF y reporte PASH/CONAC.

---

## 1. Los tres programas y su convivencia en ARKON

### 1.1 PROAGUA — Programa de Agua Potable, Drenaje y Saneamiento

| Aspecto | Detalle normativo | Implicación ARKON |
|---------|-------------------|-------------------|
| **Objeto** | Obras de abastecimiento, redes, saneamiento, PTAR en municipios y OO | `programa = 'PROAGUA'`; tipos de acción en catálogo |
| **Unidad de gestión** | **CUA** — una acción = un expediente completo | Modelo `Accion` con `cua` único; import `/proagua/import/acciones` |
| **Norma vigente demo** | Reglas de Operación 2025 (DOF 5750579); Lineamientos U074 2026 | Anexos IX, XIII, XVIII, XXII, XXIII ya exportables; numeración distinta por año |
| **Plazos críticos** | Tabla 5 Reglas 2025 (ver §3) | Parcialmente en `alerta-config-evaluator`; sin calendario parametrizable |
| **Cofinanciamiento** | Aportaciones estatal/municipal | Tabla `Cofinanciamiento` modelada |

PROAGUA es el **programa dominante** del seed CONAGUA (~mayoría de las 22 acciones). Las reglas de contratación (31 agosto), avances mensuales (primeros 5 días), conclusión (31 diciembre) y reintegro TESOFE (15 días naturales) ya tienen **semillas en alertas** (`alertas-scheduler.service.ts`, `alerta-config-evaluator.service.ts`) pero están **dispersas** y no versionadas por ejercicio fiscal.

### 1.2 PRODDER — Programa de Devolución de Derechos

| Aspecto | Detalle | Implicación ARKON |
|---------|---------|-------------------|
| **Financiamiento** | Recursos devueltos por derechos de agua (LFD) | Acciones históricas 2017–2025 en seed |
| **Enfoque** | Eficiencia, macromedición, rehabilitación de redes | Campos `caudalLps`, cobertura AP/TAR relevantes post-obra |
| **Estado 2026** | **Sustituido normativamente por PEAS** (DOF 03-mar-2026) | Convivencia en demo para ilustrar transición; UI en `SolicitudesPage` |

PRODDER no desaparece del histórico: las acciones en ejecución o cierre deben seguir reglas de su ejercicio de origen. ARKON debe soportar **reglas por `ejercicio` + `programa`**, no un único perfil “actual”.

### 1.3 PEAS — Programa para el Fortalecimiento de Entidades de Agua y Saneamiento

| Aspecto | Detalle | Implicación ARKON |
|---------|---------|-------------------|
| **Publicación** | DOF marzo 2026 (5781302) | Nuevo flujo en solicitudes y programas |
| **Paradigma** | Prestador-céntrico por **derechos** (LFD art. 231-A / 279) | Vertientes A (inversión) y B (operación); distinto a PROAGUA obra-municipio |
| **Relación PRODDER** | Sustitución normativa | Migración de catálogo y flujos de solicitud; no borrar histórico PRODDER |

**Diseño recomendado:** tabla o JSON de **`reglas_programa`** por `(programa, ejercicio)` que alimente el motor de plazos (QW6) y los exports de anexos (PX4). Evita hardcodear en el scheduler.

---

## 2. CUA y SISBA: identidad y trazabilidad

### 2.1 Clave Única de Acción (CUA)

La CUA es el **identificador canónico** de una acción ante CONAGUA y SHCP. En ARKON:

- Campo `cua` en `Accion` (único por registro).
- Formato ilustrativo en seed: `CUA-PROAGUA-2023-001`.
- Import CSV exige CUA como clave de upsert (`proagua-import.service.ts`).

**Requisitos de sistema:**

1. **Inmutabilidad:** la CUA no debe cambiar tras alta; correcciones vía observaciones auditadas.
2. **Búsqueda transversal:** listado, mapa, exports y API pública (futuro) indexados por CUA.
3. **Join externo:** al integrar SISBA u Obra Pública Abierta, la CUA es la clave de cruce.

### 2.2 SISBA (Sistema de Información de Seguimiento de Beneficios y Acciones)

SISBA es el registro federal de seguimiento de acciones de inversión. ARKON no lo reemplaza; debe ser **compatible hacia afuera**:

| Dimensión | SISBA (referencia) | ARKON hoy | Brecha |
|-----------|-------------------|-----------|--------|
| Identificador | CUA / folio programa | `cua`, `folio` | Alineado |
| Avance físico/financiero | Reportes periódicos | `AvanceMensual`, `AvanceTrimestral` | Falta validación de ventanas |
| Georreferencia | Coordenadas municipio/obra | `latitud`, `longitud`, `claveInegi` | Subutilizado en GIS |
| Estatus de etapa | Ciclo de vida federal | `EstatusAccion` enum | Mapeo explícito a catálogo SISBA pendiente |
| Anexos | Formularios oficiales | Exports IX/XIII/XVIII/XXII/XXIII | Versionado por ejercicio pendiente |

**Acción de roadmap:** en Fase PX, definir **tabla de equivalencias** `estatus_arkon → codigo_sisba` y endpoint de export compatible (XML/CSV según especificación vigente), sin duplicar captura manual.

---

## 3. Plazos fiscales y calendario normativo PROAGUA

### 3.1 Tabla de plazos (Reglas de Operación 2025 — referencia)

| Hito | Plazo | Tipo días | Sanción / efecto | Estado ARKON |
|------|-------|-----------|------------------|--------------|
| Presentación solicitud | Según convocatoria ejercicio | Calendario | No elegible | Parcial en solicitudes |
| Dictamen Comité Técnico | 30 días desde recepción | Hábiles | Retorno a entidad | No automatizado |
| Formalización anexo técnico | 5 días post-dictamen favorable | Hábiles | -15% presupuesto | Regla en `alerta-config-evaluator` |
| Licitación / contratación | 30 días (ref. Art. 5 U074) | Calendario | Alerta agosto | `plazo_contratacion` en seed |
| Avance mensual | Primeros 5 días de cada mes | Calendario | Retraso en reporte | No por acción |
| Conclusión de obra | 31 de diciembre ejercicio | Calendario | Cierre forzoso | `plazo_conclusion` parcial |
| Cierre administrativo | Enero siguiente | Calendario | Bloqueo pagos | No automatizado |
| Reintegro TESOFE | 15 días post-cierre | Naturales | Responsabilidad patrimonial | Regla en evaluator |

### 3.2 Motor de plazos parametrizable (objetivo QW6)

**Problema actual:** reglas en `PROAGUA_ALERTA_CONFIGS` (seed) y `alerta-config-evaluator.service.ts` mezclan lógica 2025 con comentarios U074 2026, sin tabla de calendario por ejercicio.

**Diseño objetivo:**

```
reglas_plazo(programa, ejercicio, tipo_hito, dias, tipo_dia, fecha_ancla, sancion_codigo)
cumplimiento_hito(accion_id, tipo_hito, fecha_limite, fecha_cumplimiento, estado, evidencia_doc_id)
```

- **Cálculo:** job nocturno + evaluación on-demand al guardar fechas.
- **UI:** widget “Cumplimiento normativo” en detalle de obra y panel estatal.
- **Alertas:** reutilizar `Alerta` / `AlertaConfig` con `tipo` alineado a hito.

### 3.3 Calendario fiscal federal (transversal)

| Concepto | Implicación |
|----------|-------------|
| **Ejercicio fiscal** | 1 ene – 31 dic; campo `ejercicio` en acciones y snapshots |
| **Clasificación presupuestal** | Capítulo 6000 inversión; ligado a `montoAutorizado`, `montoContratado`, `montoEjercido` |
| **Cierre contable** | Enero: congelar avances del ejercicio anterior; `metric_snapshots` por cierre |
| **Reintegros** | Monto no ejercido → TESOFE; alerta con monto calculado (ya parcial en evaluator) |
| **Modificaciones** | Ampliaciones/reducciones vía estimaciones y anexos; trazabilidad en `Estimacion` |

---

## 4. MIR, PASH y CONAC: indicadores obligatorios

### 4.1 Matriz de Indicadores de Resultados (MIR) — SED/CONAGUA

**Regla de oro (repetida en benchmark y scorecard):** no inventar KPIs paralelos con nombres distintos. Los oficiales son:

| ID | Indicador | Fórmula (resumen) | Campos ARKON disponibles |
|----|-----------|-------------------|--------------------------|
| **I.1** | % población con acceso formal a agua potable | Hab. incorporadas / pob. sin acceso × 100 | `poblacionBeneficiada`, datos municipio |
| **I.2** | % población con acceso formal a alcantarillado | Análogo saneamiento | Cobertura TAR en schema |
| **I.3** | % cobertura de tratamiento de aguas residuales | Caudal tratado / caudal colectado × 100 | `caudalLps`, tipo acción PTAR |
| **I.4** | % caudal desinfectado | Caudal desinfectado / caudal producido × 100 | Requiere captura operativa o anexo técnico |

**Reporte:** PASH (Programa Anual de Evaluación) a SHCP; seguimiento **CONAC trimestral**; fiscalización **ASF**.

**Estado ARKON:** campos hidráulicos existen pero **no se calculan** MIR I.1–I.4 (score B11 = 2). Objetivo Fase PX (PX4): módulo `mir-kpis` con agregación por entidad federativa, programa y ejercicio; exports versionados.

### 4.2 PASH y anexos de ejecución

Los anexos PROAGUA (IX avance, XIII estimaciones, XVIII técnico, XXII observaciones, XXIII informe final) varían numeración entre **Anexos 2025** y **Lineamientos U074 2026**. ARKON ya exporta varios; falta:

- **Versionado por ejercicio** en plantillas (PX5).
- **Validación pre-export:** completitud de campos obligatorios por anexo.
- **Hash / versión** del documento generado para auditoría.

---

## 5. LGPDPPSO y protección de datos en expedientes

### 5.1 Ley General de Protección de Datos Personales en Posesión de Sujetos Obligados

ARKON maneja datos personales en usuarios, contratistas, contactos de organismos y posiblemente expedientes PDF. Principios de diseño:

| Principio LGPDPPSO | Implementación ARKON |
|--------------------|----------------------|
| **Minimización** | No indexar en RAG chunks con CURP/RFC de personas si no es necesario; enmascarar en logs |
| **Finalidad** | Separar dataset **público** (obra, monto, ubicación, avance) de **expediente restringido** |
| **Acceso (RBAC)** | Roles estatal / municipal / contratista ya existentes; ampliar scopes por recurso |
| **Conservación** | Política de retención por ejercicio; no usar seed demo como producción |
| **Transparencia** | Aviso de privacidad en portal; registro de accesos a expedientes |
| **IA y datos** | No entrenar modelos con PII sin base legal; auditoría de prompts y chunks (PX5) |

### 5.2 Separación de capas de datos

```
┌─────────────────────────────────────┐
│  Capa pública (transparencia)       │  Obras, montos, avance %, geo agregada
├─────────────────────────────────────┤
│  Capa operativa (RBAC)              │  Estimaciones, observaciones, alertas
├─────────────────────────────────────┤
│  Capa expediente (restringida)      │  PDFs, contratos, datos personales
└─────────────────────────────────────┘
         ↓ RAG indexa capa 2+3 con ACL por rol
```

**pgvector (Fase F):** columna `metadata.acl_roles` en `document_chunks`; filtro en retrieval.

---

## 6. Transición normativa 2025 → 2026

| Tema | 2025 | 2026 | Acción ARKON |
|------|------|------|--------------|
| Anexos | Numeración Anexos 2025 | Lineamientos U074 | Plantillas duales en export |
| PRODDER | Vigente | Sustituido por PEAS | Flag `programa`; reglas históricas |
| PEAS | — | DOF mar-2026 | Flujo solicitud vertiente A/B |
| Fiscalización | ASF CP2024 lineamientos | Continuidad + IA explicable | Auditoría de scores y recomendaciones |

---

## 7. Checklist de conformidad para el roadmap

| # | Requisito regulatorio | Fase roadmap | Entregable |
|---|----------------------|--------------|------------|
| R1 | CUA como identidad única | — (hecho) | Modelo `Accion` |
| R2 | Motor plazos por ejercicio/programa | QW6 | `compliance` module |
| R3 | Alertas PROAGUA consolidadas | QW6 | Widget cumplimiento |
| R4 | KPIs MIR I.1–I.4 | PX4 | Dashboard MIR + export PASH |
| R5 | Anexos versionados | PX5 | Plantillas 2025/U074 |
| R6 | Equivalencia SISBA | PX4 | Mapeo estatus + export |
| R7 | LGPDPPSO en RAG/IDP | PR + PX5 | ACL chunks, auditoría IA |
| R8 | HITL en pagos/documentos | PR1 | Cola revisión IDP |
| R9 | Transición PEAS | PX4 | Reglas programa PEAS |

---

## 8. Riesgos regulatorios

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|:------------:|:-------:|------------|
| Cambio de anexos mid-ejercicio | Media | Alto | Versionado + feature flag por `ejercicio` |
| Interpretación distinta de plazos (hábiles vs naturales) | Media | Medio | Catálogo explícito; calendario SEP/SHCP configurable |
| Datos demo presentados como oficiales | Alta (demo) | Alto | Banner “ilustrativo”; doc CONAGUA-datos.md |
| RAG expone PII de PDFs | Media | Alto | Redacción en IDP; ACL; no indexar sin clasificación |
| PEAS vertiente B sin modelo de datos | Media | Medio | Extender `SolicitudPrograma` en PX |

---

## 9. Conclusión

La adaptación México no es un capítulo aparte del estado del arte: **es el marco dentro del cual el estado del arte debe operar**. ARKON tiene el modelo de datos correcto (CUA, programas, avances, anexos); la brecha es **automatizar la normativa** con el mismo rigor que se aplicará a EVM y riesgo. El motor de plazos (QW6) y los KPIs MIR (PX4) son los dos pilares regulatorios que, junto con LGPDPPSO en la capa de IA, permiten que el sistema sea defendible ante SHCP, ASF y auditoría interna.

**Referencias cruzadas:** [12-roadmap-implementacion-priorizado.md](./12-roadmap-implementacion-priorizado.md) (fases), [13-quick-wins.md](./13-quick-wins.md) (QW6), [10-oportunidades-ia.md](./10-oportunidades-ia.md) (gobernanza IA), [16-scorecard-madurez.md](./16-scorecard-madurez.md) (B11).
