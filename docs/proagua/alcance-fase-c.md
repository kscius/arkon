# Alcance de producto — Fase C (extensión PROAGUA)

Decisiones de alcance para la **Fase C** del plan de implementación ARKON CONAGUA: extensión del modelo de datos, API y UI alineados a lineamientos PROAGUA U074.

Este documento registra las **preguntas de producto** planteadas en la Fase B y las **decisiones recomendadas** (defaults) para desbloquear el desarrollo. Deben validarse con CONAGUA / equipo de producto antes de cerrar la fase.

---

## Resumen ejecutivo

| # | Tema | Decisión recomendada |
|---|------|----------------------|
| 1 | Programas PRODDER y PEAS | **PROAGUA primero**; PEAS/PRODDER solo datos seed, sin lineamientos propios aún |
| 2 | Módulo de desinfección | **Fuera de alcance v1** |
| 3 | Importación Excel de anexos | **Exportación en Fase D primero**; importación en hito **D8** |
| 4 | Multi-entidad federativa | **Sí**, vía modelo `EntidadFederativa` |
| 5 | Integración PASH / SIPOT | **Fuera de alcance v1** |

---

## 1. ¿Se implementa PRODDER y PEAS además de PROAGUA?

### Contexto

El demo CONAGUA incluye **22 obras** en tres programas:

- **PROAGUA** — 9 obras (infraestructura hídrica; anexos U074 en repo)
- **PRODDER** — 8 obras (devolución de derechos; lineamientos/anexos **no** incluidos en `docs/proagua/`)
- **PEAS** — 5 obras (fortalecimiento de entidades 2026; lineamientos publicados en DOF marzo 2026, **sin anexos** en repo)

### Opciones

| Opción | Descripción |
|--------|-------------|
| A | Solo PROAGUA con cumplimiento normativo completo |
| B | PROAGUA completo + PEAS/PRODDER como programas “ligeros” (mismo modelo `Obra`, sin anexos) |
| C | Paridad normativa para los tres programas |

### Decisión recomendada: **Opción B (PROAGUA primero)**

**Implementar en Fase C:**

- Modelo de datos, catálogos, anexos XII–XXIII y workflows **solo para PROAGUA** (`programa = 'PROAGUA'`).
- Campos compartidos en `Obra` (`folio`, `montoAutorizado`, `organismoOperadorId`, etc.) aplican a las 22 obras del seed.
- `AccionPrograma` y `SolicitudPrograma` aceptan `programa` ∈ `{ PROAGUA, PRODDER, PEAS }` para no bloquear el demo.

**No implementar en Fase C:**

- Anexos ni calendarios específicos de PRODDER o PEAS.
- Validaciones normativas distintas por programa (salvo etiqueta `programa` en UI y filtros).

**Criterio de aceptación:** una obra `PRODDER-2025-001` sigue visible y editable en el portal; una obra `PROAGUA-2023-001` puede vincularse a `AnexoTecnico`, `Cofinanciamiento` y `AvanceTrimestral`.

---

## 2. ¿Módulo de desinfección (Anexos II, V, VI, XIV, XIX, XX)?

### Contexto

Los lineamientos U074 contemplan un **tipo de apoyo Desinfección** (filtros intradomiciliarios, tabletas, capacitación). El demo incluye una acción relacionada (`PROAGUA-2024-002` — filtros Bustamante-Miquihuana, SRHDS Tamaulipas), pero los formularios de desinfección no están en el paquete de siete anexos de infraestructura.

### Opciones

| Opción | Descripción |
|--------|-------------|
| A | Incluir desinfección en v1 con modelos y anexos II–XX |
| B | Excluir desinfección; solo infraestructura (AP, ALC, SAN) |
| C | Registrar obras de desinfección como `Obra` genérica sin anexos |

### Decisión recomendada: **Opción B — fuera de alcance v1**

- `SolicitudPrograma.tipoApoyo` y `CierreEjercicio.tipoApoyo` reservan el valor `desinfeccion` en schema, pero **sin UI ni plantillas** en Fase C.
- La obra demo de filtros permanece en seed como `PROAGUA` con descripción textual; no se exige `AnexoTecnico` ni catálogo de desinfección.
- **Fase D+:** evaluar anexos II/V/VI/XIV/XIX/XX si CONAGUA prioriza el módulo.

---

## 3. ¿Importación Excel de anexos o solo captura manual?

### Contexto

Los siete anexos oficiales son archivos **Excel/DOCX**. Los usuarios institucionales esperan interoperabilidad con esos formatos.

### Opciones

| Opción | Descripción |
|--------|-------------|
| A | Importación Excel en Fase C |
| B | Solo captura manual en UI |
| C | Exportación a Excel en Fase D; importación en hito posterior |

### Decisión recomendada: **Opción C**

| Hito | Entrega |
|------|---------|
| **Fase C** | CRUD en UI/API; campos mapeados en Prisma; validaciones básicas |
| **Fase D (inicio)** | **Exportación** a plantillas oficiales (XVIII, XXII, XXIII prioritarios) |
| **Fase D8** | **Importación** Excel con validación de esquema y preview de errores |

**Motivo:** la importación requiere parsers estables por anexo, manejo de versiones de plantilla y pruebas con archivos reales; la exportación entrega valor antes y define el contrato de columnas.

**Captura manual en Fase C:** formularios web para `Cofinanciamiento`, `AvanceTrimestral`, vínculo XII→XIII→Obra.

---

## 4. ¿Multi-entidad federativa o una sola instancia CONAGUA?

### Contexto

Las obras demo abarcan **múltiples estados** (Durango, Sonora, Morelos, Oaxaca, Quintana Roo, Tamaulipas, Guanajuato, Querétaro, Puebla, CDMX, Yucatán). El Anexo XII se firma **por entidad federativa** y ejercicio.

### Opciones

| Opción | Descripción |
|--------|-------------|
| A | Una entidad fija (ej. solo Durango) |
| B | Multi-entidad en una instancia tenant `conagua` |
| C | Un tenant por estado |

### Decisión recomendada: **Opción B — multi-entidad vía `EntidadFederativa`**

- Modelo `EntidadFederativa` con `clave` INEGI de 2 dígitos; `Municipio.entidadId` y `Obra.entidadFederativaId` obligatorios para obras PROAGUA nuevas.
- `AnexoEjecucion` scoped por `entidadFederativa` (texto o FK futura) y `ejercicioFiscal`.
- Un solo tenant `conagua` para la demo federal; usuarios estatales filtran por entidad asignada (regla de autorización en Fase D).
- **No** multi-tenant por estado en v1 (complejidad operativa innecesaria para el piloto).

**Seed:** poblar entidades presentes en `obras.json` y vincular municipios/organismos.

---

## 5. ¿Integración con PASH y SIPOT (sistemas financieros CONAGUA)?

### Contexto

**PASH** (presupuesto) y **SIPOT** (trámites/operación) son sistemas internos de CONAGUA para dispersión y control de recursos federales. Los lineamientos exigen conciliación de transferencias y reintegros (Anexo XXII).

### Opciones

| Opción | Descripción |
|--------|-------------|
| A | Integración bidireccional en Fase C |
| B | Campos manuales en `CierreEjercicio` sin integración |
| C | Integración en fase posterior con API oficial |

### Decisión recomendada: **Opción B — fuera de alcance v1 (sin integración)**

- `CierreEjercicio` captura montos **manualmente** o por importación Excel (D8).
- No hay llamadas a PASH/SIPOT en Fase C ni Fase D inicial.
- Documentar en README que los montos de cierre son **declarativos** hasta existir convenio de interfaz con CONAGUA.

---

## Alcance incluido en Fase C (checklist)

Con las decisiones anteriores, la Fase C **sí incluye**:

- [x] Modelos: `EntidadFederativa`, `OrganismoOperador`, `AccionPrograma`, `Cofinanciamiento`, `AnexoEjecucion`, `AnexoTecnico`, `AvanceTrimestral`, `CierreEjercicio`, `SolicitudPrograma`
- [x] Extensión `Obra` y `Municipio` con campos PROAGUA
- [x] API CRUD para entidades anteriores (prioridad alta: cofinanciamiento, avances trimestrales, organismos)
- [x] UI: secciones PROAGUA en detalle/edición de obra
- [x] Seed CONAGUA extendido con entidades, cofinanciamiento de ejemplo y al menos un anexo XII→XIII→obra
- [x] Catálogo `AccionPrograma` para PROAGUA (subconjunto Anexo VII)

La Fase C **no incluye**:

- [ ] Anexos y flujos de desinfección
- [ ] Lineamientos/anexos PRODDER o PEAS
- [ ] Importación Excel (hasta D8)
- [ ] Integración PASH/SIPOT
- [ ] Roles institucionales completos (GPT, GPFAPS, CORESE) más allá de `rolConagua` opcional
- [ ] Alertas automáticas por plazos Art. 5 (Fase D)

---

## Riesgos y dependencias

| Riesgo | Mitigación |
|--------|------------|
| Obra PROAGUA de desinfección en seed sin modelo específico | Mantener como obra narrativa; no exigir anexos PROAGUA estrictos |
| Usuarios esperan importar Excel desde día 1 | Comunicar roadmap D → D8; exportación temprana |
| Múltiples estados sin filtro de permisos | Implementar filtro por `entidadFederativaId` en Fase D |
| `Contratista` legacy vs `OrganismoOperador` | Migración de seed y deprecación gradual de `contratistaId` en UI PROAGUA |

---

## Historial de decisiones

| Fecha | Versión | Notas |
|-------|---------|-------|
| 2026-06-21 | 1.0 | Defaults recomendados para desbloquear Fase C según plan maestro |

---

## Referencias

- [README.md](./README.md) — ciclo de vida y plazos Art. 5
- [mapeo-campos.md](./mapeo-campos.md) — campos implementados
- [CONAGUA-datos.md](../CONAGUA-datos.md) — dataset demo
- Plan maestro: `.cursor/plans/conagua-impl-plan.md`
