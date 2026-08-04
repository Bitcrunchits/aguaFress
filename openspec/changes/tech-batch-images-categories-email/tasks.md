# Tasks: Tech Batch — Images, Categories, Email

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~350-450 (6-8 archivos nuevos, 10-12 modificados) |
| 400-line budget risk | Medium |
| Chained PRs recommended | No (cambios independientes por servicio) |
| Suggested split | Single PR o 2 chained (gateway upload infrastructure primero) |
| Delivery strategy | ask-on-risk |

## Tareas

### Fase 1 — Upload infrastructure (Gateway)

| # | Tarea | Archivos | Estimación |
|---|-------|----------|------------|
| 1.1 | Crear UploadService con sharp + nanoid | `src/upload/upload.service.ts` | 🟡 Mediana |
| 1.2 | Crear UploadController (product-image + vendor-logo) | `src/upload/upload.controller.ts` | 🔵 Chica |
| 1.3 | Crear UploadModule | `src/upload/upload.module.ts` | 🔵 Chica |
| 1.4 | Agregar static assets en main.ts | `src/main.ts` | 🔵 Chica |
| 1.5 | Agregar sharp + nanoid a package.json | `package.json` | 🔵 Chica |
| 1.6 | Agregar config upload a env | `.env` | 🔵 Chica |

**Dependencias**: Ninguna. Puede implementarse primero y testearse en aislamiento.

### Fase 2 — CRUD categorías y marcas (products-service)

| # | Tarea | Archivos | Estimación |
|---|-------|----------|------------|
| 2.1 | Crear DTOs: CreateCategoriaDto, UpdateCategoriaDto, CreateMarcaDto, UpdateMarcaDto | `src/categories/dto/` | 🔵 Chica |
| 2.2 | Agregar CRUD methods a CategoriesService | `src/categories/categories.service.ts` | 🟡 Mediana |
| 2.3 | Agregar TCP handlers (create/update/delete) | `src/tcp/categories-tcp.controller.ts` | 🟡 Mediana |
| 2.4 | Agregar entries al action-registry del gateway | `gateway/src/actions/action-registry.ts` | 🔵 Chica |
| 2.5 | Agregar schemas OpenAPI para nuevos endpoints | `gateway/src/docs/openapi-spec.service.ts` | 🔵 Chica |

**Dependencias**: Ninguna. Independiente de Fase 1.

### Fase 3 — Email en listar vendedores (usuario-service)

| # | Tarea | Archivos | Estimación |
|---|-------|----------|------------|
| 3.1 | Agregar email a VendedorResponse en contracts | `packages/contracts/src/dto/user.dto.ts` | 🔵 Chica |
| 3.2 | Agregar include auth_user.email en VendedoresService.list() | `src/vendedores/vendedores.service.ts` | 🔵 Chica |
| 3.3 | Agregar email al schema OpenAPI | `gateway/src/docs/openapi-spec.service.ts` | 🔵 Chica |

**Dependencias**: Ninguna. Independiente.

### Fase 4 — Logo en registro de vendedores (usuario-service)

| # | Tarea | Archivos | Estimación |
|---|-------|----------|------------|
| 4.1 | Agregar logo opcional a RegisterDto | `src/auth/dto/register.dto.ts` | 🔵 Chica |
| 4.2 | Guardar logo en el registro (auth.service.ts) | `src/auth/auth.service.ts` | 🔵 Chica |

**Dependencias**: Fase 1 (upload infrastructure) — necesita el endpoint de upload para obtener el imageId.

### Fase 5 — Tests

| # | Tarea | Archivos | Estimación |
|---|-------|----------|------------|
| 5.1 | Tests UploadService | `gateway/src/upload/` | 🟡 Mediana |
| 5.2 | Tests CRUD categorías/marcas | `products-service/src/categories/` | 🟡 Mediana |
| 5.3 | Tests login vendor estado check | ya actualizado ✅ | - |

**Dependencias**: Fases 1-3.

## Orden de implementación

```
Fase 1 (upload infra) ──> Fase 4 (logo registro)
     │                        
     ├──> Fase 2 (CRUD cat/marca) ── independiente
     │
     └──> Fase 3 (email listar) ── independiente
     
Fase 5 (tests) ── después de fases 1-3
```

## Notas

- Las Fases 2 y 3 no dependen de la Fase 1 → pueden ejecutarse en paralelo o en cualquier orden
- La Fase 4 depende de la Fase 1 (necesita upload infra para el logo) → va después
- La Fase 5 (tests) va al final
