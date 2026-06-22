# Mapeo de campos: Anexos PROAGUA → Modelos Prisma

Referencia campo a campo entre los **siete anexos** de infraestructura PROAGUA (I, IX, XII, XIII, XVIII, XXII, XXIII) y el esquema Prisma de ARKON (`apps/api/prisma/schema.prisma`).

**Leyenda de estado**

| Estado | Significado |
|--------|-------------|
| Implementado | Campo o entidad ya existe en schema/migración Fase C |
| Parcial | Existe equivalente con cobertura incompleta |
| Fase D | Modelo listo; UI/workflow/importación en fase siguiente |
| N/A v1 | Fuera de alcance según [alcance-fase-c.md](./alcance-fase-c.md) |

---

## Resumen por modelo

| Modelo Prisma | Anexos principales | Rol |
|---------------|-------------------|-----|
| `EntidadFederativa` | I, IX, XII, XIII | Estado beneficiario (clave INEGI 2 dígitos) |
| `OrganismoOperador` | IX, XIII, XVIII | Ejecutor técnico (OOO, SMAPAS, etc.) |
| `SolicitudPrograma` | I | Solicitud inicial de recursos |
| `AnexoEjecucion` | XII, XXII | Convenio marco por ejercicio y entidad |
| `AnexoTecnico` | XIII | Paquete de acciones por organismo operador |
| `Obra` | IX, XIII, XVIII, XXIII | Acción individual (CUA) |
| `Cofinanciamiento` | IX, XIII, XXII | Desglose federal/estatal/municipal/OOO |
| `AvanceTrimestral` | XVIII | Reporte normativo trimestral |
| `CierreEjercicio` | XXII | Cierre fiscal y reintegros |
| `Municipio` | I, IX, XIII | Localidad beneficiaria |
| `AccionPrograma` | I, IX, XIII | Catálogo Anexo VII |
| `Documento` | I, IX, XXIII | Oficios, fichas firmadas, informes |

---

## Tabla de mapeo

| Campo en anexo / lineamiento | Anexo(s) | Modelo Prisma | Campo Prisma | Estado | Notas |
|------------------------------|----------|---------------|--------------|--------|-------|
| Entidad federativa (nombre) | I, IX, XII, XIII | `EntidadFederativa` | `nombre` | Implementado | |
| Clave INEGI entidad (2 dígitos) | IX, XIII | `EntidadFederativa` | `clave` | Implementado | |
| Municipio / localidad | I, IX, XIII | `Municipio` | `nombre` | Implementado | Demo: 14 municipios en seed |
| Clave INEGI localidad | IX, XIII | `Municipio` | `claveInegi` | Implementado | Pendiente poblar en seed |
| Tipo de localidad (rural/urbana) | IX, XIII | `Municipio` / `Obra` | `tipoLocalidad` | Implementado | También en `AnexoTecnico.tipoLocalidad` |
| Grado de marginación CONAPO | IX, XIII | `Municipio` | `marginacion` | Implementado | Enum texto: `muy_alta` … `muy_baja` |
| Zona de atención prioritaria (ZAP) | IX, XIII | `Municipio` | `esZap` | Implementado | Boolean |
| Población de la localidad | IX | `Municipio` | `poblacion` | Implementado | |
| Coordenadas geográficas | IX | `Municipio` / `Obra` | `latitud`, `longitud` | Implementado | |
| Programa | I | `SolicitudPrograma` / `Obra` | `programa` | Implementado | `PROAGUA` en v1 |
| Ejercicio fiscal | I, XII, XIII, XVIII, XXII | Varios | `ejercicioFiscal` | Implementado | En `SolicitudPrograma`, `AnexoEjecucion`, `AnexoTecnico`, `AvanceTrimestral`, `CierreEjercicio` |
| Tipo de apoyo | I, XII, XXII | `SolicitudPrograma` / `CierreEjercicio` | `tipoApoyo` | Implementado | `infraestructura` \| `desinfeccion` (v1 solo infraestructura) |
| Componente (AP/ALC/SAN) | I, IX, XIII | `SolicitudPrograma` / `Obra` | `componente` / `tipoObra` | Parcial | `tipoObra` enum genérico; alinear con catálogo PROAGUA |
| Subcomponente (N/R/M) | IX, XIII | `Obra` | `subcomponente` | Implementado | `nuevo` \| `rehabilitado` \| `mejoramiento` |
| Acción específica Anexo VII | I, IX, XIII | `AccionPrograma` | `clave`, `descripcion`, … | Implementado | FK `Obra.accionProgramaId` |
| Monto solicitado | I | `SolicitudPrograma` | `montoSolicitado` | Implementado | |
| Estatus de solicitud | I | `SolicitudPrograma` | `estatus` | Implementado | `borrador`, `presentada`, `aprobada`, … |
| Obra resultante de solicitud | I | `SolicitudPrograma` | `obraResultanteId` | Implementado | Relación `SolicitudObraResultante` |
| CUA (Clave Única de Acción) | I, IX, XIII, XVIII, XXIII | `Obra` | `cua` | Implementado | Identificador federal principal |
| Nombre de la acción | IX, XIII | `Obra` | `nombre` | Implementado | |
| Descripción / alcance | IX, XIII | `Obra` | `descripcion` | Implementado | |
| Localidad textual | IX, XIII | `Obra` | `localidad` | Implementado | Complementa `municipioId` |
| Organismo operador | IX, XIII, XVIII | `OrganismoOperador` | `nombre`, `siglas`, … | Implementado | FK `Obra.organismoOperadorId`; legacy `contratistaId` |
| Tipo de organismo | IX, XIII | `OrganismoOperador` | `tipoOrganismo` | Implementado | `OAPAS`, `SMAPAS`, `DGA_MUNICIPAL`, `ESTADO`, `COMUNIDAD` |
| RFC / director OO | IX, XIII | `OrganismoOperador` | `rfc`, `director`, `email`, `telefono` | Implementado | Seed usa tabla `Contratista` hasta migración |
| Inversión federal | IX, XIII, XXII | `Cofinanciamiento` | `fuente=federal`, `monto` | Implementado | Desglose; `Obra.montoAutorizado` = total referencia |
| Inversión estatal | IX, XIII, XXII | `Cofinanciamiento` | `fuente=estatal`, `monto` | Implementado | |
| Inversión municipal | IX, XIII | `Cofinanciamiento` | `fuente=municipal`, `monto` | Implementado | |
| Inversión organismo operador | IX, XIII | `Cofinanciamiento` | `fuente=organismo_operador`, `monto` | Implementado | |
| Otras fuentes | IX | `Cofinanciamiento` | `fuente=otro`, `monto` | Implementado | |
| % aportación por fuente | IX, XIII | `Cofinanciamiento` | `porcentaje` | Implementado | Calculable o capturado |
| Descripción de aportación | IX | `Cofinanciamiento` | `descripcion` | Implementado | |
| Población a incorporar | IX, XIII, XXIII | `Obra` | `pobIncorporar` | Implementado | |
| Población a mejorar | IX, XIII, XXIII | `Obra` | `pobMejorar` | Implementado | |
| Población beneficiada (total) | IX, XXIII | `Obra` | `poblacionBeneficiada` | Implementado | Agregado o suma de desgloses |
| Beneficiarias mujeres | IX, XIII, XXIII | `Obra` | `pobMujeres` | Implementado | |
| Beneficiarios pueblos indígenas | IX, XIII, XXIII | `Obra` | `pobIndigena` | Implementado | |
| Beneficiarios afromexicanos | IX, XIII, XXIII | `Obra` | `pobAfromexicano` | Implementado | |
| Cobertura AP antes / meta | IX, XIII | `Obra` | `coberturaApAntes`, `coberturaApMeta` | Implementado | Porcentaje |
| Cobertura TAR antes / meta | IX, XIII | `Obra` | `coberturaTarAntes`, `coberturaTarMeta` | Implementado | |
| Caudal (L/s) | IX, XIII | `Obra` | `caudalLps` | Implementado | |
| Oficio de validación técnica | I, IX | `Documento` | `categoria=programa`, `archivo` | Parcial | Falta subtipo `oficio_validacion` |
| Número de Anexo XII | XII | `AnexoEjecucion` | `numero` | Implementado | Único, ej. `001-DGO/2026` |
| Monto federal convenio XII | XII | `AnexoEjecucion` | `montoFederal` | Implementado | |
| Monto estatal convenio XII | XII | `AnexoEjecucion` | `montoEstatal` | Implementado | |
| Fecha de firma XII | XII | `AnexoEjecucion` | `fechaFirma` | Implementado | |
| Vigencia / fin de ejercicio | XII | `AnexoEjecucion` | `fechaVigenciaFin` | Implementado | Típicamente 31-dic |
| Estatus anexo XII | XII | `AnexoEjecucion` | `estatus` | Implementado | `borrador`, `vigente`, `modificado`, `cerrado` |
| Archivo PDF/DOCX anexo XII | XII | `AnexoEjecucion` | `archivoUrl` | Implementado | Almacenamiento Fase D |
| Anexo técnico (XIII) por OO | XIII | `AnexoTecnico` | `id` | Implementado | FK desde `Obra.anexoTecnicoId` |
| Organismo en anexo XIII | XIII | `AnexoTecnico` | `organismoOperadorId` | Implementado | |
| Ejercicio fiscal anexo XIII | XIII | `AnexoTecnico` | `ejercicioFiscal` | Implementado | |
| Tipo localidad anexo XIII | XIII | `AnexoTecnico` | `tipoLocalidad` | Implementado | |
| Estatus anexo XIII | XIII | `AnexoTecnico` | `estatus` | Implementado | |
| Folio ComprasMX | XVIII | `Obra` | `comprasMxFolio` | Implementado | |
| Número de contrato | XVIII | `Obra` | `numContrato` | Implementado | |
| Tipo de adjudicación | XVIII | `Obra` | `tipoAdjudicacion` | Implementado | `licitacion`, `invitacion`, `adjudicacion_directa` |
| Fecha de fallo | XVIII | `Obra` | `fechaFallo` | Implementado | |
| Trimestre de reporte | XVIII | `AvanceTrimestral` | `trimestre` | Implementado | 1–4 |
| Avance físico trimestre anterior | XVIII | `AvanceTrimestral` | `avanceFisicoAnterior` | Implementado | % |
| Avance físico del trimestre | XVIII | `AvanceTrimestral` | `avanceFisicoTrimestre` | Implementado | % |
| Avance físico acumulado | XVIII | `AvanceTrimestral` | `avanceFisicoAcumulado` | Implementado | % |
| Avance financiero trimestre anterior | XVIII | `AvanceTrimestral` | `avanceFinAnterior` | Implementado | MXN |
| Avance financiero del trimestre | XVIII | `AvanceTrimestral` | `avanceFinTrimestre` | Implementado | MXN |
| Avance financiero acumulado | XVIII | `AvanceTrimestral` | `avanceFinAcumulado` | Implementado | MXN |
| Fecha de entrega reporte | XVIII | `AvanceTrimestral` | `fechaEntrega` | Implementado | |
| Estatus validación avance | XVIII | `AvanceTrimestral` | `estatus` | Implementado | `EstatusAvance` enum |
| Observaciones trimestre | XVIII | `AvanceTrimestral` | `observaciones` | Implementado | |
| Avance mensual operativo | — | `AvanceMensual` | `reportado`, `programado` | Parcial | Complemento operativo, no sustituye XVIII |
| Estimaciones / pagos | — | `Estimacion` | `montoEstimado`, `estatus` | Parcial | Flujo de pago; distinto de avance financiero XVIII |
| ID SISBA | XXIII | `Obra` | `idSisba` | Implementado | Asignado al cierre de obra |
| Informe final (archivo) | XXIII | `Documento` | `categoria=cierre` | Parcial | Subtipo `informe_final` en Fase D |
| Transferencias recibidas en ejercicio | XXII | `CierreEjercicio` | `montoTransferido` | Implementado | |
| Reintegros en el ejercicio | XXII | `CierreEjercicio` | `montoReintegradoEj` | Implementado | |
| Monto modificado al 31-dic | XXII | `CierreEjercicio` | `montoModificado31dic` | Implementado | |
| Monto reportado informe final | XXII | `CierreEjercicio` | `montoInformeFinal` | Implementado | |
| Reintegro al 15-ene | XXII | `CierreEjercicio` | `montoReintegrado15ene` | Implementado | Plazo Art. 5 |
| Monto por reintegrar | XXII | `CierreEjercicio` | `montoPorReintegrar` | Implementado | |
| Tipo de apoyo en cierre | XXII | `CierreEjercicio` | `tipoApoyo` | Implementado | Por infraestructura / desinfección |
| Fecha de cierre | XXII | `CierreEjercicio` | `fechaCierre` | Implementado | |
| Estatus cierre | XXII | `CierreEjercicio` | `estatus` | Implementado | |
| Archivo anexo XXII | XXII | `CierreEjercicio` | `archivoUrl` | Implementado | |
| Relación cierre ↔ anexo XII | XXII | `CierreEjercicio` | `anexoEjecucionId` | Implementado | |
| Folio interno ARKON | — | `Obra` | `folio` | Implementado | Ej. `PROAGUA-2023-001`; distinto de CUA |
| Estatus de obra | — | `Obra` | `estatus` | Implementado | `EstatusObra` enum |
| Fechas de ejecución | IX, XVIII | `Obra` | `fechaInicio`, `fechaTerminoProgramada`, `fechaTerminoReal` | Implementado | |
| Monto contratado / ejercido | XVIII | `Obra` | `montoContratado`, `montoEjercido` | Implementado | Resumen; detalle en cofinanciamiento y avances |
| Supervisor de obra | — | `Obra` | `supervisor` | Implementado | |
| Contratista de obra (empresa) | — | `Obra` | `contratistaId` → `Contratista` | Parcial | Distinto de organismo operador ejecutor |

---

## Mapeo por anexo

### Anexo I — Solicitud de recursos

| Sección del formulario | Destino Prisma |
|------------------------|----------------|
| Datos de entidad y municipio | `SolicitudPrograma.entidadId`, `municipioId` |
| Programa, ejercicio, tipo de apoyo, componente | `SolicitudPrograma.programa`, `ejercicioFiscal`, `tipoApoyo`, `componente` |
| Monto solicitado | `SolicitudPrograma.montoSolicitado` |
| Acción de catálogo | `AccionPrograma` (referencia futura en solicitud) |
| Obra generada al aprobar | `SolicitudPrograma.obraResultanteId` → `Obra` |

### Anexo IX — Ficha técnica

| Sección del formulario | Destino Prisma |
|------------------------|----------------|
| Identificación (CUA, nombre, localidad) | `Obra` |
| Datos geográficos y marginación | `Municipio` + `Obra.tipoLocalidad` |
| Organismo operador | `OrganismoOperador` + `Obra.organismoOperadorId` |
| Inversiones por fuente | `Cofinanciamiento[]` |
| Beneficiarios y coberturas | Campos `pob*` y `cobertura*` en `Obra` |
| Componente / subcomponente / acción VII | `Obra.subcomponente`, `Obra.accionProgramaId` |

### Anexo XII — Anexo de ejecución

| Sección del formulario | Destino Prisma |
|------------------------|----------------|
| Encabezado (número, entidad, ejercicio) | `AnexoEjecucion` |
| Montos federal y estatal | `AnexoEjecucion.montoFederal`, `montoEstatal` |
| Firmas y fechas | `AnexoEjecucion.fechaFirma`, `fechaVigenciaFin` |

### Anexo XIII — Anexo técnico

| Sección del formulario | Destino Prisma |
|------------------------|----------------|
| Referencia al XII | `AnexoTecnico.anexoEjecucionId` |
| Organismo operador ejecutor | `AnexoTecnico.organismoOperadorId` |
| Listado de acciones (CUA) | `Obra.anexoTecnicoId` (una obra por fila) |
| Tipo de localidad del paquete | `AnexoTecnico.tipoLocalidad` |

### Anexo XVIII — Avances trimestrales

| Sección del formulario | Destino Prisma |
|------------------------|----------------|
| Una fila por obra × trimestre | `AvanceTrimestral` (unique `obraId` + `ejercicioFiscal` + `trimestre`) |
| Datos de contratación | `Obra.numContrato`, `comprasMxFolio`, `tipoAdjudicacion`, `fechaFallo` |
| Avances físico y financiero | Campos `avanceFisico*` y `avanceFin*` |

### Anexo XXII — Cierre de ejercicio

| Sección del formulario | Destino Prisma |
|------------------------|----------------|
| Por anexo XII y tipo de apoyo | `CierreEjercicio` (unique `anexoEjecucionId` + `tipoApoyo`) |
| Columnas de transferencia y reintegro | Campos `monto*` del modelo |

### Anexo XXIII — Informe final

| Sección del formulario | Destino Prisma |
|------------------------|----------------|
| CUA, ID SISBA, población final | `Obra.cua`, `idSisba`, `pob*` |
| Documento firmado | `Documento` (`categoria=cierre`) |
| Vinculación a cierre | `CierreEjercicio.montoInformeFinal` |

---

## Brechas conocidas (post Fase C)

1. **Importación Excel** de anexos: exportación primero (Fase D), importación en hito D8 — ver [alcance-fase-c.md](./alcance-fase-c.md).
2. **`Contratista` vs `OrganismoOperador`:** el seed demo aún usa `contratistas.json`; migración de datos y UI pendiente.
3. **`tipoObra` genérico:** alinear enum con componentes PROAGUA (`agua_potable`, `drenaje_saneamiento`, etc.).
4. **Desinfección:** campos y anexos II/V/VI/XIV/XIX/XX no mapeados en v1.
5. **PASH / SIPOT:** sin integración financiera federal en v1.

---

## Referencias

- Esquema: `apps/api/prisma/schema.prisma`
- Seed demo: `apps/api/prisma/seed-data/conagua/`
- Índice normativo: [README.md](./README.md)
