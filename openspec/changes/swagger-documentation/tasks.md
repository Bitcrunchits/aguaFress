# Tasks: Swagger Documentation

## Task List

### Batch 1: DTOs — @ApiProperty decorators
- [x] **T1.1** auth/dto/login.dto.ts
- [x] **T1.2** auth/dto/register.dto.ts
- [x] **T1.3** auth/dto/register-vendedor.dto.ts
- [x] **T1.4** auth/dto/refresh-token.dto.ts
- [x] **T1.5** auth/dto/validate-token.dto.ts
- [x] **T1.6** vendedores/dto/list-vendedores.dto.ts
- [x] **T1.7** vendedores/dto/update-vendedor.dto.ts
- [x] **T1.8** vendedores/dto/update-vendedor-profile.dto.ts
- [x] **T1.9** vendedores/dto/change-estado.dto.ts
- [x] **T1.10** clientes/dto/list-clientes.dto.ts
- [x] **T1.11** clientes/dto/update-cliente.dto.ts
- [x] **T1.12** clientes/dto/update-cliente-vendedor.dto.ts
- [x] **T1.13** clientes/dto/reasignar-vendedor.dto.ts
- [x] **T1.14** users/dto/update-profile.dto.ts
- [x] **T1.15** users/dto/address.dto.ts
- [x] **T1.16** super-admin/dto/update-super-admin.dto.ts
- [x] **T1.17** qr-codes/dto/list-qr-codes.dto.ts
- [x] **T1.18** link-invitacion/dto/list-link-invitacion.dto.ts
- [x] **T1.19** audit-log/dto/list-audit-logs.dto.ts

### Batch 2: Auth + Users + SuperAdmin Controllers
- [x] **T2.1** auth/auth.controller.ts
- [x] **T2.2** users/users.controller.ts
- [x] **T2.3** super-admin/super-admin.controller.ts

### Batch 3: Vendedores + Clientes Controllers
- [x] **T3.1** vendedores/vendedores.controller.ts
- [x] **T3.2** vendedores/vendedor-profile.controller.ts
- [x] **T3.3** clientes/clientes.controller.ts
- [x] **T3.4** clientes/cliente-vendedor.controller.ts

### Batch 4: QrCodes + LinkInvitacion + AuditLog Controllers
- [x] **T4.1** qr-codes/qr-codes-vendor.controller.ts
- [x] **T4.2** qr-codes/qr-codes-admin.controller.ts
- [x] **T4.3** link-invitacion/link-invitacion-vendor.controller.ts
- [x] **T4.4** link-invitacion/link-invitacion-admin.controller.ts
- [x] **T4.5** audit-log/audit-log-admin.controller.ts

### Verification
- [x] **T5.1** Build check (npx tsc --noEmit) — ✅ 4 pre-existing errors in spec files only
- [ ] **T5.2** Start server and verify Swagger UI loads at /api/docs
