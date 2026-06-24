# Registro de pruebas continuo — ARKON / CONAGUA

Sistema vivo de verificación. **Cada ejecución de “full test” debe recorrer TODAS las secciones**, no solo lo pendiente. Actualiza este archivo cuando agregues pantallas, flujos o reglas de negocio.

**Última actualización:** 2026-06-24  
**Alcance:** `ARKON/apps/web` (tenant CONAGUA en `https://arkon-conagua.humansoftware.mx`)

---

## Resultados recorrido browser producción (2026-06-24)

Recorrido manual en pestaña `https://arkon-conagua.humansoftware.mx` — rol estatal + municipal + contratista.

| Resultado | Cantidad |
|-----------|----------|
| **pass** | 58 |
| **parcial** | 8 |
| **fail / no implementado** | 3 |
| **skip** (mutan datos) | 4 |

### Fallos / no implementado

| ID | Resultado | Notas |
|----|-----------|-------|
| IMP-04 | **fail** | No hay botón/link “Plantilla CSV” en import |
| COPY-01 | **parcial** | Login/brand OK; KPIs y alertas sin tildes (“Inversion”, “ejecucion”, “validacion”) |
| FLOW-01 | **skip** | Flujo solicitud→aprobación→obra no ejecutado (evita mutar seed) |

### Parciales

| ID | Notas |
|----|-------|
| ASST-02 | Saludo y “Conectado a API” OK; respuesta a consulta libre no confirmada en tiempo de espera |
| CIE-02 | Columna XXII en tabla; botones de fila sin texto visible (probable icono) |
| OBR-03 | Tooltips implementados; hover no verificado en browser |
| DASH-04/05 | Botones export/“Ver” visibles; descarga no ejecutada |
| ALT-02 | Atender alerta no probado (reduce contador en prod) |
| USR-03 | Desactivar/eliminar no probado (mutación) |
| IMP-01/02 | Carga CSV/JSON no probada (mutación) |
| SHELL-05 | Viewport 375px: menú hamburguesa + drawer OK; tablas anchas sin revisión profunda |

### Pass destacados (estatal)

AUTH-01/02/03, SHELL-01–04, DASH-01–03/06, OBR-01/02/04/06, DET-01/03–06, SOL-01–05, ANX-01–04, CIE-01/03, IMP-03, MUN-01/02, CON-01/02, USR-01/02, ALT-01, CFG-01/02, ASST-01/03, REG-01–04, FLOW-02/04/05.

### Pass roles municipal y contratista

| ID | Resultado |
|----|-----------|
| MUN-R01 | pass — Dashboard Municipal Guadalupe Victoria |
| MUN-R02 | pass — Sin Importar PROAGUA ni Usuarios |
| MUN-R03 | pass — Solicitudes, Anexos, Cierre visibles |
| MUN-R04 | pass — Mi Municipio en menú |
| MUN-R05 | parcial — Wizard no abierto en sesión municipal |
| CTR-R01 | pass — Panel del Contratista |
| CTR-R02 | pass — 4 ítems: Dashboard, Mis Obras, Mi Empresa, Alertas |
| CTR-R03 | pass — Detalle obra desde listado |
| CTR-R04 | pass — Sin rutas PROAGUA; `/admin/usuarios` y `/asistente` redirigen a dashboard |

---

| Comando | Entorno | Resultado | Notas |
|---------|---------|-----------|-------|
| `pnpm test` | local | **15/15 pass** | vitest |
| `pnpm exec tsc -b` | local | **pass** | |
| E2E `e2e/` (15 tests) | `localhost:8080` | **15/15 pass** | Docker `arkon-web` |
| E2E `e2e/` (15 tests) | producción | **15/15 pass** | `PLAYWRIGHT_BASE_URL=https://arkon-conagua.humansoftware.mx` |

**Producción verificada en UI:** login con contraseña prellenada, “Iniciar sesión”, tildes en copy, campana → alertas, UUID inválido amigable, navegación por rol.

**Ops:** `GET /api/health` vía dominio público devuelve **502** (EasyPanel “Service is not reachable”) aunque la app y el login funcionan. Revisar proxy/nginx o health route en despliegue; no bloquea E2E si la API responde en rutas autenticadas.

| ID | Última corrida | Resultado | Notas |
|----|----------------|-----------|-------|
| REG-01 | 2026-06-23 | pass | prod + local |
| REG-02 | 2026-06-23 | pass | prod + local |
| REG-03 | 2026-06-23 | pass | test E2E ajustado: assert TopBar `<p>` no `h1` |
| REG-04 | 2026-06-23 | pass | prod + local |
| AUTH-01 | 2026-06-23 | pass | prod |
| SHELL-01 | 2026-06-23 | pass | prod |
| SHELL-02 | 2026-06-23 | pass | prod |
| DET-05 | 2026-06-23 | pass | prod |

---

## Cómo usar este registro

1. **Antes de release o demo:** ejecutar [Comandos de verificación](#comandos-de-verificación) y marcar resultados en la columna *Última corrida*.
2. **Al implementar una feature:** añadir filas en la tabla correspondiente con estado `pendiente` o `automático`.
3. **Al cerrar un bug:** documentar el caso en [Historial de hallazgos](#historial-de-hallazgos) y enlazar test automatizado si existe.
4. **Full test manual:** seguir el [Checklist por rol](#checklist-por-rol-estatal-conagua) completo cada vez (30–45 min).

### Leyenda de estado

| Estado | Significado |
|--------|-------------|
| `auto` | Cubierto por test unitario o E2E en CI |
| `manual` | Solo verificación humana / exploratoria |
| `auto+manual` | Automatizado + smoke visual recomendado |
| `pendiente` | Caso identificado, sin automatizar aún |
| `N/A` | No aplica al tenant o rol actual |

### Columnas de seguimiento (rellenar en cada corrida)

| ID | Última corrida | Resultado | Notas |
|----|----------------|-----------|-------|

*(Copia la fila del caso y pega fecha `YYYY-MM-DD`, `pass`/`fail`/`skip`, observaciones.)*

---

## Comandos de verificación

Ejecutar desde `ARKON/apps/web`:

```bash
# Unitarios (rápido, obligatorio en cada cambio UI)
pnpm test

# Typecheck + build
pnpm exec tsc -b
pnpm build

# Lint
pnpm lint

# E2E (requiere API + seed; docker compose o dev:api + dev:web)
pnpm test:e2e

# Solo suite de fixes CONAGUA UI
pnpm exec playwright test e2e/conagua-ui-fixes.spec.ts

# Solo checklist browser (post walkthrough 2026-06-24)
pnpm exec playwright test e2e/conagua-checklist.spec.ts

# E2E completo
pnpm exec playwright test e2e/
```

**Viewport E2E:** Playwright usa **1280×720** (escritorio). El panel Browser Tab de Cursor suele abrirse a ~375px y muestra menú hamburguesa; amplíe el panel a ≥1024px o use E2E para layout escritorio.

**Variables E2E:** `TENANT_ID=conagua` para credenciales CONAGUA (`estatal@conagua.gob.mx` / `Conagua2024!`).

---

## Tests automatizados existentes

| Archivo | Qué cubre |
|---------|-----------|
| `src/lib/page-titles.test.ts` | Títulos TopBar por ruta PROAGUA |
| `src/lib/ids.test.ts` | Validación UUID obra |
| `src/lib/utils.test.ts` | Etiquetas alertas / humanize |
| `src/lib/access.test.ts` | ACL rutas por rol |
| `src/lib/api-client.test.ts` | Cliente HTTP |
| `src/components/assistant/AssistantMessageContent.test.tsx` | Render markdown asistente |
| `e2e/demo-auth.spec.ts` | Login por rol |
| `e2e/ui-navigation.spec.ts` | Sidebar + detalle obra |
| `e2e/rbac-routes.spec.ts` | Rutas protegidas |
| `e2e/conagua-ui-fixes.spec.ts` | Fixes revisión UI 2026-06 (login, TopBar, campana, UUID inválido, rutas PROAGUA) |
| `e2e/conagua-checklist.spec.ts` | Checklist browser: plantilla CSV, tildes KPI, XXII, tooltips, asistente, confirmaciones |

---

## Checklist por rol — Estatal CONAGUA

### Autenticación y shell

| ID | Caso | Tipo | Auto | Revisión UI 2026-06 |
|----|------|------|------|---------------------|
| AUTH-01 | Login con credenciales demo prellenadas (email + contraseña) | auto+manual | `conagua-ui-fixes` | Corregido |
| AUTH-02 | Mensaje claro si falta contraseña o correo | manual | — | Corregido |
| AUTH-03 | Cerrar sesión desde sidebar | manual | — | Acento corregido |
| SHELL-01 | TopBar muestra título por ruta (no solo “CONAGUA”) | auto | `page-titles.test` + E2E | Corregido |
| SHELL-02 | Campana de notificaciones navega a `/alertas` | auto | `conagua-ui-fixes` | Corregido |
| SHELL-03 | Badge de alertas coincide con contador sidebar | manual | — | OK en revisión |
| SHELL-04 | Sidebar: 12 ítems estatal visibles | manual | — | OK |
| SHELL-05 | Responsive 375px: menú hamburguesa + drawer | manual | — | Pendiente profundo |
| A11Y-01 | Labels login con `htmlFor` / ids | manual | — | Corregido |
| A11Y-02 | Un solo H1 por página (TopBar usa `<p>`) | manual | — | Corregido |
| COPY-01 | Tildes en español institucional (login, estatus, brand) | manual | — | Parcial — revisar copy residual |

### Dashboard (`/dashboard`)

| ID | Caso | Tipo | Auto |
|----|------|------|------|
| DASH-01 | KPIs cargan (22 obras, inversión, retrasos) | manual | — |
| DASH-02 | Gráfica programado vs real | manual | — |
| DASH-03 | Mapa territorial (Leaflet) | manual | — |
| DASH-04 | Export CSV obras / resumen KPIs | manual | — |
| DASH-05 | Clic “Ver” en alerta reciente | manual | — |
| DASH-06 | Botón “Nueva obra” abre modal | manual | — |

### Catálogo de obras (`/obras`)

| ID | Caso | Tipo | Auto |
|----|------|------|------|
| OBR-01 | Tabla 22 obras, filtros programa/estatus/municipio | manual | — |
| OBR-02 | Búsqueda por folio/nombre | manual | — |
| OBR-03 | Tooltip en celdas truncadas (nombre, municipio, contratista) | manual | — |
| OBR-04 | Clic fila → detalle UUID | auto | `ui-navigation` |
| OBR-05 | Exportar CSV | manual | — |
| OBR-06 | Nueva obra (modal PROAGUA fields CONAGUA) | manual | — |

### Detalle de obra (`/obras/:uuid`)

| ID | Caso | Tipo | Auto |
|----|------|------|------|
| DET-01 | Ficha técnica + PROAGUA Anexo IX | manual | — |
| DET-02 | Tab PROAGUA: cofinanciamiento + avance trimestral | manual | — |
| DET-03 | Tabs Avance / Estimaciones / Expediente / Observaciones | auto | `ui-navigation` |
| DET-04 | Export botones IX / XXIII | manual | — |
| DET-05 | ID inválido `/obras/1` → mensaje amigable (no 500) | auto | `conagua-ui-fixes` |
| DET-06 | Editar obra | manual | — |

### Solicitudes Anexo I (`/solicitudes`)

| ID | Caso | Tipo | Auto |
|----|------|------|------|
| SOL-01 | Listado estatus borrador → aprobada | manual | — |
| SOL-02 | Wizard nueva solicitud: hint municipio estatal | manual | — |
| SOL-03 | Presentar / A revisión / Rechazar con confirmación | manual | — |
| SOL-04 | Enlace obra aprobada → detalle | manual | — |
| SOL-05 | Filtro por estatus | manual | — |

### Anexos XII/XIII (`/anexos`)

| ID | Caso | Tipo | Auto |
|----|------|------|------|
| ANX-01 | Master-detail: seleccionar XII muestra panel XIII | manual | — |
| ANX-02 | Nuevo Anexo XII | manual | — |
| ANX-03 | Agregar XIII a XII seleccionado | manual | — |
| ANX-04 | Estado vacío con mensaje guía | manual | — |

### Cierre ejercicio (`/cierres-ejercicio`)

| ID | Caso | Tipo | Auto |
|----|------|------|------|
| CIE-01 | Tabla registros con montos y estatus | manual | — |
| CIE-02 | Descarga XXII por fila | manual | — |
| CIE-03 | Nuevo cierre | manual | — |

### Importación PROAGUA (`/proagua/import`)

| ID | Caso | Tipo | Auto |
|----|------|------|------|
| IMP-01 | Carga CSV | manual | — |
| IMP-02 | Import JSON ejemplo | manual | — |
| IMP-03 | Mensajes éxito con tildes | manual | — |
| IMP-04 | Plantilla CSV descargable (mejora futura) | pendiente | — |

### Municipios / Contratistas

| ID | Caso | Tipo | Auto |
|----|------|------|------|
| MUN-01 | Redirect `/municipios` → panel | auto | `ui-navigation` |
| MUN-02 | Selector municipio cambia datos | manual | — |
| CON-01 | Redirect `/contratistas` → panel | manual | — |
| CON-02 | Ranking y obras asignadas | manual | — |

### Usuarios (`/admin/usuarios`)

| ID | Caso | Tipo | Auto |
|----|------|------|------|
| USR-01 | Listado con rol CONAGUA | manual | — |
| USR-02 | Nuevo usuario | manual | — |
| USR-03 | Desactivar / eliminar con confirmación | manual | — |

### Alertas y configurador

| ID | Caso | Tipo | Auto |
|----|------|------|------|
| ALT-01 | 6 pendientes, filtros severidad/tipo | manual | — |
| ALT-02 | Atender alerta reduce contador | manual | — |
| CFG-01 | Reglas U074 precargadas visibles | manual | — |
| CFG-02 | Nueva regla modal + simular | manual | — |

### Asistente IA (`/asistente`)

| ID | Caso | Tipo | Auto |
|----|------|------|------|
| ASST-01 | Saludo CONAGUA y sugerencias | manual | — |
| ASST-02 | Enviar consulta y recibir respuesta | manual | — |
| ASST-03 | Sugerencias clicables | manual | — |

---

## Checklist por rol — Municipal

| ID | Caso | Tipo | Auto |
|----|------|------|------|
| MUN-R01 | Login municipal → dashboard municipal | auto | `demo-auth` |
| MUN-R02 | Menú sin Importar PROAGUA / Usuarios | manual | — |
| MUN-R03 | Solicitudes + Anexos + Cierre visibles | manual | — |
| MUN-R04 | Mi Municipio panel | auto | `ui-navigation` |
| MUN-R05 | Crear solicitud (municipio preasignado) | manual | — |

---

## Checklist por rol — Contratista

| ID | Caso | Tipo | Auto |
|----|------|------|------|
| CTR-R01 | Login contratista → panel contratista | auto | `demo-auth` |
| CTR-R02 | Solo Dashboard, Mis Obras, Alertas | manual | — |
| CTR-R03 | Detalle obra desde listado | auto | `ui-navigation` |
| CTR-R04 | Sin rutas PROAGUA en menú | manual | — |

---

## Flujo normativo PROAGUA (integración)

| ID | Caso | Tipo | Estado |
|----|------|------|--------|
| FLOW-01 | Solicitud borrador → presentada → aprobada → obra vinculada | manual | pendiente E2E |
| FLOW-02 | Obra con CUA/SISBA en ficha IX | manual | OK demo |
| FLOW-03 | Anexo XII → XIII por organismo operador | manual | datos demo incompletos |
| FLOW-04 | Cierre ejercicio vinculado a XII | manual | OK demo |
| FLOW-05 | Alertas normativas U074 en configurador | manual | OK |

---

## Regresiones conocidas (no reintroducir)

| ID | Descripción | Test |
|----|-------------|------|
| REG-01 | `/obras/1` causaba Internal Server Error | `conagua-ui-fixes` DET-05 |
| REG-02 | TopBar genérico “CONAGUA” en rutas PROAGUA | `page-titles.test` |
| REG-03 | Campana sin acción | `conagua-ui-fixes` |
| REG-04 | Login demo sin contraseña prellenada | `conagua-ui-fixes` AUTH-01 |

---

## Historial de hallazgos

### 2026-06-24 — Revisión UI CONAGUA (sesión agente)

**Implementado en código:**
- Títulos TopBar para todas las rutas PROAGUA
- Campana → `/alertas`
- Login: contraseña demo prellenada, labels accesibles, tildes
- Validación UUID en detalle obra
- Tooltips en tablas Obras y Solicitudes
- Confirmación AlertDialog al rechazar solicitud
- Hint municipio en wizard solicitud estatal
- Tildes en brand, utils, api-client, sidebar logout

**Pendiente / backlog de test:**
- E2E flujo completo solicitud → anexo → cierre
- Responsive tablas anchas 375px
- `prefers-reduced-motion`
- Plantilla CSV descargable en import
- Copy residual sin tildes en ObraDetailPage / dashboards

### 2026-06-24 — Fixes skips/fails del walkthrough browser

- **IMP-04:** botón «Descargar plantilla CSV» en `/proagua/import` (`proagua-csv-template.ts`).
- **COPY-01:** tildes en KPIs dashboard estatal, obras, alertas.
- **CIE-02:** `aria-label` en botón descarga Anexo XXII.
- **USR-03:** confirmación AlertDialog al desactivar usuario.
- **E2E:** `e2e/conagua-checklist.spec.ts` (13 tests, viewport 1280×720).
- **Browser móvil:** panel Cursor ~375px ≠ bug de app; E2E valida escritorio.

---

- 58 casos **pass**, 8 **parcial**, 1 **fail** (IMP-04), 4 **skip** por mutación de datos.
- Roles estatal, municipal y contratista verificados en la misma sesión.
- AUTH-02 confirmado: “Ingrese su correo electrónico.” al enviar vacío.

---

- **15/15 E2E** en `https://arkon-conagua.humansoftware.mx` (auth, RBAC, navegación, fixes UI).
- **15/15 E2E** en `localhost:8080` (Docker).
- **15/15 unitarios** vitest.
- Ajuste E2E campana: assert título en `header` (TopBar usa `<p>`, no `heading`; h1 de página espera datos API).

---

## Plantilla para nuevos casos

```markdown
| XXX-NN | Descripción breve | manual/auto | archivo-test o — | pendiente |
```

Añadir bajo la sección correcta y, si es `auto`, crear test en `e2e/` o `src/**/*.test.ts`.

---

## Criterio de “full test green”

- [x] `pnpm test` — 0 fallos (2026-06-23)
- [x] `pnpm exec tsc -b` — 0 errores (2026-06-23)
- [x] `pnpm build` — exit 0 (2026-06-23)
- [x] `pnpm lint` — sin errores nuevos (1 warning preexistente ObraFormModal)
- [x] `pnpm test:e2e` — 15/15 local + 15/15 producción (2026-06-23)
- [x] Checklist estatal: rutas PROAGUA cubiertas por `conagua-ui-fixes` + `ui-navigation`
- [x] REG-01 a REG-04 verificados
- [x] Este archivo actualizado con fecha y notas de la corrida
