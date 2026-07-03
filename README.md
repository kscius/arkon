# ARKON

Sistema Integral de Gestión de Obras Públicas — monorepo MVP (React + NestJS + PostgreSQL).

## Version CONAGUA (rama `conagua`)

White-label para la **Comisión Nacional del Agua** ([gob.mx/conagua](https://www.gob.mx/conagua)): seguimiento de **acciones** de los programas del sector hídrico (PROAGUA, PEAS, PRODDER), con logo institucional, paleta azul CONAGUA, terminologia visible Acción/Acciones, textos del asistente y usuarios demo `@conagua.gob.mx`.

Configure en `.env`:

```env
TENANT_ID=conagua
VITE_TENANT=conagua
```

Detalle: [docs/CONAGUA.md](./docs/CONAGUA.md). Contraseña demo: **`Conagua2024!`** · login: `estatal@conagua.gob.mx`.

## Requisitos

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 9+
- [Docker](https://www.docker.com/) y Docker Compose (opcional, recomendado para stack completo)

## Arranque con Docker (recomendado)

Stack **aislado** en un solo `docker-compose.yml` (red interna `arkon_internal`, proyecto `arkon`, volúmenes nombrados). No depende de otros servicios del monorepo padre.

Desde la raíz de este directorio (`ARKON/`):

```bash
cp .env.example .env
docker compose config    # validar compose
docker compose up --build -d
```

Windows (script):

```powershell
.\scripts\docker-up.ps1
```

| Servicio | URL |
|----------|-----|
| Web (SPA + proxy API) | http://localhost:8080 |
| API directa | http://localhost:8000/api |
| Swagger | http://localhost:8000/api/docs |
| PostgreSQL (desde el host) | `localhost:5433` (puerto interno del contenedor: 5432) |

El contenedor **api** al arrancar:

1. Espera a que `db` esté lista
2. Ejecuta `prisma migrate deploy` (o `prisma db push` si aún no hay migraciones)
3. Ejecuta `prisma db seed` si existe `prisma/seed.ts`
4. Inicia NestJS en el puerto 8000

Nginx en **web** sirve el frontend y reenvía `/api/*` al servicio `api`.

## Desarrollo local (sin Docker en API/Web)

**Recomendado para iterar con hot reload** (DB sigue en Docker):

```powershell
# Desde ARKON/
.\scripts\dev-local.ps1              # Native: DB Docker + API :8000 + Vite :3000
.\scripts\dev-local.ps1 -Mode Docker # Stack completo en :8080
.\scripts\stop-dev.ps1               # Detener procesos dev + contenedores api/web
.\scripts\smoke-conagua.ps1          # Smoke API + roles CONAGUA
```

| Modo | Web | API | DB |
|------|-----|-----|-----|
| Native (`dev-local.ps1`) | http://localhost:3000 | http://localhost:8000/api | Docker `:5433` |
| Docker (`docker-up.ps1`) | http://localhost:8080 | proxy `/api` + :8000 | Docker `:5433` |

E2E contra dev nativo:

```powershell
cd apps/web
$env:PLAYWRIGHT_BASE_URL='http://localhost:3000'
$env:TENANT_ID='conagua'
pnpm exec playwright test e2e/
```

### Manual (tres terminales)

```bash
cp .env.example .env
pnpm install

# Terminal 1 — base de datos (o use solo el servicio db de Compose)
docker compose up db

# Terminal 2 — API
cd apps/api
pnpm exec prisma generate
pnpm exec prisma migrate deploy   # o en dev: pnpm exec prisma migrate dev
TENANT_ID=conagua pnpm exec prisma db seed
pnpm run dev

# Terminal 3 — Web
cd apps/web
pnpm run dev
```

Variables útiles en `.env`:

- `DATABASE_URL` — conexión PostgreSQL
- `SECRET_KEY` — firma JWT
- `VITE_API_URL` — en dev: `http://localhost:8000/api`

## Usuarios demo

Contraseña para todos: **`Arkon2024!`**

| Rol | Email |
|-----|--------|
| Estatal | `estatal@arkon.gob.mx` |
| Estatal | `coordinador@arkon.gob.mx` |
| Municipal | `municipal.centro@arkon.gob.mx` |
| Municipal | `municipal.norte@arkon.gob.mx` |
| Municipal | `municipal.valle@arkon.gob.mx` |
| Municipal | `municipal.sur@arkon.gob.mx` |
| Contratista | `cce@arkon.gob.mx` |
| Contratista | `gdp@arkon.gob.mx` |
| Contratista | `ies@arkon.gob.mx` |

> Si el seed aún no está en el repo, cree usuarios con `POST /api/auth/register` (solo entornos de desarrollo) o espere a `prisma/seed.ts`.

## Flujos demo (MVP)

Contraseña demo: **`Arkon2024!`**

1. **Contratista** (`cce@arkon.gob.mx`): Dashboard → pestaña *Reportar Avance* → enviar avance en obra asignada.
2. **Municipal** (`municipal.centro@arkon.gob.mx`): *Validar Avances* → aprobar u observar; *Estimaciones* → presentar y validar municipal.
3. **Estatal** (`estatal@arkon.gob.mx`): Detalle de obra → pestaña *Estimaciones* → autorizar validación estatal; *Alertas* → atender con acción tomada.
4. **Expediente**: Detalle de obra → *Expediente* → subir PDF/imagen y descargar con JWT.
5. **Asistente**: menú *Asistente* con datos reales del API (`POST /api/chat/ask`).

Variable `ALLOW_PUBLIC_REGISTER=false` deshabilita `POST /api/auth/register` en producción.

## Smoke tests

### Script automático

Con el stack levantado:

```powershell
# Windows
.\scripts\smoke.ps1
```

```bash
# Linux / macOS / Git Bash
./scripts/smoke.sh
```

### Checklist manual

- [ ] `GET http://localhost:8080` — carga la SPA (login)
- [ ] `GET http://localhost:8080/api/health` — `{"status":"ok","service":"arkon-api"}`
- [ ] `GET http://localhost:8000/api/health` — mismo JSON (API directa)
- [ ] `POST http://localhost:8080/api/auth/login` — JSON con `access_token` (usuario demo)
- [ ] `GET http://localhost:8080/api/auth/me` con `Authorization: Bearer <token>`
- [ ] Login en la UI con `estatal@arkon.gob.mx` / `Arkon2024!`
- [ ] Dashboard estatal carga KPIs sin error de red en consola

## Estructura

```
ARKON/
├── apps/
│   ├── api/          # NestJS + Prisma
│   └── web/          # Vite + React
├── docker-compose.yml
└── scripts/          # smoke tests
```

## Solución de problemas

- **API reinicia en bucle**: revise logs `docker compose logs api`; suele ser DB no lista o `DATABASE_URL` incorrecta.
- **502 en `/api`**: confirme que el servicio `api` está arriba (`docker compose ps`).
- **Build sin lockfile**: el Dockerfile usa `pnpm install --no-frozen-lockfile`; genere `pnpm-lock.yaml` en local con `pnpm install` para builds reproducibles.
