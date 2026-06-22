# Version CONAGUA — Comision Nacional del Agua

Rama **`conagua`**: despliegue white-label de ARKON para la [Comision Nacional del Agua](https://www.gob.mx/conagua).

## Identidad visual

- Logo: `apps/web/public/brands/conagua/logo.jpg` (fuente: material institucional CONAGUA)
- Paleta principal: azul marino `#1B3664`, azul medio `#3B83BD`, acento dorado `#C5A059`
- Titulo y asistente: **CONAGUA** / **Asistente CONAGUA**

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

### Carga tenant-aware del seed

Con `TENANT_ID=conagua`, `prisma db seed` carga `apps/api/prisma/seed-data/conagua/` (~22 obras documentadas, organismos operadores y municipios reales). Sin esa variable, el seed usa el dataset genérico ARKON.

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

## Volver a marca ARKON

En `main`, use `TENANT_ID=arkon` y `VITE_TENANT=arkon` (o omita las variables; el default es ARKON).
