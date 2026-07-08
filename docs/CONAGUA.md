# Version CONAGUA — Comision Nacional del Agua

Rama **`conagua`**: producto **independiente** derivado de ARKON para la [Comision Nacional del Agua](https://www.gob.mx/conagua). Esta rama divergio por completo: la entidad central es **Accion** / **Acciones** en datos, API, web y textos visibles del portal (**Seguimiento de Acciones**), el tenant `arkon` fue eliminado del codigo y la rama **no se vuelve a mergear desde `main`**.

## Identidad visual

- Logo: `apps/web/public/brands/conagua/logo.jpg` (fuente: material institucional CONAGUA)
- Paleta principal: azul marino `#1B3664`, azul medio `#3B83BD`, acento dorado `#C5A059`
- Titulo y asistente: **CONAGUA** / **Asistente CONAGUA**
- Tagline del producto: **Seguimiento de acciones de los programas del sector hídrico**

## Jerarquía Programa → Acción → Obra (2026)

A partir de la migración `20260703120000_split_obra_from_accion`, el dominio se organiza así:

| Entidad | Tabla / API | Rol |
|---------|-------------|-----|
| **Programa** | catálogo `programas`; API `GET /programas`, `GET /programas/:id/acciones` | PROAGUA, PEAS, PRODDER — agrupación y roll-up |
| **Acción** | tabla `acciones`; API `/acciones` | Intervención de programa (CUA, montos, avances, documentos) |
| **Obra** | tabla `obras`; API `/obras` | Trabajo físico/territorial (1 obra → N acciones) |

- **FK:** `acciones.obra_fisica_id` → `obras.id` (opcional; acciones de estudio pueden no tener obra).
- **Columnas físicas legadas** en `acciones` se conservan durante la transición; los lectores nuevos prefieren `obra_fisica` (chat, métricas de geo, mapa territorial).
- **Web:** rutas `/#/programas`, `/#/obras` (físico), `/#/acciones` (intervenciones). Menú **Portafolio**: Programas · Obras · Acciones.
- **Design system:** `design-system/MASTER.md` (tokens CONAGUA, Inter, accesibilidad AA).

## Entidad central: "Accion" (divergencia total)

En PROAGUA la unidad de gestion es la **accion** (1 registro = 1 CUA, *Clave Unica de Accion*).
En esta rama el rename es **completo** en datos, API y codigo; ademas, la **terminologia visible**
del portal usa **Accion** / **Acciones** (`entity` en `apps/web/src/config/brand.ts` y
`apps/api/src/common/brand.ts`): titulos **Catálogo de Acciones** y **Detalle de Acción**, menu
**Mis Acciones** (contratista) y tagline **Seguimiento de acciones de los programas del sector
hídrico**. Cada accion puede materializarse en una **obra fisica**, pero esa obra deja de ser el
marco principal del producto; el foco es el seguimiento de las acciones de los programas que lleva
la dependencia.

- **Datos (Prisma):** modelo `Accion`, enums `EstatusAccion` / `TipoAccion`, relaciones `accion` / `acciones`, FK de codigo `accionId`. Tabla fisica renombrada `obras` → **`acciones`** y tipos enum `EstatusObra`/`TipoObra` → `EstatusAccion`/`TipoAccion` (migracion `20260630120000_rename_obra_to_accion`).
- **API:** rutas `/acciones` (y anidadas `/acciones/:id/...`), graficos `chart/acciones-por-*`, import `/proagua/import/acciones`. `prisma.accion`.
- **Web:** tipo TS `Accion`, rutas de UI `/#/acciones`, links del asistente `/#/acciones/{id}`.
- **Tenant unico:** el tenant `arkon` fue **eliminado** de `apps/web/src/config/brand.ts` y `apps/api/src/common/brand.ts`. `TenantId` ahora es solo `'conagua'` y `getBrand()`/`getApiBrand()` siempre resuelven CONAGUA.

- **Decisiones de alcance (transición):** se conservan columnas físicas legadas en `acciones` y claves JSON del wire (`obra_id` = id de acción en tablas hijas). La ruta API `/obras` sirve **obras físicas**; `/acciones` sirve intervenciones de programa. En web, `/#/obras` = catálogo físico y `/#/acciones` = catálogo de acciones.

- No confundir con `AccionPrograma` (catalogo del Anexo VII), que es una entidad distinta y se mantiene igual.

## Enfoque de producto: Bandeja de Acciones

El portal CONAGUA presenta el producto como **Seguimiento de Acciones** de los programas del sector
hídrico. La entidad visible del catalogo y del detalle es **Accion** / **Acciones** (ver
`entity.pluralCap` y `entity.singularCap` en `apps/web/src/config/brand.ts`): **Catálogo de
Acciones**, **Detalle de Acción**, **Mis Acciones** (contratista). La **obra fisica** sigue
existiendo como objeto de cada accion (infraestructura que materializa el registro), pero ya no
enmarca el producto. La **navegacion y la pantalla de entrada** tras iniciar sesion se centran en
las **acciones pendientes** que cada usuario (estatal, municipal o contratista) puede o debe
realizar sobre esas acciones del portafolio — avances, estimaciones, documentos, observaciones,
alertas, solicitudes — y no al reves (entrar primero al listado del catalogo o al tablero de KPIs).

### Principio

- La **accion** es la unidad visible de registro y el objeto del catalogo (`/#/acciones`, etiqueta **Acciones**); cada accion puede corresponder a una obra fisica concreta.
- La **interaccion diaria** del usuario se guia por una **bandeja de tareas**: todo lo que requiere su atencion, agrupado y accionable desde un solo lugar.
- El **Dashboard** (KPIs, graficas) y el **catalogo de acciones** siguen existiendo y son accesibles desde el menu; dejan de ser la via principal ni la pantalla de aterrizaje.

### Cambios concretos (web)

| Aspecto | Antes | Ahora |
|---------|-------|-------|
| Pantalla tras login | `/#/dashboard` | `/#/bandeja` |
| Primer item del menu (3 roles) | Dashboard u Acciones segun rol | **Bandeja de Acciones** |
| Segundo item del menu | — | **Dashboard** |
| Bandeja completa de pendientes | Solo widget resumido en Dashboard | Pagina dedicada `BandejaAccionesPage.tsx` en `/#/bandeja` |

Detalle de implementacion en front:

- **Ruta y pagina:** `/#/bandeja` → `apps/web/src/pages/BandejaAccionesPage.tsx`. Muestra todas las acciones pendientes del usuario (misma fuente que el widget).
- **Menu lateral** (`AppContext.tsx`): para estatal, municipal y contratista, el primer item es `{ path: '/bandeja', label: 'Bandeja de Acciones' }`; el Dashboard pasa a ser el segundo.
- **Redireccion post-login** (`LoginPage.tsx`, `App.tsx`, `CatalogRedirect.tsx`): rutas por defecto y catch-all apuntan a `/#/bandeja` en lugar de `/#/dashboard`.
- **Widget en Dashboard** (`PendingActionsInbox.tsx`): se mantiene como **resumen** (primeros items); incluye el enlace **Ver todas las acciones** que navega a `/#/bandeja`.
- **API:** sin cambios de backend. La bandeja reutiliza el endpoint existente `GET /dashboard/pendientes` (cliente en `apps/web/src/lib/api.ts`).

### Lo que no cambia (transición)

- Identificadores técnicos internos en tablas hijas: `obra_id` (FK a acción), claves JSON `obra_id`, `total_obras`, etc.
- Bandeja de acciones como landing; Dashboard como segundo ítem en **Trabajo**.
- Modelo `Accion` como unidad de seguimiento operativo; `Obra` como capa física vinculada.

## Modelo operativo de Acciones (estado, historial, pendientes)

La rama trata la **Acción** como entidad de dominio de primera clase, con ciclo de vida validado y una bandeja unificada de trabajo pendiente.

### Consistencia de nomenclatura (backend)

El módulo NestJS que sirve `/acciones` se llama **`AccionesModule`** (`AccionesController` + `AccionesService`, carpeta `apps/api/src/acciones/`, DTOs `CreateAccionDto`/`UpdateAccionDto`). El módulo físico **`ObrasFisicasModule`** (`apps/api/src/obras-fisicas/`, ruta `/obras`) es independiente y sigue representando la **obra física**. En web, las funciones cliente usan el sufijo `…ByAccion` (`fetchEvmByAccion`, `fetchIdpByAccion`, `fetchAvancesTrimestralesByAccion`, etc.) y los props de componentes usan `accionId`.

### Máquina de estados y transiciones

- Enum `EstatusAccion` con transiciones válidas declaradas (`apps/api/src/acciones/accion-estado.ts`, réplica en web `apps/web/src/lib/accion-estado.ts`).
- **`POST /acciones/:id/transicion`** (`TransicionAccionDto`: `estatus`, `motivo?`) aplica una transición validada de forma **transaccional** y registra historial. Rechaza transiciones inválidas.
- **`PATCH /acciones/:id`** ya **no** permite cambiar `estatus` directamente (responde `400`); el cambio de estatus se hace solo por el endpoint de transición.
- **`GET /acciones/:id/historial`** devuelve el historial de cambios de estado.
- Tabla **`accion_estado_historial`** (`estatus_anterior`, `estatus_nuevo`, `motivo`, `usuario_id`, `usuario_nombre`, `created_at`) — migración `20260707120000_accion_estado_historial`. En web: botón **Cambiar estatus** y pestaña **Historial** en el detalle de acción.

### Bandeja de pendientes ampliada

`GET /dashboard/pendientes` se amplió más allá de alertas/estimaciones para consolidar todas las fuentes de trabajo pendiente en un solo modelo, respetando el rol del usuario:

- discrepancias **IDP** (integridad de datos), **cierres** de ejercicio fiscal, validación de **avances trimestrales**, **recomendaciones** de IA, además de las alertas/estimaciones previas.
- cada pendiente puede incluir `acciones_disponibles` para resolverlo **in-place** (atender, aprobar, validar, rechazar) desde la fila sin navegar.

### Nota sobre `obras_count`

El campo JSON `obras_count` **se conserva a propósito**: en `programas.service.ts` coexiste con `acciones_count` y cuenta **obras físicas distintas** (`obra_ids.size`), semánticamente diferente del número de acciones. Renombrarlo conflictuaría con la entidad física; las etiquetas visibles del UI ya muestran "Acciones" donde corresponde.

## Variables de entorno

| Variable | Capa | Valor en esta rama |
|----------|------|-------------------|
| `VITE_TENANT` | Web (Vite build) | `conagua` |
| `TENANT_ID` | API + seed Prisma | `conagua` |

Copie `.env.example` a `.env` en la raiz de `ARKON/` antes de Docker o desarrollo local.

## Usuarios demo (tras `prisma db seed`)

Contraseña: **`Conagua2024!`**

| Rol | Email |
|-----|--------|
| Estatal | `estatal@conagua.gob.mx` |
| Municipal | `municipal.centro@conagua.gob.mx` |
| Contratista | `cce@conagua.gob.mx` |

## Arranque rapido

```powershell
cd ARKON
cp .env.example .env
docker compose up --build -d
```

UI: http://localhost:8080

## Programas y datos de ejemplo

El portal CONAGUA trabaja con tres programas federales del sector hídrico:

| Programa | Descripción |
|----------|-------------|
| **PROAGUA** | Programa de Agua Potable, Drenaje y Saneamiento: obras de abastecimiento, redes, saneamiento y plantas en municipios y entidades operadoras. |
| **PRODDER** | Programa de Devolución de Derechos: inversión en eficiencia, macromedición, rehabilitación de redes y saneamiento financiado con recursos devueltos. |
| **PEAS** | Programa para el Fortalecimiento de Entidades de Agua y Saneamiento (publicado en DOF, marzo 2026): sustituye normativamente a PRODDER; en el demo conviven los tres para ilustrar la transición 2026. |

### Carga del seed

`prisma db seed` carga `apps/api/prisma/seed-data/conagua/` (~22 acciones documentadas, organismos operadores y municipios reales) en la tabla `acciones`.

```powershell
$env:TENANT_ID = "conagua"
npx prisma db seed
```


## Documentacion PROAGUA (anexos y lineamientos)

Formularios, fichas tecnicas y lineamientos U074 del programa PROAGUA: [proagua/README.md](./proagua/README.md).

### Trazabilidad y alcance del demo

- Tabla de fuentes, montos publicados vs ilustrativos y URLs: [CONAGUA-datos.md](./CONAGUA-datos.md).
- El conjunto es un **demo verificable**, no el padrón oficial ni el registro único de acciones del portafolio de CONAGUA.
- Los nombres y ubicaciones provienen de fuentes públicas; algunos montos sin cifra oficial en fuente están marcados como ilustrativos en la trazabilidad.

## Relacion con ARKON (`main`)

Esta rama es un **fork de producto**: ya no comparte el modelo multi-tenant con `main`. La marca y la
entidad ARKON ("Obra") viven solo en otras ramas (`main`, `ceaspue`). No se reintroduce el tenant
`arkon` aqui ni se mergea desde `main`.

## Despliegue en produccion (EasyPanel)

El stack debe desplegarse como **un solo proyecto Docker Compose** (`db` + `api` + `web`). El hostname `api` solo existe dentro de la red interna de Compose.

### Error: `host not found in upstream "api"`

Significa que el contenedor `web` no puede resolver el servicio `api`. Causas habituales en EasyPanel:

1. **Servicios desplegados por separado** — Si `web`, `api` y `db` son tres apps distintas, `web` no ve el hostname `api`. Solucion: desplegar el `docker-compose.yml` completo como una sola app, **o** definir en el servicio `web` la variable `API_UPSTREAM` con el hostname interno que EasyPanel asigna al servicio API (por ejemplo `arkon-api:8000`).

2. **Proxy de EasyPanel enruta `/api` por separado** — El dominio publico debe apuntar solo al puerto **80 del contenedor `web`**. No configure en el panel un upstream llamado `api` para `/api`; nginx dentro de `web` ya hace ese proxy.

3. **Solo el contenedor `web` esta corriendo** — Verifique que `api` y `db` esten activos y saludables.

### Variables de entorno en produccion

| Variable | Valor recomendado |
|----------|-------------------|
| `CORS_ORIGINS` | `https://arkon-conagua.humansoftware.mx` |
| `SECRET_KEY` | Cadena larga aleatoria (no usar el default) |
| `ALLOW_PUBLIC_REGISTER` | `false` |
| `API_UPSTREAM` | `api:8000` (Compose) o hostname interno del API en EasyPanel |
| `TENANT_ID` / `VITE_TENANT` | `conagua` |

Tras cambiar variables, reconstruya la imagen `web` (`docker compose up --build -d`).
