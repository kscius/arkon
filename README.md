# SIGOPEM

Sistema Integral de Gestión de Obras Públicas — monorepo MVP (React + NestJS + PostgreSQL).

## Requisitos

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 9+
- [Docker](https://www.docker.com/) y Docker Compose (opcional, recomendado para stack completo)

## Arranque con Docker (recomendado)

Desde la raíz de este directorio (`SIGOPEM/`):

```bash
cp .env.example .env
docker compose config    # validar compose
docker compose up --build
```

| Servicio | URL |
|----------|-----|
| Web (SPA + proxy API) | http://localhost:8080 |
| API directa | http://localhost:8000/api |
| Swagger | http://localhost:8000/api/docs |
| PostgreSQL | `localhost:5432` |

El contenedor **api** al arrancar:

1. Espera a que `db` esté lista
2. Ejecuta `prisma migrate deploy` (o `prisma db push` si aún no hay migraciones)
3. Ejecuta `prisma db seed` si existe `prisma/seed.ts`
4. Inicia NestJS en el puerto 8000

Nginx en **web** sirve el frontend y reenvía `/api/*` al servicio `api`.

## Desarrollo local (sin Docker)

```bash
cp .env.example .env
pnpm install

En Windows, si `prisma db seed` falla con error de módulo nativo de `bcrypt`, ejecute `pnpm install --force` en la raíz del monorepo (el `package.json` raíz declara `pnpm.onlyBuiltDependencies` para compilar bcrypt).

# Terminal 1 — base de datos (o use solo el servicio db de Compose)
docker compose up db

# Terminal 2 — API
cd apps/api
pnpm exec prisma generate
pnpm exec prisma migrate deploy   # o en dev: pnpm exec prisma migrate dev
pnpm exec prisma db seed
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

Contraseña para todos: **`Sigopem2024!`**

| Rol | Email |
|-----|--------|
| Estatal | `estatal@sigopem.gob.mx` |
| Estatal | `coordinador@sigopem.gob.mx` |
| Municipal | `puebla@sigopem.gob.mx` |
| Municipal | `atlixco@sigopem.gob.mx` |
| Municipal | `cholula@sigopem.gob.mx` |
| Municipal | `tehuacan@sigopem.gob.mx` |
| Contratista | `cce@sigopem.gob.mx` |
| Contratista | `gdp@sigopem.gob.mx` |
| Contratista | `ies@sigopem.gob.mx` |

> Si el seed aún no está en el repo, cree usuarios con `POST /api/auth/register` (solo entornos de desarrollo) o espere a `prisma/seed.ts`.

## Flujos demo (MVP)

Contraseña demo: **`Sigopem2024!`**

1. **Contratista** (`cce@sigopem.gob.mx`): Dashboard → pestaña *Reportar Avance* → enviar avance en obra asignada.
2. **Municipal** (`puebla@sigopem.gob.mx`): *Validar Avances* → aprobar u observar; *Estimaciones* → presentar y validar municipal.
3. **Estatal** (`estatal@sigopem.gob.mx`): Detalle de obra → pestaña *Estimaciones* → autorizar validación estatal; *Alertas* → atender con acción tomada.
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
- [ ] `GET http://localhost:8080/api/health` — `{"status":"ok","service":"sigopem-api"}`
- [ ] `GET http://localhost:8000/api/health` — mismo JSON (API directa)
- [ ] `POST http://localhost:8080/api/auth/login` — JSON con `access_token` (usuario demo)
- [ ] `GET http://localhost:8080/api/auth/me` con `Authorization: Bearer <token>`
- [ ] Login en la UI con `estatal@sigopem.gob.mx` / `Sigopem2024!`
- [ ] Dashboard estatal carga KPIs sin error de red en consola

## Estructura

```
SIGOPEM/
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
