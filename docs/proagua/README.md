# Lineamientos PROAGUA U074 — Referencia para ARKON CONAGUA

Documentación normativa de apoyo para la rama `conagua` de ARKON. La base legal son los **Lineamientos de operación del Programa de Agua Potable, Drenaje y Saneamiento (PROAGUA)**, clave U074, publicados en el DOF (vigencia 2026).

## Índice de anexos

Los formularios oficiales se versionan en esta carpeta (`docs/proagua/`). Nombres de archivo previstos:

| Anexo | Archivo | Propósito | Modelo ARKON principal |
|-------|---------|-----------|------------------------|
| **I** | `anexo-i-solicitud.xlsx` | Solicitud de recursos por entidad/municipio | `SolicitudPrograma` |
| **IX** | `anexo-ix-ficha-tecnica.xlsx` | Ficha técnica de la acción (datos de campo, inversión, beneficiarios) | `Obra`, `Cofinanciamiento`, `Municipio` |
| **XII** | `anexo-xii-ejecucion.docx` | Anexo de ejecución (convenio marco estado–CONAGUA) | `AnexoEjecucion` |
| **XIII** | `anexo-xiii-tecnico.xlsx` | Anexo técnico por ejecutor/organismo operador | `AnexoTecnico`, `OrganismoOperador` |
| **XVIII** | `anexo-xviii-avances.xlsx` | Reporte trimestral de avances físicos y financieros | `AvanceTrimestral` |
| **XXII** | `anexo-xxii-cierre.xlsx` | Cierre de ejercicio fiscal (transferencias y reintegros) | `CierreEjercicio` |
| **XXIII** | `anexo-xxiii-informe-final.xlsx` | Informe final de acción concluida | `Obra`, `Documento` |

**Documento base:** `lineamientos-u074.pdf` (Lineamientos U074).

**Extracción de referencia:** `anexo-xii-extract.json` — texto estructurado del Anexo XII para desarrollo.

**Mapeo campo a campo:** [mapeo-campos.md](./mapeo-campos.md)

**Alcance de producto (Fase C):** [alcance-fase-c.md](./alcance-fase-c.md)

### Anexos de desinfección (fuera de alcance v1)

Los anexos II, V, VI, XIV, XIX y XX corresponden al **tipo de apoyo Desinfección**. No se implementan en la v1 de ARKON CONAGUA; ver decisión en [alcance-fase-c.md](./alcance-fase-c.md).

---

## Ciclo de vida de una acción PROAGUA

Flujo normativo que ARKON debe soportar de forma incremental (Fases C y D):

```mermaid
flowchart LR
  A[Anexo I<br/>Solicitud] --> B[Anexo IX<br/>Ficha técnica]
  B --> C[Anexo XII<br/>Ejecución]
  C --> D[Anexo XIII<br/>Técnico por OO]
  D --> E[Ejecución<br/>en campo]
  E --> F[Anexo XVIII<br/>Avances trimestrales]
  F --> G[Anexo XXIII<br/>Informe final]
  G --> H[Anexo XXII<br/>Cierre fiscal]
```

| Etapa | Responsable típico | Salida en ARKON |
|-------|-------------------|-----------------|
| 1. Solicitud | Estado / municipio beneficiario | `SolicitudPrograma` (estatus `borrador` → `presentada` → `aprobada`) |
| 2. Validación técnica | CONAGUA (GPT / Dirección) | Oficio de validación → `Documento` categoría `programa` |
| 3. Formalización | Estado + CONAGUA | `AnexoEjecucion` (XII) + `AnexoTecnico` (XIII) por organismo operador |
| 4. Contratación | Ejecutor (OOO / municipio) | Campos en `Obra`: `numContrato`, `comprasMxFolio`, `tipoAdjudicacion`, `fechaFallo` |
| 5. Ejecución | Contratista + supervisión | `AvanceMensual` (operativo) + `Estimacion` (pagos) |
| 6. Reporte trimestral | Ejecutor → Estado → CONAGUA | `AvanceTrimestral` (normativo, Anexo XVIII) |
| 7. Conclusión | Ejecutor | `Obra.estatus` → `concluida`; informe final (XXIII) |
| 8. Cierre fiscal | Estado | `CierreEjercicio` (XXII): reintegros y saldos |

Jerarquía jurídica en base de datos:

```
EntidadFederativa
  └── AnexoEjecucion (XII)
        └── AnexoTecnico (XIII) ── OrganismoOperador
              └── Obra (acciones)
                    ├── Cofinanciamiento
                    ├── AvanceTrimestral (XVIII)
                    └── Documento / Estimacion
```

---

## Plazos críticos — Artículo 5 (calendario)

Plazos del calendario de operación PROAGUA. ARKON debe alertar y validar fechas en Fase D; en Fase C se documentan como reglas de negocio.

| Actividad | Plazo normativo | Consecuencia / nota |
|-----------|-----------------|---------------------|
| Presentar solicitudes (Anexo I) | **45 días naturales** desde publicación de lineamientos en DOF | Fuera de plazo: solicitud no procedente |
| Formalizar anexos XII y XIII | **10 días hábiles** posteriores a la aprobación de solicitudes | Retraso: posible **reducción del 15%** del monto autorizado |
| Radicación estado → ejecutor | **10 días hábiles** (recursos que pasa el estado al municipio/OOO) | Aplica cuando el estado administra y no ejecuta directamente |
| Contratación de obras | **Último día hábil de agosto** del ejercicio | Acciones sin contrato a esa fecha quedan sin efecto |
| Conclusión de acciones | **31 de diciembre** del ejercicio fiscal | Salvo prórroga autorizada por CONAGUA |
| Informes finales (XXIII) y cierre (XXII) | **Último día hábil de enero** del año siguiente | Obligatorio para acciones concluidas o en proceso de cierre |
| Reintegros de saldos no ejercidos | **15 días naturales** posteriores al cierre | Monto en `CierreEjercicio.montoReintegrado15ene` |
| Sanción por anexos tardíos | — | **15% de reducción** presupuestal sobre monto no formalizado a tiempo |

---

## Roles institucionales

Roles del ecosistema PROAGUA y su correspondencia aproximada en ARKON (v1):

| Rol normativo | Función | Equivalente ARKON v1 |
|---------------|---------|----------------------|
| **CONAGUA / SGAPDS** | Autoridad federal, publicación de lineamientos, validación final | Tenant CONAGUA; usuarios `estatal` (visión federal en demo) |
| **GPFAPS** | Gestión presupuestal federal del programa | No modelado; futuro integración financiera |
| **GPT** | Validación técnica de solicitudes y fichas | Usuario `coordinador` (demo) |
| **Comité Técnico** | Dictamen de solicitudes | Workflow Fase D |
| **Dirección CONAGUA** | Firma de anexos y autorizaciones | Permisos `estatal` ampliados (Fase D) |
| **Beneficiario (estado)** | Recibe recursos federales, formaliza XII | `EntidadFederativa` + usuarios estatales |
| **Ejecutor** | Municipio, organismo operador u organización comunitaria | `municipal.*`, `OrganismoOperador`, usuarios `contratista` |
| **CORESE** | Contraloría estatal, copia de anexos | Notificación / `Documento` (Fase D) |

Campo futuro en `Usuario`: `rolConagua` para distinguir GPT, GPFAPS, CORESE, etc., sin reemplazar el enum `Rol` genérico (`estatal` | `municipal` | `contratista`).

---

## Catálogos PROAGUA

Valores de referencia según lineamientos U074 y Anexo VII. Se almacenan en `AccionPrograma` y campos enum de `Obra` / `SolicitudPrograma`.

### Tipos de apoyo

| Código | Descripción | Alcance ARKON v1 |
|--------|-------------|------------------|
| `infraestructura` | Agua potable, alcantarillado, saneamiento | **Sí** — foco principal |
| `desinfeccion` | Filtros, tabletas, capacitación | **No** — fuera de alcance v1 |

### Componentes (infraestructura)

| Código | Nombre |
|--------|--------|
| `agua_potable` | Agua Potable (AP) |
| `alcantarillado` | Alcantarillado (ALC) |
| `saneamiento` | Saneamiento (SAN) |

### Subcomponentes

| Código | Nombre |
|--------|--------|
| `nuevo` | Nuevo (N) |
| `rehabilitado` | Rehabilitado (R) |
| `mejoramiento` | Mejoramiento de eficiencia (M) |

### Tipos de localidad

| Código | Criterio |
|--------|----------|
| `rural` | Población &lt; 2,500 habitantes |
| `urbano` | Población ≥ 2,500 habitantes |

### Acción específica (Anexo VII)

Catálogo `AccionPrograma`: clave única (ej. `AP-N-01`), programa `PROAGUA`, componente, subcomponente, descripción, unidad de medida y `tipoLocalidad` aplicable. El seed carga acciones representativas; la tabla completa se importa en Fase C/D.

### Fuentes de cofinanciamiento

| Fuente (`Cofinanciamiento.fuente`) | Descripción |
|-----------------------------------|-------------|
| `federal` | Aportación CONAGUA / federación |
| `estatal` | Gobierno del estado beneficiario |
| `municipal` | Municipio ejecutor o beneficiario |
| `organismo_operador` | Aportación del OOO |
| `otro` | Organizaciones comunitarias u otras fuentes |

---

## Documentación relacionada

- [CONAGUA.md](../CONAGUA.md) — arranque, variables de entorno y usuarios demo resumidos
- [CONAGUA-datos.md](../CONAGUA-datos.md) — trazabilidad de las 22 obras demo, organismos, municipios y alertas
- [mapeo-campos.md](./mapeo-campos.md) — tabla anexo → modelo Prisma
- [alcance-fase-c.md](./alcance-fase-c.md) — decisiones de producto Fase C
