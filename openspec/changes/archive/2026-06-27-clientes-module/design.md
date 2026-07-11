# Design: Clientes Module

## Technical Approach

New `ClientesModule` mirroring `VendedoresModule` — dual-controller pattern with a shared `ClientesService`. Admin routes (`ClientesController` with `RolesGuard(SUPER_ADMIN)`) and vendedor-scoped routes (`ClienteVendedorController` with `VendedorGuard`). Address fields as flat DTO properties (snake_case → camelCase mapping in service), consistent with existing `ciudadDefault → ciudad_default` pattern.

## Architecture Decisions

### Decision: Route ordering — `mios/` before `:id`

| Option | Tradeoff |
|--------|----------|
| Register `ClienteVendedorController` first | `mios/` routes match before `:id` — same bugfix as VendedoresModule comment |
| Register `ClientesController` first | `GET /clientes/mios` matches `:id = "mios"` — collision |

**Choice**: `ClienteVendedorController` first in `controllers[]`, identical to VendedoresModule pattern.

### Decision: Flat address fields (not nested object)

| Option | Tradeoff |
|--------|----------|
| Flat fields in DTO | Consistent with vendedores (camelCase → snake_case mapping). Simple validation with class-validator. |
| Nested address object | Cleaner API but breaks Prisma mapping pattern. Adds transform complexity. |

**Choice**: Flat `direccionCalle`, `direccionNumero`, etc. mapped to `direccion_calle`, `direccion_numero` in service layer. Matches existing `ciudadDefault → ciudad_default` convention.

### Decision: Cartera scoping via relational filter

**Choice**: Use `cartera: { some: { vendedor_id, activo: true } }` in `where` clause — no raw SQL, no view. `activo: true` ensures stale cartera entries are excluded (preserves flag-based soft-deactivate from proposal).

### Decision: Reassign as Prisma transaction

**Choice**: `$transaction` — validate vendedor exists (findUnique throws), update Cliente.vendedor_id, then `cartera.upsert` to set/deactivate cartera relation atomically.

## Data Flow

```
                  ┌─ ClientesController (admin) ─→ ClientesService ─→ Prisma
                  │  @UseGuards(RolesGuard)       (shared instance)
Request ─→ Auth ─┤
                  └─ ClienteVendedorController ─→ ClientesService ─→ Prisma
                     @UseGuards(VendedorGuard)    (cartera-scoped where)
```

Admin: unscoped queries. Vendedor: all queries inject `cartera: { some: { vendedor_id, activo: true } }`.

Reassign flow: `ClientesController.reasignar()` → `ClientesService.reasignar(id, vendedorId)` → `prisma.$transaction([validate vendedor, update cliente, upsert cartera])`.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/clientes/clientes.module.ts` | Create | Module registering both controllers, service, importing AuthModule + CommonModule |
| `src/clientes/clientes.service.ts` | Create | Shared service: list, getById, update, reassign (admin) + listMios, getByIdMio, updateMio (vendedor) |
| `src/clientes/clientes.controller.ts` | Create | Admin controller: GET /, GET /:id, PATCH /:id, PATCH /:id/reasignar |
| `src/clientes/cliente-vendedor.controller.ts` | Create | Vendedor controller: GET /mios, GET /mios/:id, PATCH /mios/:id |
| `src/clientes/dto/list-clientes.dto.ts` | Create | page (1), limit (20, max 100), vendedor_id?, search? |
| `src/clientes/dto/update-cliente.dto.ts` | Create | All profile fields (admin) — nombre, apellido, dni, telefono, tipo_factura, direccion* |
| `src/clientes/dto/update-cliente-vendedor.dto.ts` | Create | Subset (vendedor) — NO tipo_factura, NO dni |
| `src/clientes/dto/reasignar-vendedor.dto.ts` | Create | vendedorId: string (required) |
| `src/clientes/dto/dto.spec.ts` | Create | DTO validation tests per vendedores pattern |
| `src/clientes/clientes.service.spec.ts` | Create | Service unit tests |
| `src/clientes/clientes.controller.spec.ts` | Create | Admin controller unit tests |
| `src/clientes/cliente-vendedor.controller.spec.ts` | Create | Vendedor controller unit tests |
| `src/clientes/clientes.integration.spec.ts` | Create | Integration tests with mock Prisma + JWT |
| `src/app.module.ts` | Modify | Import `ClientesModule` |

## Interfaces / Contracts

### Cartera-scoped Prisma query pattern (vendedor)

```typescript
// Shared filter applied by all vendedor-scoped methods
const carteraFilter = {
  cartera: { some: { vendedor_id: userId, activo: true } },
};

// getByIdMio
const cliente = await this.prisma.cliente.findFirst({
  where: { id: clienteId, ...carteraFilter },
  // include: { vendedor: ... }
});

// listMios
const where = { ...carteraFilter };
if (params.search) where.OR = [/* nombre, apellido */];
```

### Reassign transaction

```typescript
async reassign(id: string, vendedorId: string) {
  return this.prisma.$transaction(async (tx) => {
    const targetVendedor = await tx.vendedor.findUnique({ where: { id: vendedorId }, select: { id: true } });
    if (!targetVendedor) throw new NotFoundException('Vendedor not found');

    const cliente = await tx.cliente.update({
      where: { id },
      data: { vendedor_id: vendedorId },
    });

    await tx.cartera.upsert({
      where: { vendedor_id_cliente_id: { vendedor_id: vendedorId, cliente_id: id } },
      create: { vendedor_id: vendedorId, cliente_id: id, activo: true },
      update: { activo: true },
    });

    return cliente;
  });
}
```

## Testing Strategy

| Layer | What | How |
|-------|------|-----|
| DTO | Validation decorators, default values, enum rejection | plainToInstance + validate, per dto.spec.ts pattern |
| Service unit | Admin list/get/update/reassign + vendedor cartera scoping | Mock PrismaService, test 404/404-for-non-cartera |
| Controller unit | Delegation to service + param extraction | Mock service, test method calls |
| Integration | Auth chain (401/403), admin CRUD flow, vendedor cartera scoping | Supertest + mock Prisma + JWT tokens |

Key test: vendedor GET `mios/:id` returns 404 when cliente exists but NOT in cartera (no existence leak per spec).

## Migration / Rollout

No migration required. Schema already has CLIENTE + RELACION_CARTERA tables. Module import is additive.

## Open Questions

- None. Patterns are established — this is a direct structural mirror of VendedoresModule.
