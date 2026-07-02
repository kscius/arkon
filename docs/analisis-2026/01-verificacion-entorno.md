# 01 — Verificación de entorno

> Fecha: 2026-07-02. Entorno verificado antes del reanálisis y transformación.

## Resumen

| Verificación | Resultado |
|--------------|-----------|
| Rama Git | `conagua` (tracking `origin/conagua`) |
| Docker stack | **UP** — `db`, `api`, `web` healthy |
| API health | `GET /api/health` → `{"status":"ok","service":"arkon-api"}` |
| Login demo | `estatal@conagua.gob.mx` / `Conagua2024!` → token OK |
| Dashboard KPIs | 22 acciones, datos coherentes con seed CONAGUA |
| Migraciones Prisma | **5** aplicadas (+ lock) |
| Build analizado | Contenedores levantados hace ~39h (api/web), DB ~7 días — **no es build obsoleto** |

## Servicios

| Servicio | URL / Puerto | Estado |
|----------|--------------|--------|
| PostgreSQL | `localhost:5433` | healthy |
| API NestJS | `http://localhost:8000/api` | healthy |
| Web (Nginx) | `http://localhost:8080` | healthy |
| Swagger | `http://localhost:8000/api/docs` | disponible |

## Conteos reales por tabla (PostgreSQL)

| Tabla | Registros |
|-------|-----------|
| acciones | 22 |
| municipios | 14 |
| contratistas | 15 |
| avances_mensuales | 176 |
| estimaciones | 51 |
| documentos | 176 |
| alertas | 33 |
| users | 9 |

Otras tablas presentes: `acciones_programa`, `alerta_configs`, `anexos_ejecucion`, `anexos_tecnicos`, `avances_trimestrales`, `cierres_ejercicio`, `cofinanciamientos`, `entidades_federativas`, `observaciones`, `organismos_operadores`, `programas`, `solicitudes_programa`.

## Migraciones aplicadas

1. `20260603221459_init`
2. `20260608120000_add_alerta_config_and_telefono`
3. `20260622054732_conagua_proagua_extension`
4. `20260623120000_ensure_conagua_anexo_xiii`
5. `20260630120000_rename_obra_to_accion`

## KPIs de smoke (rol estatal)

- `total_obras`: 22
- `obras_ejecucion`: 5 | `obras_retraso`: 4 | `obras_concluidas`: 6 | `obras_riesgo`: 2
- `monto_autorizado`: ~486M MXN | `monto_ejercido`: ~158M MXN
- `avance_fisico_promedio`: 62.5% | `avance_financiero_promedio`: 62.01%
- `alertas_total`: 31 (1 crítica, 26 altas)

## Conclusión

El entorno local está **actualizado y operativo**. El análisis y la transformación se ejecutan contra esta versión (rama `conagua`, seed CONAGUA, 5 migraciones, stack Docker healthy).
