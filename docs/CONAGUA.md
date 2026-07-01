# Version CONAGUA — Comision Nacional del Agua

Rama **`conagua`**: producto **independiente** derivado de ARKON para la [Comision Nacional del Agua](https://www.gob.mx/conagua). Esta rama divergio por completo: la entidad central se llama **Accion** en todas las capas (datos, API, web), el tenant `arkon` fue eliminado del codigo y la rama **no se vuelve a mergear desde `main`**.

## Identidad visual

- Logo: `apps/web/public/brands/conagua/logo.jpg` (fuente: material institucional CONAGUA)
- Paleta principal: azul marino `#1B3664`, azul medio `#3B83BD`, acento dorado `#C5A059`
- Titulo y asistente: **CONAGUA** / **Asistente CONAGUA**

## Entidad central: "Accion" (divergencia total)

En PROAGUA la unidad de gestion es la **accion** (1 registro = 1 CUA, *Clave Unica de Accion*).
En esta rama el rename es **completo**, no solo de textos visibles:

- **Datos (Prisma):** modelo `Accion`, enums `EstatusAccion` / `TipoAccion`, relaciones `accion` / `acciones`, FK de codigo `accionId`. Tabla fisica renombrada `obras` → **`acciones`** y tipos enum `EstatusObra`/`TipoObra` → `EstatusAccion`/`TipoAccion` (migracion `20260630120000_rename_obra_to_accion`).
- **API:** rutas `/acciones` (y anidadas `/acciones/:id/...`), graficos `chart/acciones-por-*`, import `/proagua/import/acciones`. `prisma.accion`.
- **Web:** tipo TS `Accion`, rutas de UI `/#/acciones`, links del asistente `/#/acciones/{id}`.
- **Tenant unico:** el tenant `arkon` fue **eliminado** de `apps/web/src/config/brand.ts` y `apps/api/src/common/brand.ts`. `TenantId` ahora es solo `'conagua'` y `getBrand()`/`getApiBrand()` siempre resuelven CONAGUA.

**Decisiones de alcance (deliberadas, para acotar riesgo):** se conservaron como estaban las
**columnas fisicas** (`obra_id`, `tipo_obra`, `obra_resultante_id`), las **claves JSON del wire**
(`obra_id`, `total_obras`, etc.) y algunos **nombres internos** de variables/metodos/funciones
(`obraId`, `getObraOrThrow`, `fetchObras`). No son visibles para el usuario y renombrarlos no aporta
valor de producto. Los nombres de indices/constraints siguen como `obras_*` (cosmetico; sin efecto
en runtime).

- No confundir con `AccionPrograma` (catalogo del Anexo VII), que es una entidad distinta y se mantiene igual.

## Enfoque de producto: Bandeja de Acciones

El portal CONAGUA sigue llamando **Obra** / **Obras** a la entidad del catalogo y del detalle (ver `entity.pluralCap` en `apps/web/src/config/brand.ts`). Eso no cambia. Lo que cambia es **como se organiza la navegacion y la pantalla de entrada** tras iniciar sesion: el sistema se centra en las **acciones pendientes** que cada usuario (estatal, municipal o contratista) puede o debe realizar **sobre** esas obras — avances, estimaciones, documentos, observaciones, alertas, solicitudes — y no al reves (entrar primero al listado de obras o al tablero de KPIs).

### Principio

- La **obra** sigue siendo la unidad de registro y el objeto del catalogo (`/#/acciones`, etiqueta visible **Obras**).
- La **interaccion diaria** del usuario se guia por una **bandeja de tareas**: todo lo que requiere su atencion, agrupado y accionable desde un solo lugar.
- El **Dashboard** (KPIs, graficas) y el **catalogo de obras** siguen existiendo y son accesibles desde el menu; dejan de ser la via principal ni la pantalla de aterrizaje.

### Cambios concretos (web)

| Aspecto | Antes | Ahora |
|---------|-------|-------|
| Pantalla tras login | `/#/dashboard` | `/#/bandeja` |
| Primer item del menu (3 roles) | Dashboard u Obras segun rol | **Bandeja de Acciones** |
| Segundo item del menu | — | **Dashboard** |
| Bandeja completa de pendientes | Solo widget resumido en Dashboard | Pagina dedicada `BandejaAccionesPage.tsx` en `/#/bandeja` |

Detalle de implementacion en front:

- **Ruta y pagina:** `/#/bandeja` → `apps/web/src/pages/BandejaAccionesPage.tsx`. Muestra todas las acciones pendientes del usuario (misma fuente que el widget).
- **Menu lateral** (`AppContext.tsx`): para estatal, municipal y contratista, el primer item es `{ path: '/bandeja', label: 'Bandeja de Acciones' }`; el Dashboard pasa a ser el segundo.
- **Redireccion post-login** (`LoginPage.tsx`, `App.tsx`, `CatalogRedirect.tsx`): rutas por defecto y catch-all apuntan a `/#/bandeja` en lugar de `/#/dashboard`.
- **Widget en Dashboard** (`PendingActionsInbox.tsx`): se mantiene como **resumen** (primeros items); incluye el enlace **Ver todas las acciones** que navega a `/#/bandeja`.
- **API:** sin cambios de backend. La bandeja reutiliza el endpoint existente `GET /dashboard/pendientes` (cliente en `apps/web/src/lib/api.ts`).

### Lo que no cambia

- Nombres visibles de la entidad: **Obra** / **Obras** (y **Mis Obras** para contratista) en catalogo, detalle y titulos de pagina.
- Catalogo en `/#/acciones` (`ObrasPage.tsx`) y flujos de detalle por obra.
- Dashboard con KPIs y graficas en `/#/dashboard`, accesible como segundo item del menu.
- Rename tecnico interno Obra → Accion en Prisma/API (seccion anterior); la bandeja de **acciones pendientes** es un concepto de **producto/UX** distinto del nombre del modelo de datos.

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
- El conjunto es un **demo verificable**, no el padrón oficial ni el registro único de obras de CONAGUA.
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
