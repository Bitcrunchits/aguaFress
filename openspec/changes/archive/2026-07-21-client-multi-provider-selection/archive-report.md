# Archive Report: client-multi-provider-selection

**Archived**: 2026-07-21
**Mode**: hybrid (OpenSpec + Engram)
**Status**: Complete with verify warnings
**Verdict**: PASS_WITH_WARNINGS

## Change Summary

Enabled clientes to operate with multiple proveedores by making active `RELACION_CARTERA` rows the canonical cliente↔proveedor relationship, keeping `CLIENTE.vendedor_id` as default/V1 compatibility, and scoping provider-sensitive gateway, cart, and order flows by validated `vendedorId`.

## Traceability

| Artifact | Source | ID / Path |
|----------|--------|-----------|
| Proposal | Engram `sdd/client-multi-provider-selection/proposal` | #736 |
| Spec | Engram `sdd/client-multi-provider-selection/spec` | #738 |
| Design | Engram `sdd/client-multi-provider-selection/design` | #739 |
| Tasks | Engram `sdd/client-multi-provider-selection/tasks` | #743 |
| Verify report | Engram `sdd/client-multi-provider-selection/verify-report` | #749 |
| Filesystem archive | OpenSpec archive | `openspec/changes/archive/2026-07-21-client-multi-provider-selection/` |

## Specs Synced

| Domain | Action | Details |
|--------|--------|---------|
| `cliente-provider-selection` | Confirmed | Main spec exists and matches provider list, active selection, and provider-scoped access requirements. |
| `cliente-admin` | Confirmed | Main spec documents `RELACION_CARTERA` membership/default management and `CLIENTE.vendedor_id` as default/V1 compatibility only. |
| `cliente-vendedor` | Confirmed | Main spec authorizes vendedor access through active cartera and rejects default-pointer-only mismatches. |
| `cart-management` | Confirmed | Main spec scopes active carts by authenticated cliente plus validated `vendedorId`; body `userId` is ignored. |
| `order-management` | Confirmed | Main spec creates async orders from the matching provider-scoped cart and clears only that cart. |
| `orders-gateway-routing` | Confirmed | Main spec forwards trusted `userId`, `role`, and validated `vendedorId`; unauthorized providers are rejected before mutation. |
| `data-model-documentation` | Confirmed | Main spec protects `docs/documentacion/modelo-datos.md` as source of truth for cartera/default and identity naming. |

## Verification Summary

Final verify passed with non-blocking warnings only:

- ✅ `pnpm --filter @agua/contracts build`
- ✅ usuario-service focused Jest: 70 tests passed
- ✅ gateway build and focused Jest: 48 tests passed, with Redis/BullMQ/open-handle warnings
- ✅ orders-service Prisma validate/generate, build, and Jest: 96 tests passed
- ✅ `git diff --check`
- ✅ notifications-service remained untouched
- ⚠️ `dbs check` unavailable in PATH
- ⚠️ Two changed files reported below 80% focused line coverage: `usuario-domain-tcp.controller.ts` and `orders.repository.ts`

## Tasks

All 16 tracked tasks are complete, including task 5.4 for contracts build, affected service tests, and `docs/documentacion/modelo-datos.md` identity naming verification.

## Source of Truth

- Main specs remain under `openspec/specs/*`.
- Data-model documentation source of truth remains `docs/documentacion/modelo-datos.md`.
- Archived change artifacts are kept under `openspec/changes/archive/2026-07-21-client-multi-provider-selection/`.

## SDD Cycle Complete

The change was proposed, specified, designed, implemented through approved chained PRs, verified with PASS_WITH_WARNINGS, and archived.
