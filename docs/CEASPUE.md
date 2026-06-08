# Version CEASPUE — Comision Estatal de Agua y Saneamiento de Puebla

Rama **`ceaspue`**: despliegue white-label de ARKON para la [CEASPUE](https://www.puebla.gob.mx/) (Comision Estatal de Agua y Saneamiento del Estado de Puebla).

## Identidad visual

- Logo: `apps/web/public/brands/ceaspue/logo.png`
- Banner institucional (login): `apps/web/public/brands/ceaspue/banner.png`
- Paleta principal: guinda `#8B1538`, guinda oscuro `#6B1028`, acento `#C41E5C`
- Titulo y asistente: **CEASPUE** / **Asistente Inteligente de CEASPUE**

## Variables de entorno

| Variable | Capa | Valor en esta rama |
|----------|------|-------------------|
| `VITE_TENANT` | Web (Vite build) | `ceaspue` |
| `TENANT_ID` | API + seed Prisma | `ceaspue` |

Copie `.env.example` a `.env` en la raiz de `ARKON/` antes de Docker o desarrollo local.

## Usuarios demo (tras `prisma db seed`)

Contraseña: **`Sigopem2024!`**

| Rol | Email |
|-----|--------|
| Estatal | `estatal@sigopem.gob.mx` |
| Municipal | `puebla@sigopem.gob.mx` |
| Contratista | `cce@sigopem.gob.mx` |

## Arranque rapido

```powershell
cd ARKON
cp .env.example .env
docker compose up --build -d
```

UI: http://localhost:8080

## Integracion con rama conagua

Esta rama incorpora las mejoras funcionales de `conagua` (catalogo de obras, folios, combobox de programas, tenant system) manteniendo la identidad visual de Puebla via `VITE_TENANT=ceaspue` y `TENANT_ID=ceaspue`.
