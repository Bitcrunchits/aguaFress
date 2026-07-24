# Exploration: Swagger Documentation

## Scope

Add `@nestjs/swagger` decorators to all controllers and DTOs in `usuario-service`.

## Controller Inventory

| # | Controller | Route | Auth | Endpoints |
|---|-----------|-------|------|-----------|
| 1 | AuthController | `/api/auth` | Mixed | POST register (Public), POST register/vendedor (Public), POST login (Public), POST refresh (Public), POST validate (Public), POST logout (Protected) |
| 2 | VendedoresController | `/api/vendedores` | SUPER_ADMIN | GET list, GET :id, PATCH :id, PATCH :id/estado |
| 3 | VendedorProfileController | `/api/vendedores/me` | VendedorGuard | GET, PATCH |
| 4 | ClientesController | `/api/clientes` | SUPER_ADMIN | GET list, GET :id, PATCH :id, PATCH :id/reassign |
| 5 | ClienteVendedorController | `/api/clientes/mios` | VendedorGuard | GET list, GET :id, PATCH :id |
| 6 | UsersController | `/api/users` | AuthGuard(jwt) | GET profile, PATCH profile |
| 7 | SuperAdminController | `/api/super-admin` | SUPER_ADMIN | GET me, PATCH me, GET dashboard |
| 8 | QrCodesVendorController | `/api/qr-codes` | VendedorGuard | POST, GET, PATCH :id/deactivate |
| 9 | QrCodesAdminController | `/api/admin/qr-codes` | SUPER_ADMIN | GET, PATCH :id/deactivate |
| 10 | LinkInvitacionVendorController | `/api/link-invitacion` | VendedorGuard | POST, GET, PATCH :id/deactivate |
| 11 | LinkInvitacionAdminController | `/api/admin/link-invitacion` | SUPER_ADMIN | GET, PATCH :id/deactivate |
| 12 | AuditLogAdminController | `/api/admin/audit-logs` | SUPER_ADMIN | GET list |

## DTO Inventory

### Auth
- **LoginDto**: email, password
- **RegisterDto**: email, password, nombre, role, + 15 optional cliente fields
- **RegisterVendedorDto**: email, password, nombre, apellido, dni, telefono, ciudad + optional cuil, cuit, zonaEntrega
- **RefreshTokenDto**: refreshToken
- **ValidateTokenDto**: token

### Vendedores
- **ListVendedoresDto**: page?, limit?, estado?, search?
- **UpdateVendedorDto**: empresa?, telefono?, dni?, cuil?, cuit?, logo?, ciudadDefault?, zonaEntrega?
- **UpdateVendedorProfileDto**: nombre?, apellido?, dni?, cuil?, cuit?, telefono?, empresa?, logo?, ciudadDefault?, zonaEntrega?
- **ChangeEstadoDto**: estado (required), motivo?

### Clientes
- **ListClientesDto**: page?, limit?, vendedorId?, search?
- **UpdateClienteDto**: ~25 fields (nombre, apellido, dni, telefono, tipoFactura, direccion*, entrega*, latitud, longitud)
- **UpdateClienteVendedorDto**: same as UpdateClienteDto
- **ReasignarVendedorDto**: vendedorId (required UUID)

### Users
- **UpdateProfileDto**: nombre?, apellido?, telefono?, tipoFactura?, address?
- **AddressDto**: calle?, numero?, pisoDepto?, referencia?, barrio?, ciudad?, provincia?, codigoPostal?, latitude?, longitude?

### SuperAdmin
- **UpdateSuperAdminProfileDto**: nombre?, apellido?

### QR Codes / LinkInvitacion
- **ListQrCodesDto**: page?, limit?, vendedorId?
- **ListLinkInvitacionDto**: page?, limit?, vendedorId?

### AuditLog
- **ListAuditLogsDto**: page?, limit?, usuarioId?, accion?, targetId?, from?, to?

## Auth Patterns

- `@Public()` decorator → no Bearer token needed
- `@UseGuards(AuthGuard('jwt'))` → Bearer token
- `@UseGuards(RolesGuard)` + `@Roles(UserRole.SUPER_ADMIN)` → Bearer + role
- `@UseGuards(VendedorGuard)` → Bearer + vendedor role
- `@CurrentUser('userId')` → extracts userId from JWT

## Response Patterns

- All success responses return plain objects/arrays (no wrapper)
- Auth returns `{ accessToken, refreshToken, user }` on login/register
- QrCodes create returns `{ qrCode, url, expiresAt }`
- LinkInvitacion create returns `{ linkUrl, token, expiresAt }`
- Pagination endpoints return `{ data: [], meta: { total, page, limit, totalPages } }`
