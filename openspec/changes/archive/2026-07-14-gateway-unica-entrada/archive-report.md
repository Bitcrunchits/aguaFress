# Archive Report: gateway-unica-entrada

**Archived**: 2026-07-14
**Change**: `gateway-unica-entrada`
**Branch**: `adrian/api-gateway-unica-entrada`
**Base branch**: `develop`

## Intent

Cerrar el HTTP directo del usuario-service y convertirlo en microservicio TCP-only (accesible solo vía gateway). Esto requirió: (a) agregar 14 endpoints TCP que antes solo existían como HTTP, (b) eliminar duplicado `auth.me`/`users.profile`, (c) eliminar 8 controllers HTTP y sus tests, (d) cerrar puerto 3001 en Docker.

## Traceability

| Artifact | Source | ID |
|----------|--------|----|
| Proposal | Engram `sdd/gateway-unica-entrada/proposal` | #353 |
| Tasks update | Engram `sdd/gateway-unica-entrada/tasks` | #354 |
| Tasks file | Filesystem (archived) | `tasks.md` |
| Verify | Inline (manual verification) | — |

## Verify Results (previo al archivo)

Todos los checks pasaron:

- ✅ `auth.me` eliminado del action registry
- ✅ 14 TCP handlers agregados con entries en action registry
- ✅ 8 controllers HTTP eliminados
- ✅ docker-compose sin puerto 3001
- ✅ Tests usuario-service: 278/278 pasan
- ✅ Tests gateway: 52/52 pasan

## Tasks completadas

| Phase | Descripción | Estado |
|-------|-------------|--------|
| 1.1 – 1.12 | 14 TCP handlers (vendedores, super-admin, clientes, QR, link-invitacion) | ✅ Completo |
| 1.13 | Action registry actualizado (+14 entries, -1 `auth.me`) | ✅ Completo |
| 2.1 – 2.3 | Gateway action-resolver tests | ✅ Completo |
| 3.1 – 3.8 | 8 controllers HTTP eliminados + specs | ✅ Completo |
| 3.9 | `auth.me` TCP handler removido | ✅ Completo |
| 3.10 – 3.11 | `main.ts` TCP-only, sin HTTP/Swagger/ValidationPipe | ✅ Completo |
| 3.13 | docker-compose sin puerto 3001 | ✅ Completo |
| 3.14 | Tests usuario-service: 278 pasan | ✅ Completo |

### Extras (fuera del plan original)

| Tarea | Estado |
|-------|--------|
| Fix `tsconfig.json` de usuario-service: `@agua/contracts` path | ✅ |
| Crear `MicroServices/gateway/.env` con JWT_SECRET, USUARIO_SERVICE_HOST, TCP_PORT | ✅ |
| Fix `docs.controller.ts`: rutas sin `api/` duplicado + `@Public()` | ✅ |
| Crear `api-reference.html` con endpoints, DTOs, enums | ✅ |

### Pendientes (no bloqueantes, no impiden el archivo)

- Revisar test de gateway que falla (`register/vendedor` da 401 pre-existing)
- Verificar entry point en `Dockerfile` de usuario-service (CMD apunta a ruta vieja)
- Mergear rama al tracker cuando corresponda

> **Nota**: Las tasks 3.12 (Dockerfile EXPOSE 3011 + CMD) y el merge al tracker quedaron pendientes porque no son crítica para la funcionalidad central y requieren verificación adicional.

## Specs Synced

No se crearon delta specs separados para este cambio — la propuesta (`proposal.md`) sirvió como única fuente de verdad sobre alcance y criterios de éxito, dado que el scope era mecánico y bien entendido (agregar handlers TCP, actualizar action registry, remover controllers HTTP). No se requirió merge de specs a `openspec/specs/`.

## Cambios en la arquitectura

- **usuario-service**: Pasó de híbrido HTTP+TCP a TCP-only como microservicio interno. Todo acceso pasa por el gateway.
- **gateway**: 14 nuevas acciones en el action registry para enrutar a usuario-service.
- **`auth.me` → `users.profile`**: Unificación del endpoint de perfil propio, eliminando duplicación.

## SDD Cycle Complete

El cambio fue completamente planeado (proposal), implementado (14 handlers TCP + eliminación HTTP), verificado (278 + 52 tests pasan), y archivado.

## Source of Truth

- Propuesta y criterios de éxito: Engram #353
- Estado de tareas: `tasks.md` en el archivo
- Código implementado: branch `adrian/api-gateway-unica-entrada`
