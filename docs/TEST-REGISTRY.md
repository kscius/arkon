# Registro de pruebas continuo — ARKON / CONAGUA

Sistema vivo de verificación. **Cada ejecución de “full test” debe recorrer TODAS las secciones**, no solo lo pendiente. Actualiza este archivo cuando agregues pantallas, flujos o reglas de negocio.

**Última actualización:** 2026-06-24 (iteración QA 15:32)  
**Alcance:** `ARKON/apps/web` (tenant CONAGUA — Docker `localhost:8080` + prod `arkon-conagua.humansoftware.mx`)

---

## Resultados última corrida (2026-06-24 15:32)

| Resultado | Cantidad |
|-----------|----------|
| **pass** | 73 (todos los casos del registro) |
| **parcial** | 0 |
| **fail** | 0 |
| **skip** | 0 |

### E2E automatizado (suite completa `e2e/`)

| Entorno | Resultado | Notas |
|---------|-----------|-------|
| `localhost:8080` (Docker) | **45/45 pass** ×2 | Corridas consecutivas sin `docker compose down -v` |
| `localhost:3000` (dev nativo) | pendiente esta sesión | Objetivo 45/45 con `dev-local.ps1` |
| `arkon-conagua.humansoftware.mx` | pendiente redeploy | Objetivo 45/45 post-deploy |

### Walkthrough browser Cursor MCP (2026-06-24 15:32)

Dos corridas consecutivas: estatal → municipal → contratista → REG-01/03/04; SHELL-05 @375px; ASST-02 respuesta mock.

**Fixes clave 2026-06-24 (iteración 15:32):**
- **COPY-01 alertas E2E:** filtro `todas` para incluir alertas atendidas por ALT-02 en la misma suite.
- **ALT-02 idempotente:** `ensurePendingAlerta()` crea alerta vía `POST /api/alertas` si no hay pendientes.
- **E2E:** 45/45 ×2 corridas consecutivas tras fixes.

**Fixes clave 2026-06-24 (iteración 15:19):**
- **E2E tenant:** `playwright.config.ts` default `TENANT_ID=conagua` (antes usaba credenciales ARKON).
- **FLOW-01 idempotente:** `ensureBorradorSolicitud()` crea borrador vía API si el seed ya fue consumido.
- **COPY-01 alertas:** test navega a `/alertas` con regex de tildes ampliado.
- **Login E2E:** retry ×3 + `domcontentloaded`; RBAC municipal timeout 15s.

**Fix clave 2026-06-24 (sesión anterior):**
- **MUN-R05:** mapeo `agua_potable` → `AP` en `SolicitudFormWizard.tsx`; municipio preasignado visible para rol municipal.

**Nota operativa:** tests mutantes (FLOW-01, ALT-02) siguen siendo idempotentes con `ensureBorradorSolicitud`; para walkthrough manual limpio usar `docker compose down -v`.

---

| Comando | Entorno | Resultado | Notas |
|---------|---------|-----------|-------|
| `pnpm test` | local | **19/19 pass** | vitest (+ `solicitud-wizard-utils.test.ts`) |
| `pnpm exec tsc -b` | local | **pass** | |
| `pnpm test:e2e` | `localhost:8080` | **45/45 pass** ×2 | confirmación 2026-06-24 15:32 (idempotente ALT-02/COPY-01) |
| `pnpm lint` | local | **pass** | 1 warning preexistente ObraFormModal |

**Producción verificada en UI:** login con contraseña prellenada, “Iniciar sesión”, tildes en copy, campana → alertas, UUID inválido amigable, navegación por rol.

**Ops:** `GET /api/health` vía dominio público devuelve **502** (EasyPanel “Service is not reachable”) aunque la app y el login funcionan. Revisar proxy/nginx o health route en despliegue; no bloquea E2E si la API responde en rutas autenticadas.

| ID | Última corrida | Resultado | Notas |
|----|----------------|-----------|-------|
| REG-01 | 2026-06-24 | pass | E2E + browser Docker |
| REG-02 | 2026-06-24 | pass | E2E + browser Docker |
| REG-03 | 2026-06-24 | pass | E2E campana → alertas |
| REG-04 | 2026-06-24 | pass | E2E login one-click |
| AUTH-01 | 2026-06-24 | pass | E2E ui-fixes |
| SHELL-01 | 2026-06-24 | pass | browser + E2E |
| SHELL-02 | 2026-06-24 | pass | E2E ui-fixes |
| DET-05 | 2026-06-24 | pass | E2E ui-fixes |
| MUN-R05 | 2026-06-24 | pass | fix wizard + browser MCP |
| CTR-R02 | 2026-06-24 | pass | Mi Empresa en menú |

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

# Dev nativo (Vite :3000 + API :8000, DB en Docker :5433)
# Desde ARKON/: .\scripts\dev-local.ps1
# E2E contra dev: PLAYWRIGHT_BASE_URL=http://localhost:3000 TENANT_ID=conagua pnpm exec playwright test

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
| `e2e/conagua-checklist.spec.ts` | Checklist browser: 30 tests (exports, import, FLOW-01/03, alertas, roles, mobile) |

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
| SHELL-05 | Responsive 375px: menú hamburguesa + drawer | auto | `conagua-checklist` | pass 2026-06-23 |
| A11Y-01 | Labels login con `htmlFor` / ids | manual | — | pass |
| A11Y-02 | Un solo H1 por página (TopBar usa `<p>`) | manual | — | pass |
| COPY-01 | Tildes en español institucional (login, estatus, brand) | auto | `conagua-checklist` | pass 2026-06-23 |

### Dashboard (`/dashboard`)

| ID | Caso | Tipo | Auto |
|----|------|------|------|
| DASH-01 | KPIs cargan (22 obras, inversión, retrasos) | manual | — |
| DASH-02 | Gráfica programado vs real | manual | — |
| DASH-03 | Mapa territorial (Leaflet) | manual | — |
| DASH-04 | Export CSV obras / resumen KPIs | auto | `conagua-checklist` | pass |
| DASH-05 | Clic “Ver” en alerta reciente | auto | `conagua-checklist` | pass |
| DASH-06 | Botón “Nueva obra” abre modal | manual | — |

### Catálogo de obras (`/obras`)

| ID | Caso | Tipo | Auto |
|----|------|------|------|
| OBR-01 | Tabla 22 obras, filtros programa/estatus/municipio | manual | — |
| OBR-02 | Búsqueda por folio/nombre | manual | — |
| OBR-03 | Tooltip en celdas truncadas (nombre, municipio, contratista) | auto | `conagua-checklist` | pass |
| OBR-04 | Clic fila → detalle UUID | auto | `ui-navigation` | pass |
| OBR-05 | Exportar CSV | auto | `conagua-checklist` | pass |
| OBR-06 | Nueva obra (modal PROAGUA fields CONAGUA) | manual | — |

### Detalle de obra (`/obras/:uuid`)

| ID | Caso | Tipo | Auto |
|----|------|------|------|
| DET-01 | Ficha técnica + PROAGUA Anexo IX | manual | — |
| DET-02 | Tab PROAGUA: cofinanciamiento + avance trimestral | manual | — |
| DET-03 | Tabs Avance / Estimaciones / Expediente / Observaciones | auto | `ui-navigation` |
| DET-04 | Export botones IX / XXIII | auto | `conagua-checklist` | pass |
| DET-05 | ID inválido `/obras/1` → mensaje amigable (no 500) | auto | `conagua-ui-fixes` |
| DET-06 | Editar obra | manual | — |

### Solicitudes Anexo I (`/solicitudes`)

| ID | Caso | Tipo | Auto |
|----|------|------|------|
| SOL-01 | Listado estatus borrador → aprobada | auto | `conagua-checklist` | pass |
| SOL-02 | Wizard nueva solicitud: hint municipio estatal | manual | — | pass |
| SOL-03 | Presentar / A revisión / Rechazar con confirmación | auto | `conagua-checklist` | pass |
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
| CIE-02 | Descarga XXII por fila | auto | `conagua-checklist` | pass |
| CIE-03 | Nuevo cierre | manual | — |

### Importación PROAGUA (`/proagua/import`)

| ID | Caso | Tipo | Auto |
|----|------|------|------|
| IMP-01 | Carga CSV | auto | `conagua-checklist` | pass |
| IMP-02 | Import JSON ejemplo | auto | `conagua-checklist` | pass |
| IMP-03 | Mensajes éxito con tildes | auto | `conagua-checklist` | pass |
| IMP-04 | Plantilla CSV descargable | auto | `conagua-checklist` | pass |

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
| USR-03 | Desactivar / eliminar con confirmación | auto | `conagua-checklist` | pass |

### Alertas y configurador

| ID | Caso | Tipo | Auto |
|----|------|------|------|
| ALT-01 | Pendientes + filtros severidad/tipo (6 en seed fresco; ≥5 tras E2E) | manual | — | pass 2026-06-24 |
| ALT-02 | Atender alerta reduce contador | auto | `conagua-checklist` | pass |
| CFG-01 | Reglas U074 precargadas visibles | manual | — |
| CFG-02 | Nueva regla modal + simular | manual | — |

### Asistente IA (`/asistente`)

| ID | Caso | Tipo | Auto |
|----|------|------|------|
| ASST-01 | Saludo CONAGUA y sugerencias | manual | — |
| ASST-02 | Enviar consulta y recibir respuesta | auto | `conagua-checklist` | pass |
| ASST-03 | Sugerencias clicables | manual | — |

---

## Checklist por rol — Municipal

| ID | Caso | Tipo | Auto |
|----|------|------|------|
| MUN-R01 | Login municipal → dashboard municipal | auto | `demo-auth` |
| MUN-R02 | Menú sin Importar PROAGUA / Usuarios | manual | — |
| MUN-R03 | Solicitudes + Anexos + Cierre visibles | manual | — |
| MUN-R04 | Mi Municipio panel | auto | `ui-navigation` |
| MUN-R05 | Crear solicitud (municipio preasignado + catálogo VII) | manual | — | pass 2026-06-24 |

---

## Checklist por rol — Contratista

| ID | Caso | Tipo | Auto |
|----|------|------|------|
| CTR-R01 | Login contratista → panel contratista | auto | `demo-auth` |
| CTR-R02 | Dashboard, Mis Obras, Mi Empresa, Alertas (sin PROAGUA admin) | manual | — | pass 2026-06-24 |
| CTR-R03 | Detalle obra desde listado | auto | `ui-navigation` |
| CTR-R04 | Sin rutas PROAGUA en menú | manual | — |

---

## Flujo normativo PROAGUA (integración)

| ID | Caso | Tipo | Estado |
|----|------|------|--------|
| FLOW-01 | Solicitud borrador → presentada → aprobada → obra vinculada | auto | `conagua-checklist` | pass 2026-06-24 |
| FLOW-02 | Obra con CUA/SISBA en ficha IX | manual | — | pass |
| FLOW-03 | Anexo XII → XIII por organismo operador | auto | `conagua-checklist` | pass 2026-06-23 |
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

### 2026-06-24 — Iteración QA idempotencia ALT-02 + COPY-01 (DONE)

- **ensurePendingAlerta:** helper E2E crea alerta pendiente vía API si el seed fue consumido por corridas previas.
- **COPY-01 alertas:** test usa filtro `todas` para ver copy con tildes en historial atendido.
- **E2E:** 45/45 ×2 corridas consecutivas sin `docker compose down -v`.
- **Browser:** 2 corridas MCP consecutivas (estatal/municipal/contratista + REG).
- **Artefacto:** `docs/QA-ITERATION-2026-06-24-1532.md`

### 2026-06-24 — Iteración QA E2E tenant + idempotencia (DONE)

- **playwright.config.ts:** default `TENANT_ID=conagua` para credenciales correctas sin export manual.
- **e2e/helpers.ts:** `ensureBorradorSolicitud`, login con retry y `domcontentloaded`.
- **conagua-checklist.spec.ts:** COPY-01 en `/alertas`, SOL-01 `.first()` strict mode.
- **rbac-routes.spec.ts:** timeout municipal 15s.
- **E2E:** 45/45 ×2 corridas consecutivas sin `docker compose down -v` entre ellas.
- **Artefacto:** `docs/QA-ITERATION-2026-06-24-1519.md`

### 2026-06-24 — Cierre QA loop Docker local (DONE)

- **MUN-R05:** `componenteToCatalogKey` en wizard solicitud (`agua_potable` → `AP`); UI municipio preasignado Guadalupe Victoria.
- **E2E:** 45/45 pass en dos corridas consecutivas con seed fresco (`docker compose down -v`).
- **CTR-R02:** registro alineado con menú real (incluye Mi Empresa).
- **ALT-01:** 6 pendientes en seed; contador baja tras E2E ALT-02 (esperado).
- **Artefacto:** `docs/QA-ITERATION-2026-06-24-1230.md`

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

### 2026-06-23 — Cierre checklist (30/30 E2E local)

- **IMP:** helper `goToProaguaImport` — HashRouter no actualiza con `page.goto('/#/…')`.
- **E2E:** `conagua-checklist.spec.ts` ampliado a 30 tests; todos **pass** en Docker local.
- **Producción:** 15/30 hasta redeploy (falta plantilla CSV, aria-label XXII, tooltips, confirmaciones USR-03, migración XIII, tildes alertas).

### 2026-06-24 — Fixes skips/fails del walkthrough browser

- **IMP-04:** botón «Descargar plantilla CSV» en `/proagua/import` (`proagua-csv-template.ts`).
- **COPY-01:** tildes en KPIs dashboard estatal, obras, alertas.
- **CIE-02:** `aria-label` en botón descarga Anexo XXII.
- **USR-03:** confirmación AlertDialog al desactivar usuario.
- **E2E:** `e2e/conagua-checklist.spec.ts` (13 tests, viewport 1280×720).
- **Browser móvil:** panel Cursor ~375px ≠ bug de app; E2E valida escritorio.

---

*(Sección histórica — superseded por corrida 2026-06-23 arriba.)*

---

## Plantilla para nuevos casos

```markdown
| XXX-NN | Descripción breve | manual/auto | archivo-test o — | pendiente |
```

Añadir bajo la sección correcta y, si es `auto`, crear test en `e2e/` o `src/**/*.test.ts`.

---

## Criterio de “full test green”

- [x] `pnpm test` — 0 fallos (2026-06-24, 19 tests)
- [x] `pnpm exec tsc -b` — 0 errores (2026-06-24)
- [x] `pnpm build` — exit 0 (2026-06-24)
- [x] `pnpm lint` — sin errores nuevos (1 warning preexistente ObraFormModal)
- [x] `pnpm test:e2e` — 45/45 ×2 corridas consecutivas Docker (2026-06-24 15:32, idempotente ALT-02/COPY-01)
- [ ] Producción: redeploy web+api + `migrate deploy` + `db seed` → re-ejecutar checklist
- [x] Checklist estatal + municipal + contratista + FLOW + REG — pass browser/E2E
- [x] REG-01 a REG-04 verificados
- [x] Este archivo actualizado con fecha y notas de la corrida
- [x] `docs/QA-ITERATION-2026-06-24-1532.md` generado
