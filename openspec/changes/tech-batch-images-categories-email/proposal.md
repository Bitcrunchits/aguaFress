# Proposal: Tech Batch — Images, Categories, Email

## Scope

Batch de 4 items de deuda técnica que tocan **usuario-service** y **products-service**.

| # | Item | Servicio | Complejidad |
|---|------|----------|-------------|
| 1 | Email en listar vendedores | usuario-service | 🔵 Baja |
| 2 | CRUD categorías y marcas | products-service | 🟡 Media |
| 3 | Imágenes de productos (WebP + nanoid + storage) | products-service | 🟠 Media-Alta |
| 4 | Logo de vendedores (mismo pipeline que imágenes) | usuario-service | 🟡 Media |

---

## Item 1 — Email en listar vendedores

**Intento**: El endpoint `GET /api/v1/vendedores/list` (rol super_admin) no devuelve el email del vendedor, solo datos básicos (nombre, apellido, empresa, teléfono, estado). El admin no puede identificar al vendedor sin el email.

**Approach**: El patrón ya existe en `getById()` que incluye `auth_user: { select: { email: true } }`. Solo hay que replicarlo en `list()`.

**Cambios necesarios**:
1. `VendedoresService.list()` — agregar `include: { auth_user: { select: { email: true } } }`
2. Mapear `email` en el response
3. `VendedorResponse` (packages/contracts) — agregar `email?: string`
4. OpenAPI spec (gateway) — agregar email al schema de vendedor response

---

## Item 2 — CRUD categorías y marcas

**Intento**: Hoy solo existe listado público de categorías y marcas. El vendedor no tiene forma de crear las suyas propias desde la API. Cada vendedor necesita sus propias categorías (ej: ropa vs fiambres).

**El schema ya soporta per-vendedor** ✅:
```prisma
model Categoria {
  vendedorId String
  @@unique([vendedorId, nombre])
}
model Marca {
  vendedorId String
  @@unique([vendedorId, nombre])
}
```

**Approach**: Agregar métodos CRUD a `CategoriesService` y exponerlos vía TCP/gateway con rol VENDEDOR.

**Endpoints a crear**:

| Endpoint | Método | Auth | Body/Query |
|----------|--------|------|------------|
| `categories/create` | POST | VENDEDOR | `{ nombre, orden }` |
| `categories/update` | PATCH | VENDEDOR | query: `id`; body: `{ nombre?, orden? }` |
| `categories/delete` | DELETE | VENDEDOR | query: `id` |
| `brands/create` | POST | VENDEDOR | `{ nombre }` |
| `brands/update` | PATCH | VENDEDOR | query: `id`; body: `{ nombre? }` |
| `brands/delete` | DELETE | VENDEDOR | query: `id` |

**Nota**: El `vendedorId` se resuelve del JWT (mismo patrón que products.create — nunca viene del body).

**Cambios necesarios**:
1. `CategoriesService` — agregar métodos CRUD
2. DTOs: `CreateCategoriaDto`, `UpdateCategoriaDto`, `CreateMarcaDto`, `UpdateMarcaDto`
3. `CategoriesTcpController` — agregar handlers TCP
4. Gateway `action-registry.ts` — agregar entries
5. OpenAPI spec — schemas + action docs
6. Contracts `products.dto.ts` — agregar interfaces si hace falta

---

## Item 3 — Imágenes de productos (WebP + nanoid + storage)

**Intento**: Hoy `Producto.imagen` guarda una URL de texto. No hay subida de archivos, no hay conversión a formato eficiente, no hay identificador único. Para producción necesitamos manejo real de imágenes.

**Approque**: Agregar pipeline de subida de imágenes que:
1. Reciba el archivo (multipart)
2. Lo convierta a **WebP** (formato más liviano/eficiente)
3. Asigne un **nanoid** como nombre de archivo
4. Lo guarde en el filesystem (directorio `public/uploads/products/`)
5. Guarde la ruta relativa en la DB (`imagen` columna)

**Decisión pendiente** ⚠️ — Storage:
- **Opción A** (recomendada para MVP): Filesystem local + ruta en DB. Simple, rápido, sirve con static serving.
- **Opción B**: Binario en DB (BYTEA/BLOB). Más complejo, DB pesada, backups lentos. No recomendado.

Propongo Opción A. Si después se necesita S3/CDN, es solo cambiar el adapter de storage.

**Dependencias nuevas**: `sharp` (conversión WebP), `nanoid` (ids únicos), `multer` (file upload, ya incluído en NestJS).

**Cambios en DB**: La columna `imagen` pasa de guardar una URL a guardar una ruta relativa tipo `products/abc123.webp`. Misma columna, mismo tipo VARCHAR(500) — solo cambia el contenido semántico.

---

## Item 4 — Logo de vendedores

**Intento**: El campo `Vendedor.logo` ya existe en la DB y en `UpdateVendedorProfileDto`, pero espera una URL de texto. Debe soportar subida real de imagen con el mismo pipeline.

**Approach**: Mismo pipeline que productos — WebP + nanoid + storage compartido.

**Endpoint**: Reutilizar `POST /api/v1/users/profile/update` con el campo `logo`. Agregar un endpoint de upload de logo (multipart) aparte o integrado.

**Storage**: `public/uploads/logos/`

---

## Orden de implementación sugerido

```
Item 1 (email, bajo riesgo, pocos archivos)
    ↓
Item 2 (CRUD, independiente, DTOs + controllers)
    ↓
Item 3 + Item 4 (comparten pipeline de imágenes → hacer juntos)
```

## Decisiones abiertas

1. ⚠️ **Storage de imágenes**: ¿filesystem local o DB binaria? Propongo filesystem + ruta.
2. ⚠️ **Logo en registro**: ¿agregar logo field al registro inicial de vendedor o solo en update de perfil?
3. ⚠️ **Upload endpoint**: ¿endpoint separado de upload de imagen que devuelve el nanoid, o multipart directo en create/update?
