# Spec: Tech Batch — Images, Categories, Email

## Overview

Batch de 4 items de deuda técnica que agregan funcionalidad faltante en usuario-service y products-service.

---

## Item 1 — Email en listar vendedores

### Requerimiento

El endpoint `GET /api/v1/vendedores/list` (super_admin) debe incluir el email del vendedor en la respuesta.

### Cambios

#### contracts — `packages/contracts/src/dto/user.dto.ts`
```typescript
export interface VendedorResponse {
  id: string;
  nombre: string;
  apellido?: string;
  empresa?: string;
  email?: string;        // ← NUEVO
  telefono?: string;
  ciudad?: string;
  estado?: VendedorEstado;
}
```

#### usuario-service — `vendedores.service.ts`
En `list()`, agregar `include` con `auth_user.email` y mapearlo en la respuesta:
```typescript
// include actual
include: { _count: { select: { clientes: true } } }
// nuevo include
include: {
  auth_user: { select: { email: true } },
  _count: { select: { clientes: true } },
}
```
Mapear `email: vendedor.auth_user.email` en el response.

#### gateway — OpenAPI spec
Agregar `email` al schema de `VendedorResponse` en `openapi-spec.service.ts`.

### Escenarios

- ✅ Super admin lista vendedores → cada item incluye email
- ✅ Vendedor sin email asignado (migración) → email undefined
- ✅ Filtros (estado, search) siguen funcionando sin cambios

---

## Item 2 — CRUD categorías y marcas

### Requerimiento

El vendedor autenticado debe poder crear, actualizar y eliminar sus propias categorías y marcas. Cada vendedor tiene su propio catálogo independiente.

### Endpoints

#### Categorías

| Acción | Método | Endpoint | Auth | Body |
|--------|--------|----------|------|------|
| Listar | GET | `/api/v1/categories/list?vendedorId=` | Público | query |
| Crear | POST | `/api/v1/categories/create` | VENDEDOR | `{ nombre, orden? }` |
| Actualizar | PATCH | `/api/v1/categories/update?id=` | VENDEDOR | `{ nombre?, orden? }` |
| Eliminar | DELETE | `/api/v1/categories/delete?id=` | VENDEDOR | - |

#### Marcas

| Acción | Método | Endpoint | Auth | Body |
|--------|--------|----------|------|------|
| Listar | GET | `/api/v1/brands/list?vendedorId=` | Público | query |
| Crear | POST | `/api/v1/brands/create` | VENDEDOR | `{ nombre }` |
| Actualizar | PATCH | `/api/v1/brands/update?id=` | VENDEDOR | `{ nombre? }` |
| Eliminar | DELETE | `/api/v1/brands/delete?id=` | VENDEDOR | - |

### DTOs

#### `CreateCategoriaDto`
```typescript
@IsString()
@MaxLength(255)
nombre!: string;

@IsOptional()
@IsInt()
orden?: number;
```

#### `UpdateCategoriaDto`
```typescript
@IsOptional()
@IsString()
@MaxLength(255)
nombre?: string;

@IsOptional()
@IsInt()
orden?: number;
```

#### `CreateMarcaDto`
```typescript
@IsString()
@MaxLength(255)
nombre!: string;
```

#### `UpdateMarcaDto`
```typescript
@IsOptional()
@IsString()
@MaxLength(255)
nombre?: string;
```

### TCP Handlers

Agregar en `CategoriesTcpController`:

```typescript
@MessagePattern('categories.create')
async createCategoria(@Payload() payload: TcpPayload) {
  this.payloadAdapter.requireRole(payload, UserRole.VENDEDOR);
  const dto = await this.payloadAdapter.body(payload, CreateCategoriaDto);
  const authUserId = this.payloadAdapter.userId(payload);
  const vendedorId = await this.vendedorResolver.resolveVendedorIdByAuthUserId(authUserId);
  return this.categoriesService.createCategoria(vendedorId, dto);
}
```

Mismo patrón para update, delete, y brands.

### Service

En `CategoriesService`:

```typescript
async createCategoria(vendedorId: string, dto: CreateCategoriaDto) {
  return this.prisma.categoria.create({
    data: { nombre: dto.nombre, orden: dto.orden ?? 0, vendedorId },
  });
}

async updateCategoria(vendedorId: string, id: string, dto: UpdateCategoriaDto) {
  const cat = await this.prisma.categoria.findFirst({
    where: { id, vendedorId },
  });
  if (!cat) throw new NotFoundException('Categoría no encontrada');
  return this.prisma.categoria.update({
    where: { id },
    data: { ...(dto.nombre !== undefined ? { nombre: dto.nombre } : {}),
            ...(dto.orden !== undefined ? { orden: dto.orden } : {}) },
  });
}

async deleteCategoria(vendedorId: string, id: string) {
  const cat = await this.prisma.categoria.findFirst({
    where: { id, vendedorId },
  });
  if (!cat) throw new NotFoundException('Categoría no encontrada');
  await this.prisma.categoria.delete({ where: { id } });
  return { deleted: true };
}
```

Mismo patrón para marcas (sin `orden`).

### Gateway — action registry

```typescript
categories: {
  // ... list existente
  create: { tcpPattern: 'categories.create', transport: 'send', authRequired: true, roles: ['vendedor'] },
  update: { tcpPattern: 'categories.update', transport: 'send', authRequired: true, roles: ['vendedor'] },
  delete: { tcpPattern: 'categories.delete', transport: 'send', authRequired: true, roles: ['vendedor'] },
},
brands: {
  // ... list existente
  create: { tcpPattern: 'brands.create', transport: 'send', authRequired: true, roles: ['vendedor'] },
  update: { tcpPattern: 'brands.update', transport: 'send', authRequired: true, roles: ['vendedor'] },
  delete: { tcpPattern: 'brands.delete', transport: 'send', authRequired: true, roles: ['vendedor'] },
},
```

### Escenarios

- ✅ Vendedor crea categoría → categoría creada con su vendedorId
- ✅ Vendedor actualiza su categoría → solo si le pertenece
- ✅ Vendedor elimina su categoría → solo si no tiene productos asociados (Prisma `onDelete: SetNull` en Producto, se setea a null en productos)
- ❌ Vendedor intenta modificar categoría de otro → NotFound
- ✅ Categorías y marcas son independientes por vendedor

---

## Item 3 — Imágenes de productos

### Requerimiento

El vendedor debe poder subir imágenes para sus productos. El sistema debe convertir la imagen a WebP (formato más eficiente), asignar un nanoid como nombre de archivo, guardar en filesystem y almacenar la ruta en la DB.

### Pipeline de imágenes

```
[cliente] POST /api/v1/upload/product-image (multipart)
    → gateway → products-service
    → sharp: convertir a WebP (quality 80)
    → nanoid: generar nombre único
    → guardar en /app/public/uploads/products/{nanoid}.webp
    → devolver { imageId: "products/{nanoid}.webp" }

[cliente] POST /api/v1/products/create
    Body: { ..., imagen: "products/{nanoid}.webp" }
```

### Upload endpoint

```
POST /api/v1/upload/product-image
Authorization: Bearer <jwt> (VENDEDOR)
Content-Type: multipart/form-data
Body: { file: <imagen> }

Response: { imageId: "products/abc123def.webp" }
```

### Dependencias (products-service)

```json
{
  "sharp": "^0.33.x",
  "nanoid": "^5.x"
}
```

### Configuración

```env
# products-service .env
UPLOAD_DIR=./public/uploads
WEBP_QUALITY=80
MAX_IMAGE_SIZE_MB=5
```

### DB

La columna `Producto.imagen` (`VarChar(500)`) cambia semánticamente:
- **Antes**: guardaba una URL externa (`https://...`)
- **Ahora**: guarda una ruta relativa (`products/{nanoid}.webp`)

No requiere migración de schema (mismo tipo y tamaño).

### Escenarios

- ✅ Vendedor sube imagen JPG → se convierte a WebP, se guarda, devuelve imageId
- ✅ Vendedor sube PNG → se convierte a WebP
- ✅ Crear producto con imageId → se guarda la ruta
- ❌ Archivo > 5MB → rechazar
- ❌ Formato no soportado → rechazar
- ❌ Vendedor no autenticado → 401

---

## Item 4 — Logo de vendedores

### Requerimiento

El vendedor debe poder subir un logo (al registrarse y al actualizar perfil). Mismo pipeline WebP + nanoid.

### Endpoints

#### Upload de logo (nuevo)
```
POST /api/v1/upload/vendor-logo
Authorization: Bearer <jwt> (VENDEDOR)
Content-Type: multipart/form-data
Response: { imageId: "logos/{nanoid}.webp" }
```

#### Registro (logo opcional)
Actualmente el `RegisterDto` no tiene campo `logo`. Se agrega como opcional:
```typescript
@IsOptional()
@IsString()
@MaxLength(500)
logo?: string;
```

El vendedor primero sube el logo → obtiene `imageId` → lo pasa en el registro o en el update de perfil.

#### Update de perfil (ya existe)
`UpdateVendedorProfileDto.logo` ya existe y es opcional. Solo cambia la semántica: ahora recibe un `imageId` en vez de una URL.

### DB

`Vendedor.logo` (`VarChar(500)`) — misma columna, mismo tipo. Cambio semántico únicamente.

### Escenarios

- ✅ Vendedor sube logo → WebP + nanoid + guardado
- ✅ Vendedor registra con logo → logo guardado en su perfil
- ✅ Vendedor actualiza logo → reemplaza
- ❌ Vendedor pendiente intenta subir logo → no puede loguearse (fix de seguridad aplicado)

---

## Pipeline compartido (Items 3 y 4)

Ambos items usan el mismo UploadService:

```typescript
@Injectable()
class UploadService {
  async saveImage(file: Express.Multer.File, subdir: string): Promise<string> {
    // 1. Validar tipo y tamaño
    // 2. sharp().webp({ quality: config.webpQuality })
    // 3. nanoid + extensión .webp
    // 4. fs.writeFileSync(`${uploadDir}/${subdir}/${nanoid}.webp`, buffer)
    // 5. return `${subdir}/${nanoid}.webp`
  }
}
```

El gateway debe exponer los upload endpoints. Dado que el gateway usa TCP para comunicarse con los microservicios y el upload requiere multipart, hay dos opciones:

**Opción recomendada**: Los upload endpoints se manejan directamente en el gateway (con multer) y este guarda el archivo. Luego el gateway devuelve el `imageId`. No requiere enviar binarios por TCP.

**Alternativa**: products-service expone un endpoint HTTP directo (no TCP) para upload.

Propongo Opción 1: gateway maneja upload, convierte con sharp, guarda local, devuelve imageId.

---

## Resumen de archivos a modificar/crear

| Archivo | Acción | Item |
|---------|--------|------|
| `packages/contracts/src/dto/user.dto.ts` | Modificar | 1 |
| `usuario-service/src/vendedores/vendedores.service.ts` | Modificar | 1 |
| `gateway/src/docs/openapi-spec.service.ts` | Modificar | 1, 2, 3, 4 |
| `products-service/src/categories/categories.service.ts` | Modificar | 2 |
| `products-service/src/categories/dto/create-categoria.dto.ts` | Crear | 2 |
| `products-service/src/categories/dto/update-categoria.dto.ts` | Crear | 2 |
| `products-service/src/categories/dto/create-marca.dto.ts` | Crear | 2 |
| `products-service/src/categories/dto/update-marca.dto.ts` | Crear | 2 |
| `products-service/src/tcp/categories-tcp.controller.ts` | Modificar | 2 |
| `gateway/src/actions/action-registry.ts` | Modificar | 2, 3, 4 |
| `products-service/package.json` | Modificar | 3, 4 |
| `products-service/src/common/upload/upload.service.ts` | Crear | 3, 4 |
| `products-service/src/common/upload/upload.module.ts` | Crear | 3, 4 |
| `gateway/src/upload/upload.controller.ts` | Crear | 3, 4 |
| `usuario-service/src/auth/dto/register.dto.ts` | Modificar | 4 |
