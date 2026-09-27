import { Injectable } from '@nestjs/common';
import { ACTION_REGISTRY, type ActionMapping } from '../actions/action-registry';

// ─── OpenAPI Schema helpers ─────────────────────────────────────

type Schema = Record<string, unknown>;

function str(description?: string, example?: unknown): Schema {
  const s: Schema = { type: 'string' };
  if (description) s.description = description;
  if (example !== undefined) s.example = example;
  return s;
}

function ref($ref: string): Schema {
  return { $ref };
}

function obj(properties: Record<string, Schema>, required?: string[]): Schema {
  const s: Schema = { type: 'object', properties };
  if (required?.length) s.required = required;
  return s;
}

function arr(items: Schema): Schema {
  return { type: 'array', items };
}

function oneOf(...schemas: Schema[]): Schema {
  return { oneOf: schemas };
}

function hasRequiredProperties(schema: Schema): boolean {
  const required = schema.required;
  return Array.isArray(required) && required.length > 0;
}

// ─── Shared Schemas (from @agua/contracts) ──────────────────────

const SHARED_SCHEMAS: Record<string, Schema> = {
  DireccionEntrega: obj({
    calle: str('Calle'),
    numero: str('Número'),
    pisoDepto: str('Piso / Depto'),
    referencia: str('Referencia'),
    barrio: str('Barrio (texto libre, no es ID)'),
    ciudad: str('Ciudad'),
    provincia: str('Provincia'),
    codigoPostal: str('Código postal'),
    latitude: { type: 'number', description: 'Latitud' },
    longitude: { type: 'number', description: 'Longitud' },
  }, ['calle', 'numero', 'ciudad']),

  PaginationRequest: obj({
    page: { type: 'integer', description: 'Número de página' },
    limit: { type: 'integer', description: 'Items por página' },
  }),

  PaginationResponse: obj({
    page: { type: 'integer' },
    limit: { type: 'integer' },
    total: { type: 'integer' },
    totalPages: { type: 'integer' },
  }, ['page', 'limit', 'total', 'totalPages']),

  PaginatedResponse: obj({
    data: { type: 'array', items: {} },
    pagination: ref('#/components/schemas/PaginationResponse'),
  }, ['data', 'pagination']),

  ErrorResponse: obj({
    statusCode: { type: 'integer' },
    message: str(),
    error: str('Error type'),
    details: { description: 'Detalles adicionales' },
  }, ['statusCode', 'message']),

  LoginRequest: obj({
    email: str('Email del usuario', 'vendedor@email.com'),
    password: str('Contraseña', '********'),
  }, ['email', 'password']),

  LoginResponse: obj({
    token: str('JWT access token'),
    refreshToken: str('JWT refresh token'),
    user: ref('#/components/schemas/UserInfo'),
  }, ['token', 'refreshToken', 'user']),

  UserInfo: obj({
    id: str('User ID (UUID)'),
    email: str('Email'),
    role: str('Rol: super_admin | vendedor | cliente'),
    nombre: str('Nombre'),
    apellido: str('Apellido'),
  }, ['id', 'email', 'role']),

  RegisterRequest: obj({
    email: str('Email', 'vendedor@email.com'),
    emailConfirmation: str('Confirmación de email'),
    password: str('Contraseña', '********'),
    nombre: str('Nombre'),
    apellido: str('Apellido'),
    dni: str('DNI (8 numeric digits)', '12345678'),
    telefono: str('Teléfono'),
    ciudad: str('Ciudad'),
    empresa: str('Company or business name (opcional)', 'Distribuidora AguaFress'),
  }, ['email', 'emailConfirmation', 'password', 'nombre', 'apellido', 'dni', 'telefono']),

  RegisterResponse: obj({
    status: str('Siempre "pendiente"', 'pendiente'),
    vendedorId: str('ID del vendedor creado'),
    message: str('Mensaje genérico seguro para evitar enumeración de emails'),
  }, ['status', 'vendedorId', 'message']),

  RefreshTokenRequest: obj({
    refreshToken: str('Refresh token'),
  }, ['refreshToken']),

  RefreshTokenResponse: obj({
    token: str('Nuevo access token'),
  }, ['token']),

  ValidateTokenRequest: obj({
    token: str('JWT token a validar'),
  }, ['token']),

  ValidateTokenResponse: obj({
    valid: { type: 'boolean' },
    user: oneOf(ref('#/components/schemas/UserInfo'), { type: 'null' }),
  }, ['valid', 'user']),

  LogoutResponse: obj({
    message: str('Mensaje de confirmación'),
  }, ['message']),

  ChangePasswordRequest: obj({
    currentPassword: str('Contraseña actual', '********'),
    newPassword: str('Contraseña nueva', '********'),
  }, ['currentPassword', 'newPassword']),

  ChangePasswordResponse: obj({
    message: str('Mensaje de confirmación'),
  }, ['message']),

  AdminGenerateResetTokenRequest: obj({
    userId: str('UUID del usuario a resetear'),
  }, ['userId']),

  AdminGenerateResetTokenResponse: obj({
    resetToken: str('Token de un solo uso (mostrar una vez)'),
    expiresAt: str('ISO 8601 — vence en 30 min'),
  }, ['resetToken', 'expiresAt']),

  ResetPasswordRequest: obj({
    token: str('Token de reset recibido'),
    newPassword: str('Nueva contraseña', '********'),
  }, ['token', 'newPassword']),

  ResetPasswordResponse: obj({
    message: str('Mensaje de confirmación'),
  }, ['message']),

  RegisterClientRequest: obj({
    token: str('Token del link de invitación (requerido para auto-registro)'),
    nombre: str('Nombre'),
    apellido: str('Apellido'),
    email: str('Email', 'cliente@email.com'),
    emailConfirmation: str('Confirmación de email'),
    password: str('Contraseña', '********'),
    telefono: str('Teléfono'),
    dni: str('DNI (7 a 9 dígitos)'),
    direccionEntrega: ref('#/components/schemas/DireccionEntrega'),
  }, ['nombre', 'email', 'emailConfirmation', 'password', 'telefono', 'dni', 'direccionEntrega']),

  RegisterClientResponse: obj({
    token: str('JWT access token'),
    refreshToken: str('JWT refresh token'),
    clienteId: str('ID del cliente creado'),
  }, ['token', 'refreshToken', 'clienteId']),

  UserProfile: obj({
    id: str('User ID'),
    email: str('Email'),
    nombre: str('Nombre'),
    apellido: str('Apellido'),
    role: str('Rol'),
    telefono: str('Teléfono'),
    isActive: { type: 'boolean' },
    profile: oneOf(ref('#/components/schemas/VendedorProfile'), ref('#/components/schemas/ClienteProfile')),
  }, ['id', 'email', 'role', 'isActive']),

  VendedorProfile: obj({
    nombre: str(),
    apellido: str(),
    empresa: str('Nombre de empresa'),
    logo: str('URL del logo'),
    estado: str('Estado: pendiente | activo | inactivo | bloqueado'),
    qrCode: str('Código QR'),
    linkPublico: str('Link público'),
    ciudadDefault: str('Ciudad por defecto'),
    zonaEntrega: str('Zona de entrega'),
  }),

  ClienteProfile: obj({
    nombre: str(),
    apellido: str(),
    telefono: str(),
    dni: str('DNI'),
    tipoFactura: str('Tipo factura: A | B | C'),
    direccionFacturacion: str('Dirección de facturación'),
    direccionEntrega: ref('#/components/schemas/DireccionEntrega'),
  }),

  UpdateProfileRequest: obj({
    nombre: str(),
    apellido: str(),
    telefono: str(),
  }),

  VendedorListItem: obj({
    id: str('Vendedor ID'),
    nombre: str(),
    apellido: str(),
    empresa: str(),
    email: str(),
    telefono: str(),
    ciudad: str(),
    estado: str('Estado del vendedor'),
    createdAt: str('ISO 8601'),
  }, ['id', 'nombre', 'email', 'estado', 'createdAt']),

  UpdateVendedorRequest: obj({
    nombre: str('Nombre'),
    apellido: str('Apellido'),
    empresa: str('Nombre del emprendimiento'),
    telefono: str('Teléfono'),
    dni: str('DNI (8 dígitos)'),
    cuil: str('CUIL'),
    cuit: str('CUIT'),
    logo: str('URL del logo'),
    ciudadDefault: str('Ciudad/localidad principal'),
    zonaEntrega: str('Zona/sector de entrega'),
  }),

  UpdateVendedorProfileRequest: obj({
    nombre: str('Nombre'),
    apellido: str('Apellido'),
    dni: str('DNI (8 dígitos)'),
    cuil: str('CUIL'),
    cuit: str('CUIT'),
    telefono: str('Teléfono'),
    empresa: str('Nombre del emprendimiento'),
    logo: str('URL del logo'),
    ciudadDefault: str('Ciudad/localidad principal'),
    zonaEntrega: str('Zona/sector de entrega'),
  }),

  ChangeEstadoRequest: obj({
    estado: str('Nuevo estado: activo | inactivo | bloqueado'),
  }, ['estado']),

  SuperAdminProfile: obj({
    id: str(),
    email: str(),
    nombre: str(),
    apellido: str(),
    telefono: str(),
  }, ['id', 'email']),

  UpdateSuperAdminRequest: obj({
    nombre: str(),
    apellido: str(),
    telefono: str(),
  }),

  ClienteListItem: obj({
    id: str('Cliente ID'),
    nombre: str(),
    apellido: str(),
    email: str(),
    telefono: str(),
    tipoFactura: str('Tipo factura'),
    vendedorAsignado: str('Nombre del vendedor asignado'),
    createdAt: str('ISO 8601'),
  }, ['id', 'nombre', 'email', 'createdAt']),

  UpdateClienteRequest: obj({
    nombre: str(),
    apellido: str(),
    telefono: str(),
    tipoFactura: str('A | B | C'),
  }),

  ReasignarVendedorRequest: obj({
    vendedorId: str('ID del nuevo vendedor'),
  }, ['vendedorId']),

  ClienteProviderResponse: obj({
    id: str('Domain VENDEDOR.id selected by the cliente'),
    nombre: str(),
    apellido: str(),
    empresa: str(),
    logo: str('URL del logo'),
    telefono: str(),
    ciudad: str(),
    isDefault: { type: 'boolean', description: 'Matches CLIENTE.vendedor_id default/V1 compatibility pointer' },
  }, ['id', 'nombre', 'isDefault']),

  ClienteProvidersResponse: obj({
    providers: arr(ref('#/components/schemas/ClienteProviderResponse')),
    defaultVendedorId: str('Default provider pointer when still active'),
    requiresSelection: { type: 'boolean', description: 'True when mobile must ask the cliente to choose a provider' },
  }, ['providers', 'requiresSelection']),

  SelectClienteProviderRequest: obj({
    vendedorId: str('Domain VENDEDOR.id selected by the cliente; never an auth userId'),
  }, ['vendedorId']),

  SelectClienteProviderResponse: obj({
    selectedProvider: ref('#/components/schemas/ClienteProviderResponse'),
  }, ['selectedProvider']),

  AddClienteProviderRequest: obj({
    clienteId: str('Domain CLIENTE.id to link'),
    vendedorId: str('Domain VENDEDOR.id to add as active provider'),
    makeDefault: { type: 'boolean', description: 'When true, also updates CLIENTE.vendedor_id default pointer' },
  }, ['clienteId', 'vendedorId']),

  CartResponse: obj({
    cartId: str('Cart ID'),
    vendedorId: str('Selected provider scope'),
    items: arr({ type: 'object' }),
  }, ['cartId', 'items']),

  CartItemMutationRequest: obj({
    vendedorId: str('Selected provider scope validated against active RELACION_CARTERA'),
    productoId: str('Product ID'),
    cantidad: { type: 'integer', description: 'Item quantity' },
  }, ['vendedorId', 'productoId']),

  CreateOrderRequest: obj({
    vendedorId: str('Selected provider scope validated before enqueue'),
    metodoPago: str('Único método de pago aceptado en el MVP', 'contra_entrega'),
    direccion: ref('#/components/schemas/DireccionEntrega'),
    observaciones: str('Optional notes'),
  }, ['vendedorId', 'metodoPago', 'direccion']),

  AsyncAcceptedResponse: obj({
    jobId: str('Async job ID'),
    trackingId: str('Tracking ID'),
    vendedorId: str('Selected provider scope'),
    status: str('PENDING'),
    statusUrl: str('Polling URL'),
    acceptedAt: str('ISO 8601'),
  }, ['jobId', 'trackingId', 'vendedorId', 'status', 'statusUrl', 'acceptedAt']),

  UpdateClienteVendedorRequest: obj({
    nombre: str(),
    apellido: str(),
    telefono: str(),
    direccionEntrega: ref('#/components/schemas/DireccionEntrega'),
  }),

  QRCodeItem: obj({
    id: str(),
    codigo: str('Código QR único'),
    activo: { type: 'boolean' },
    expiresAt: str('ISO 8601'),
    createdAt: str('ISO 8601'),
  }, ['id', 'codigo', 'activo', 'expiresAt', 'createdAt']),

  CreateQRResponse: obj({
    qrCode: str('Imagen QR en Base64'),
    url: str('URL pública'),
    expiresAt: str('ISO 8601'),
  }, ['qrCode', 'url', 'expiresAt']),

  LinkInvitacionItem: obj({
    id: str(),
    token: str('Token único'),
    activo: { type: 'boolean' },
    expiresAt: str('ISO 8601'),
    createdAt: str('ISO 8601'),
  }, ['id', 'token', 'activo', 'expiresAt', 'createdAt']),

  CreateLinkResponse: obj({
    linkUrl: str('URL pública'),
    token: str('Token'),
    expiresAt: str('ISO 8601'),
  }, ['linkUrl', 'token', 'expiresAt']),

  AuditLogItem: obj({
    id: str(),
    action: str('Acción realizada'),
    userId: str(),
    email: str(),
    metadata: { type: 'object', description: 'Datos adicionales' },
    createdAt: str('ISO 8601'),
  }, ['id', 'action', 'createdAt']),

  SuperAdminDashboard: obj({
    totalVendedores: { type: 'integer' },
    pendientes: { type: 'integer' },
    activos: { type: 'integer' },
    totalClientes: { type: 'integer' },
    ultimosRegistros: arr(ref('#/components/schemas/VendedorListItem')),
  }, ['totalVendedores', 'pendientes', 'activos', 'totalClientes']),

  // ─── Productos ───────────────────────────────────────────────────

  ProductResponse: obj({
    id: str('Product ID'),
    nombre: str('Nombre del producto'),
    descripcion: str('Descripción'),
    precioSinIva: { type: 'number', description: 'Precio sin IVA' },
    porcentajeIva: { type: 'number', description: 'Porcentaje de IVA aplicado (default 21)' },
    porcentajeImpuestos: { type: 'number', description: 'Porcentaje de impuestos adicionales (IIBB, municipales, default 0)' },
    costoIva: { type: 'number', description: 'Monto del IVA en pesos' },
    costoImpuestos: { type: 'number', description: 'Monto de impuestos adicionales en pesos' },
    precioFinal: { type: 'number', description: 'Precio final con IVA + impuestos' },
    imagen: str('URL de imagen'),
    stock: { type: 'integer', description: 'Stock disponible' },
    marca: str('Nombre de la marca'),
    categoria: str('Nombre de la categoría'),
    vendedorId: str('ID del vendedor'),
    activo: { type: 'boolean', description: 'Producto activo' },
    mostrarPrecio: { type: 'boolean', description: 'Mostrar precio al cliente' },
  }, ['id', 'nombre', 'precioSinIva', 'porcentajeIva', 'porcentajeImpuestos', 'costoIva', 'costoImpuestos', 'precioFinal', 'stock', 'vendedorId', 'activo']),

  CreateProductRequest: obj({
    nombre: str('Nombre del producto'),
    descripcion: str('Descripción'),
    precioSinIva: { type: 'number', description: 'Monto SIN IVA — el service calcula precioFinal automáticamente' },
    porcentajeIva: { type: 'number', description: 'Porcentaje de IVA (default 21, opcional)' },
    porcentajeImpuestos: { type: 'number', description: 'Porcentaje de impuestos adicionales (default 0, opcional)' },
    categoriaId: str('ID de la categoría (UUID)'),
    marcaId: str('ID de la marca (UUID, opcional)'),
    imagen: str('URL de imagen'),
    stock: { type: 'integer', description: 'Stock inicial' },
    mostrarPrecio: { type: 'boolean', description: 'Mostrar precio al cliente (default true)' },
  }, ['nombre', 'precioSinIva', 'categoriaId', 'stock']),

  UpdateProductRequest: obj({
    nombre: str('Nombre del producto'),
    descripcion: str('Descripción'),
    precioSinIva: { type: 'number', description: 'Monto SIN IVA' },
    porcentajeIva: { type: 'number', description: 'Porcentaje de IVA' },
    porcentajeImpuestos: { type: 'number', description: 'Porcentaje de impuestos adicionales' },
    stock: { type: 'integer', description: 'Stock' },
    imagen: str('URL de imagen'),
    activo: { type: 'boolean', description: 'Activar/desactivar producto' },
    mostrarPrecio: { type: 'boolean', description: 'Mostrar precio al cliente' },
    categoriaId: str('ID de la categoría (UUID)'),
    marcaId: str('ID de la marca (UUID)'),
  }),

  ProductCreatedResponse: obj({
    id: str('ID del producto creado'),
    created: { type: 'boolean' },
  }, ['id', 'created']),

  ProductDeletedResponse: obj({
    deleted: { type: 'boolean' },
  }, ['deleted']),

  DeactivatedResponse: obj({
    deactivated: { type: 'boolean', description: 'Siempre true — la baja es lógica (activo: false) y la fila no se elimina', example: true },
  }, ['deactivated']),

  CategoriaResponse: obj({
    id: str('Categoría ID'),
    nombre: str('Nombre'),
    orden: { type: 'integer', description: 'Orden de visualización' },
    vendedorId: str('ID del vendedor'),
  }, ['id', 'nombre', 'vendedorId']),

  CreateCategoriaRequest: obj({
    nombre: str('Nombre de la categoría'),
  }, ['nombre']),

  UpdateCategoriaRequest: obj({
    nombre: str('Nombre de la categoría'),
    orden: { type: 'integer', description: 'Orden de visualización' },
  }),

  MarcaResponse: obj({
    id: str('Marca ID'),
    nombre: str('Nombre'),
    vendedorId: str('ID del vendedor'),
  }, ['id', 'nombre', 'vendedorId']),

  CreateMarcaRequest: obj({
    nombre: str('Nombre de la marca'),
  }, ['nombre']),

  UpdateMarcaRequest: obj({
    nombre: str('Nombre de la marca'),
  }),

  // ─── Pedidos ────────────────────────────────────────────────────

  OrderItemResponse: obj({
    productId: str('ID del producto (PRODUCTO.id). Es el `id` que devuelve products.create o products.list'),
    nombre: str('Nombre del producto, copiado al momento de crear el pedido'),
    cantidad: { type: 'integer', description: 'Unidades contratadas' },
    precioUnitario: { type: 'number', description: 'Precio unitario sin IVA, congelado al crear el pedido' },
  }, ['productId', 'nombre', 'cantidad', 'precioUnitario']),

  OrderResponse: obj({
    id: str('ID del pedido (ORDER.id, UUID). Es el `id` que exigen orders/get-by-id, orders/status-update, orders/cancel y orders/confirm'),
    pedidoNumero: str('Número de pedido legible, único por vendedor'),
    clienteId: str('AUTH_USER.id del cliente (el `sub` del JWT), NO CLIENTE.id'),
    vendedorId: str('ID del perfil del vendedor (VENDEDOR.id) que atiende el pedido'),
    items: arr(ref('#/components/schemas/OrderItemResponse')),
    totalSinIva: { type: 'number', description: 'Total sin IVA' },
    iva: { type: 'number', description: 'Monto del IVA' },
    total: { type: 'number', description: 'Total a cobrar' },
    estado: str('Estado del pedido: pendiente | confirmado | en_camino | entregado | cancelado | vencido'),
    metodoPago: str('Método de pago. En el MVP solo se acepta contra_entrega', 'contra_entrega'),
    direccion: ref('#/components/schemas/DireccionEntrega'),
    observaciones: str('Notas opcionales del cliente'),
    createdAt: str('ISO 8601'),
    updatedAt: str('ISO 8601'),
  }, ['id', 'pedidoNumero', 'clienteId', 'vendedorId', 'items', 'totalSinIva', 'iva', 'total', 'estado', 'metodoPago', 'direccion', 'createdAt', 'updatedAt']),

  UpdateOrderStatusRequest: obj({
    id: str('ID del pedido (ORDER.id). Es el `id` de cada elemento devuelto por orders/list'),
    estado: str('Nuevo estado: pendiente | confirmado | en_camino | entregado | cancelado | vencido. El servicio rechaza transiciones inválidas'),
    notas: str('Nota interna opcional'),
  }, ['id', 'estado']),

  CancelOrderRequest: obj({
    id: str('ID del pedido (ORDER.id). Es el `id` de cada elemento devuelto por orders/list'),
    motivo: str('Motivo opcional de la cancelación'),
  }, ['id']),

  ConfirmOrderRequest: obj({
    id: str('ID del pedido (ORDER.id). Es el `id` de cada elemento devuelto por orders/list'),
  }, ['id']),

  OrderJobStatusResponse: obj({
    jobId: str('ID interno del comando asíncrono'),
    trackingId: str('Identificador del comando, con forma de UUID. Es el `id` que espera orders/job-status'),
    clienteId: str('AUTH_USER.id del cliente (el `sub` del JWT), NO CLIENTE.id'),
    idempotencyKey: str('Clave de idempotencia enviada en el header `Idempotency-Key` al crear el pedido'),
    vendedorId: str('ID del perfil del vendedor (VENDEDOR.id) que atiende el pedido'),
    status: str('Estado del comando: PENDING | PROCESSING | RETRYING | COMPLETED | FAILED | DEAD_LETTER'),
    orderId: str('ID del pedido (ORDER.id) una vez que el comando termina bien'),
    errorCode: str('Código de error, solo si el comando falló'),
    errorMessage: str('Mensaje de error, solo si el comando falló'),
    attempts: { type: 'integer', description: 'Intentos ejecutados hasta ahora' },
    createdAt: str('ISO 8601'),
    updatedAt: str('ISO 8601'),
  }, ['jobId', 'trackingId', 'clienteId', 'idempotencyKey', 'status', 'attempts', 'createdAt', 'updatedAt']),
};

// ─── Action → HTTP method mapping ──────────────────────────────

type HttpMethod = 'get' | 'post' | 'patch' | 'delete';

const API_DESCRIPTION = `AguaFress API Gateway expone el contrato HTTP operativo para autenticación, perfiles de usuario, vendedores, clientes, catálogo, carritos, pedidos, entregas y flujos de auditoría. El gateway es la entrada pública; los microservicios aguas abajo quedan detrás de TCP/colas.

> **Autenticación persistente**: la doc usa Scalar con \`persistAuth\` activado, por lo que el token JWT queda guardado entre recargas y navegación. Alcanza con pegarlo una vez por rol (super_admin, vendedor o cliente); no hace falta volver a pegarlo en cada endpoint.

## Inicio rápido en Scalar
1. Llamar a \`POST /api/v1/auth/login\` con un usuario seed local.
2. Copiar \`token\` de \`LoginResponse\`.
3. Usar Authorize de Scalar con el security scheme \`bearerAuth\`. Pegar solo el valor del JWT; Scalar envía \`Authorization: Bearer <token>\`.
4. Verificar la sesión con \`GET /api/v1/users/profile\`.

## Recetas para probar en Scalar
Recetas copiables de punta a punta. Cada \`<...>\` es un valor que copiás de la respuesta del paso anterior.

### Receta 1 — Vendedor: crear y desactivar una categoría
1. \`POST /api/v1/auth/login\` con \`{"email":"vendedor@email.com","password":"admin123"}\` y copiá el campo \`token\`.
2. En el botón **Authorize** de Scalar, elegí \`bearerAuth\` y pegá **solo** el token, sin la palabra \`Bearer \`.
3. \`POST /api/v1/categories/create\` con \`{"nombre":"QA-Prueba"}\`. La respuesta trae **dos** ids: \`id\` (esta categoría) y \`vendedorId\` (tu perfil de vendedor). Copiá los dos.
4. \`DELETE /api/v1/categories/delete?id=<el id del paso 3>\` con el query pegado con \`?\` y \`=\`. Responde \`{"deactivated":true}\`.
5. Repetí con \`POST /api/v1/brands/create\` \`{"nombre":"QA-Marca"}\` y \`DELETE /api/v1/brands/delete?id=<id de la marca>\`.

> Los dos errores más frecuentes en esta receta: mandar \`/delete/<id>\` en vez de \`/delete?id=<id>\`, y mandar el \`vendedorId\` en el \`id\`. El \`vendedorId\` **no se envía** en create/update/delete: el servicio lo resuelve del token.

### Receta 2 — Conseguir tu \`vendedorId\`
En orden de rapidez:
1. \`POST /api/v1/categories/create\` y leé el \`vendedorId\` de la respuesta. Es el camino más corto.
2. \`GET /api/v1/products/list\` y tomá el \`vendedorId\` de cualquier producto.
3. \`GET /api/v1/products/search\` y tomá el \`vendedorId\` de un resultado.

Nunca es el \`sub\` del JWT, ese valor no se envía en ningún query.

### Receta 3 — Listar el catálogo del vendedor
Con el \`vendedorId\` de la receta 2:
- \`GET /api/v1/categories/list?vendedorId=<vendedorId>\`
- \`GET /api/v1/brands/list?vendedorId=<vendedorId>\`
- \`GET /api/v1/products/list?vendedorId=<vendedorId>&categoriaId=<id de categoría>\` — el filtro es \`categoriaId\`, no \`categoria\`.

### Receta 4 — Cliente: crear un pedido y seguirlo
No hay usuario cliente seed, así que el paso 1 crea el cliente. Hacé esta receta **antes** de loguearte como vendedor, o guardá el \`token\` del paso 1 para volver atrás.

1. Autorizá como \`vendedor@email.com\` y llamá a \`POST /api/v1/auth/register-client-by-vendor\` con los datos del cliente. La respuesta trae el \`token\` del cliente ya listo: **no necesitás un segundo login**.
2. Pasá a la pestaña **Auth** de Scalar y autorizá con ese \`token\` de cliente.
3. \`GET /api/v1/clientes/providers\` y copiá el \`id\` de un proveedor: ese es el \`vendedorId\` del pedido.
4. \`POST /api/v1/orders/create\` — **obligatorio** el header \`Idempotency-Key\` con un valor único (por ejemplo \`qa-pedido-001\`), y el body del ejemplo ya trae \`vendedorId\`, \`metodoPago\` y \`direccion\`. Sin ese header el gateway responde \`Idempotency key is required\`.
5. La respuesta \`202\` trae el \`trackingId\`, no el pedido.
6. \`GET /api/v1/orders/job-status?id=<trackingId>\` — acá el parámetro \`id\` es el **\`trackingId\`** del paso 5, no el id del pedido.
7. \`GET /api/v1/orders/list\` para ver los pedidos del rol con el que autorizaste.

### Receta 5 — Super admin
1. \`POST /api/v1/auth/login\` con \`{"email":"admin@aguafress.com","password":"admin123"}\`.
2. \`GET /api/v1/vendedores/list\` para ver vendedores y sus estados.
3. \`PATCH /api/v1/vendedores/change-estado/<id>\` con \`{"estado":"aprobado"}\`. Este id va en el **path**, no en la query.

## Errores frecuentes y qué significan
| Error | Causa real | Cómo resolverlo |
| --- | --- | --- |
| \`{"statusCode":400,"message":["id must be a UUID"],"error":"Bad Request"}\` | El \`id\` falta, no es un UUID, **o no es un UUID v4**. Los DTO validan con \`@IsUUID()\`, que acá solo acepta versión 4 | Pegá el \`id\` que devolvió el \`create\` o el \`list\` de esa misma familia. Un id con versión distinta de 4 se rechaza igual |
| \`{"statusCode":400,"message":["vendedorId must be a UUID"]}\` | Mismo caso, pero en el \`vendedorId\` de un query de listado | Usá el \`vendedorId\` de la receta 2 |
| \`{"statusCode":404,"message":"Categoría no encontrada"}\` | El id es un v4 válido pero no existe, o no pertenece al vendedor del token | Verificá el id contra el listado del vendedor: el servicio valida pertenencia |
| \`Invalid entity ID in URL path\` | Mandaste \`vendedorId=...\` o un \`id=\` dentro del path en vez del query | Las acciones de catálogo y pedidos llevan el id por query: \`?id=<uuid>\` |
| \`Idempotency key is required\` | Falta el header \`Idempotency-Key\` en \`orders.create\` | Agregá el header con un valor único por comando |
| \`Invalid credentials\` | Email o contraseña incorrectos | Usá un email de la tabla de credenciales de arriba; verificá con \`SELECT email FROM "AUTH_USER"\` |
| \`Insufficient role for TCP handler\` / \`403\` | El token es de un rol que no puede hacer la acción | Los endpoints declaran \`super_admin\`, \`vendedor\` o \`cliente\`; cambiá la sesión |
| \`Too Many Requests\` / \`429\` | Rate limit del gateway | Esperá la ventana o cambiá de usuario |

Cuando el DTO de un body y un query fallan juntos, el array \`message\` trae **todos** los errores de una vez: corregí el array completo en un solo intento.

## Autenticación y roles
Los endpoints protegidos declaran \`bearerAuth\` y requieren un JWT. Los endpoints restringidos por rol indican \`super_admin\`, \`vendedor\` o \`cliente\` en la descripción de la operación. La identidad sale del JWT; no enviar \`userId\` en el body de las requests.

## Formas de respuesta
Las operaciones exitosas devuelven el DTO documentado directamente. Las listas paginadas devuelven \`{ data, pagination }\`. Los comandos asíncronos devuelven datos de seguimiento como \`jobId\`, \`trackingId\`, \`status\` y \`statusUrl\`. Los errores usan \`ErrorResponse\` con \`statusCode\`, \`message\`, \`error\` opcional y \`details\` opcional.

## Credenciales seed de dev/demo local
Solo para el entorno local con Docker. Nunca reutilizarlas en producción. Los seeds viven en \`docker/init-db/*.sql\` y todos los usuarios que crean usan la contraseña \`admin123\`.

| Rol | Email | Contraseña |
| --- | --- | --- |
| super_admin | \`admin@aguafress.com\` | \`admin123\` |
| vendedor | \`vendedor@email.com\` | \`admin123\` |
| vendedor | \`vendedor2@email.com\` | \`admin123\` |
| vendedor | \`vendedor3@email.com\` | \`admin123\` |

> **No hay usuario cliente seed.** Los cuatro anteriores son \`super_admin\` y \`vendedor\`. Para probar el flujo de cliente creá uno con \`POST /api/v1/auth/register-client-by-vendor\` (autorizado como \`vendedor\`) y usá el \`token\` que devuelve esa respuesta.
>
> El seed \`docker/init-db/seed-admin.sql\` además intenta crear \`juan@aguafress.com\` y \`maria@aguafress.com\`, pero solo si no existen: en una base ya poblada por registro vía API esas cuentas nunca se crean y esos emails no sirven para iniciar sesión. Verificá contra \`SELECT email FROM "AUTH_USER"\` si dudás.

## Flujos principales por actor
1. Super admin: login, revisar dashboard, aprobar/gestionar vendedores, inspeccionar logs de auditoría.
2. Vendedor: login, mantener perfil, gestionar catálogo, links QR/invitación, clientes, entregas y ciclo de vida de pedidos.
3. Cliente: login o registro por invitación, seleccionar proveedor, explorar catálogo, gestionar carrito, crear pedidos y seguir el estado asíncrono.

## Patrón de rutas
Todas las acciones del gateway usan \`/api/v1/{service}/{action}\`, con el detalle de que algunas aceptan un id como último segmento de la ruta. Cada operación documenta si su id va por query o por path; por ejemplo \`GET /api/v1/products/get?id=<uuid>\` lo lleva por query y \`GET /api/v1/vendedores/get-by-id/<uuid>\` por path.

## Los tres ids y de dónde sale cada uno
La API maneja tres identificadores distintos y ninguno reemplaza a otro. Confundirlos produce \`id must be a UUID\` o \`Entidad no encontrada\`.

| Id | Qué es | Dónde obtenerlo | Dónde NO se usa |
| --- | --- | --- | --- |
| \`sub\` (JWT) | \`AUTH_USER.id\` del usuario autenticado. El gateway lo inyecta desde el token y borra cualquier \`userId\` que venga en el body | El propio token; \`GET /api/v1/users/profile\` devuelve \`id\` | Nunca se envía como parámetro de query ni de path |
| \`vendedorId\` | \`VENDEDOR.id\`: el **perfil de dominio** del vendedor, usado para las comprobaciones de pertenencia del catálogo | \`vendedorId\` de cada producto en \`GET /api/v1/products/list\`; \`vendedorId\` de \`RegisterResponse\`; \`id\` de \`VendedorListItem\`; para clientes, \`providers[].id\` de \`GET /api/v1/clientes/providers\` | No es el \`sub\` del JWT. En \`products.create/update/delete\` y \`categories.create/update/delete\` y \`brands.create/update/delete\` **no se envía**: el servicio lo resuelve desde el token |
| \`id\` de entidad | La fila concreta: \`CATEGORIA.id\`, \`MARCA.id\`, \`PRODUCTO.id\`, \`ORDER.id\`, \`CLIENTE.id\`, \`QR_CODE.id\`, \`LINK_INVITACION.id\` | El \`id\` devuelto por el \`create\` o el \`list\` de esa misma familia | No es un \`AUTH_USER.id\` ni un \`VENDEDOR.id\` salvo que la operación lo diga explícitamente |

## Regla de URL: \`?id=<uuid>\` contra \`/<uuid>\`
Las dos formas de pasar un id **no son intercambiables**; cada operación declara la suya:

| Forma | Cómo se invoca | Operaciones que la usan |
| --- | --- | --- |
| Query string | \`GET /api/v1/products/get?id=<uuid>\` | products.get/update/delete, categories.update/delete, brands.update/delete, orders.get-by-id, orders.job-status |
| Path | \`GET /api/v1/vendedores/get-by-id/<uuid>\` | vendedores.get_by_id, vendedores.change_estado, clientes.get_by_id, clientes.update, clientes.reassign, clientes.own_*, qr.*/deactivate, link_invitacion.*/deactivate |

Un id en la ruta que no sea un UUID se rechaza con \`Invalid entity ID in URL path\` antes de llegar al microservicio. Enviar un \`vendedorId\` donde se espera el \`id\` de la entidad produce \`id must be a UUID\` o \`Entidad no encontrada\`.

## Bajas lógicas de catálogo
\`categories.delete\` y \`brands.delete\` no borran la fila: la marcan con \`activo: false\` y responden \`{ "deactivated": true }\`. La categoría o marca desaparece de \`categories.list\` y \`brands.list\` (que solo listan \`activo: true\`), pero los productos que la referencian **no se modifican**: siguen apuntando al mismo \`categoriaId\`/\`marcaId\`. El catálogo normal oculta productos vinculados a categorías o marcas inactivas para no mostrar taxonomía invisible; \`super_admin\` conserva vista completa para auditoría.

Un vendedor puede restaurar una categoría o marca con \`categories.reactivate\` / \`brands.reactivate\`. Un \`super_admin\` puede auditar categorías inactivas con \`GET /api/v1/categories/list-inactive\`; los demás roles no ven ese inventario inactivo. La base usa índices únicos parciales sobre filas activas, así que una fila inactiva no bloquea crear otra activa con el mismo nombre. El \`onDelete: SetNull\` de la base solo se aplicaría a un borrado físico, que estas acciones no hacen.`;

function inferMethod(action: string, actionName: string): HttpMethod {
  // Explicit method from action registry
  if (actionName.startsWith('create') || actionName.startsWith('register')) return 'post';
  if (actionName.startsWith('login') || actionName.startsWith('refresh') || actionName.startsWith('validate')) return 'post';
  if (actionName.startsWith('update') || actionName.startsWith('change') || actionName.startsWith('deactivate') || actionName.startsWith('reassign')) return 'patch';
  return 'get';
}

// ─── Action documentation metadata ─────────────────────────────

interface ActionDoc {
  summary: string;
  description?: string;
  method: HttpMethod;
  pathParams?: string[];
  queryParams?: string[];
  /** Query params accepted but not universally required for every role. */
  optionalQueryParams?: string[];
  /** Required request headers, rendered as `in: 'header'` parameters. */
  headerParams?: string[];
  /** Real description per parameter, keyed by parameter name. Overrides DEFAULT_PARAM_DOCS. */
  paramDocs?: Record<string, string>;
  /** Runnable payload emitted as requestBody.content['application/json'].example. */
  bodyExample?: Record<string, unknown>;
  bodySchema?: string;
  responseSchema: string;
  isArray?: boolean;
  paginated?: boolean;
  roles?: string[];
}

// ─── Parameter descriptions (three-id model) ────────────────────
// Every parameter must state which id it expects and where the caller
// reads that value from. See the "Los tres ids" section in API_DESCRIPTION.

const NOT_AUTH_USER_ID = 'No es el `sub` del JWT (AUTH_USER.id).';

const PAGE_PARAM_DOC = 'Número de página. Empieza en 1.';
const LIMIT_PARAM_DOC = 'Cantidad máxima de elementos por página.';

const VENDEDOR_PROFILE_ID_PARAM_DOC =
  'ID del perfil del vendedor (VENDEDOR.id). ' + NOT_AUTH_USER_ID +
  ' Aparece como `vendedorId` en cada producto de `GET /api/v1/products/list`.';

const CATALOG_VENDEDOR_ID_PARAM_DOC =
  'ID del perfil del vendedor (VENDEDOR.id) cuyo catálogo se lista. ' + NOT_AUTH_USER_ID +
  ' Obligatorio en llamadas anónimas. Con rol `vendedor` se puede omitir: el servicio lo resuelve' +
  ' desde el token y rechaza cualquier valor que no sea el propio.';

const PROVIDER_VENDEDOR_ID_PARAM_DOC =
  'Proveedor seleccionado (VENDEDOR.id) cuya cartera se opera. ' + NOT_AUTH_USER_ID +
  ' Se obtiene de `providers[].id` o de `defaultVendedorId` en `GET /api/v1/clientes/providers`.';

const CATEGORY_ID_PARAM_DOC =
  'ID de la categoría (CATEGORIA.id, UUID). Es el `id` que devuelve `POST /api/v1/categories/create`' +
  ' o cada elemento de `GET /api/v1/categories/list`. No es un VENDEDOR.id ni el `sub` del JWT.';

const BRAND_ID_PARAM_DOC =
  'ID de la marca (MARCA.id, UUID). Es el `id` que devuelve `POST /api/v1/brands/create`' +
  ' o cada elemento de `GET /api/v1/brands/list`. No es un VENDEDOR.id ni el `sub` del JWT.';

const PRODUCT_ID_PARAM_DOC =
  'ID del producto (PRODUCTO.id, UUID). Es el `id` que devuelve `POST /api/v1/products/create`' +
  ' o cada elemento de `GET /api/v1/products/list`.';

const ORDER_ID_PARAM_DOC =
  'ID del pedido (ORDER.id, UUID). Es el campo `id` de cada elemento de `GET /api/v1/orders/list`' +
  ' y de la respuesta de `POST /api/v1/orders/create`. No es un VENDEDOR.id ni el `sub` del JWT.';

const ORDER_TRACKING_ID_PARAM_DOC =
  'Identificador del comando asíncrono (`trackingId`), con forma de UUID. Es el `trackingId` devuelto' +
  ' por `POST /api/v1/orders/create`, NO el `id` del pedido. Solo `super_admin` y el cliente dueño' +
  ' del pedido pueden consultarlo.';

const VENDEDOR_ROW_ID_PARAM_DOC =
  'ID del perfil del vendedor (VENDEDOR.id). ' + NOT_AUTH_USER_ID +
  ' Es el `id` de cada elemento de `GET /api/v1/vendedores/list`.';

const CLIENTE_ROW_ID_PARAM_DOC =
  'ID del perfil del cliente (CLIENTE.id). ' + NOT_AUTH_USER_ID +
  ' Es el `id` de cada elemento de `GET /api/v1/clientes/list` o `GET /api/v1/clientes/cartera`.';

const QR_ROW_ID_PARAM_DOC =
  'ID del código QR (QR_CODE.id). Es el `id` de cada elemento de `GET /api/v1/qr/vendor/list`' +
  ' o `GET /api/v1/super-admin/qr-codes`. No es un VENDEDOR.id.';

const INVITATION_LINK_ID_PARAM_DOC =
  'ID del link de invitación (LINK_INVITACION.id). Es el `id` de cada elemento de' +
  ' `GET /api/v1/link-invitacion/vendor/list` o `GET /api/v1/super-admin/link-invitacion`.';

const VENDEDOR_STATUS_PARAM_DOC =
  'Filtra por estado del vendedor: pendiente | activo | inactivo | bloqueado.';

const VENDEDOR_SEARCH_PARAM_DOC =
  'Texto libre (máximo 100 caracteres) que se compara con nombre, apellido y empresa, sin distinguir mayúsculas.';

const CLIENTE_SEARCH_PARAM_DOC =
  'Texto libre (máximo 100 caracteres) que se compara con nombre, apellido y DNI, sin distinguir mayúsculas.';

const PRODUCT_SEARCH_PARAM_DOC =
  'Texto libre (máximo 200 caracteres) que se compara con el nombre del producto, sin distinguir mayúsculas.';

const PRODUCT_CATEGORY_FILTER_PARAM_DOC =
  'Filtra por una categoría (CATEGORIA.id, UUID). Es el `id` de cada elemento de `GET /api/v1/categories/list`.';

const PRODUCT_AVAILABLE_FILTER_PARAM_DOC =
  'Cuando es `true`, lista solo productos activos con stock mayor a 0.';

/** Applied when an operation declares a parameter but no explicit `paramDocs` entry. */
const PARAM_LOCATION_LABEL: Record<'path' | 'query' | 'header', string> = {
  path: 'ruta',
  query: 'consulta',
  header: 'cabecera',
};

const IDEMPOTENCY_KEY_PARAM_DOC =
  'Clave de idempotencia del comando. El gateway la exige y rechaza el request con ' +
  '`Idempotency key is required` si falta. Usá un valor único por comando, por ejemplo ' +
  '`qa-pedido-001`. Si además la mandás en el body, ambos valores deben coincidir.';

const DEFAULT_PARAM_DOCS: Record<string, string> = {
  page: PAGE_PARAM_DOC,
  limit: LIMIT_PARAM_DOC,
  vendedorId: VENDEDOR_PROFILE_ID_PARAM_DOC,
  estado: VENDEDOR_STATUS_PARAM_DOC,
  id: 'ID de la entidad (UUID) sobre la que opera esta acción.',
  'Idempotency-Key': IDEMPOTENCY_KEY_PARAM_DOC,
};

const ACTIONS_DOC: Record<string, ActionDoc> = {
  'auth.login': { summary: 'Iniciar sesión', method: 'post', bodySchema: 'LoginRequest', responseSchema: 'LoginResponse' },
  'auth.register': { summary: 'Registrar vendedor', method: 'post', bodySchema: 'RegisterRequest', responseSchema: 'RegisterResponse' },
  'auth.refresh': { summary: 'Refrescar token', method: 'post', bodySchema: 'RefreshTokenRequest', responseSchema: 'RefreshTokenResponse' },
  'auth.validate': { summary: 'Validar token', method: 'post', bodySchema: 'ValidateTokenRequest', responseSchema: 'ValidateTokenResponse' },
  'auth.logout': { summary: 'Cerrar sesión', description: 'Invalida el refresh token del usuario autenticado', method: 'post', responseSchema: 'LogoutResponse', roles: ['auth'] },
  'auth.change_password': { summary: 'Cambiar contraseña', description: 'Cambia la contraseña del usuario autenticado. Invalida todos los refresh tokens existentes.', method: 'post', bodySchema: 'ChangePasswordRequest', responseSchema: 'ChangePasswordResponse' },
  'auth.admin_generate_reset_token': { summary: 'Generar token de reset (admin)', description: 'SUPER_ADMIN genera un token de un solo uso para que un usuario reseteé su contraseña. El token dura 30 min. Compartilo con el usuario por WhatsApp o llamada.', method: 'post', bodySchema: 'AdminGenerateResetTokenRequest', responseSchema: 'AdminGenerateResetTokenResponse', roles: ['super_admin'] },
  'auth.reset_password': { summary: 'Resetear contraseña con token', description: 'Público. Usa el token generado por el admin para cambiar la contraseña. Invalida refresh tokens existentes.', method: 'post', bodySchema: 'ResetPasswordRequest', responseSchema: 'ResetPasswordResponse' },
  'auth.register_client': { summary: 'Registrarse como cliente vía link de invitación', description: 'Público. Usa el token del link que el vendedor compartió. Crea el usuario, perfil CLIENTE, RELACION_CARTERA activa y devuelve JWT.', method: 'post', bodySchema: 'RegisterClientRequest', responseSchema: 'RegisterClientResponse' },
  'auth.register_client_by_vendor': { summary: 'Registrar cliente directamente (vendedor)', description: 'El vendedor crea un cliente manualmente sin link de invitación. El cliente queda vinculado automáticamente al vendedor.', method: 'post', bodySchema: 'RegisterClientRequest', responseSchema: 'RegisterClientResponse', roles: ['vendedor'] },

  'users.profile': { summary: 'Obtener perfil propio', method: 'get', responseSchema: 'UserProfile' },
  'users.profile_update': { summary: 'Actualizar perfil propio', method: 'patch', bodySchema: 'UpdateProfileRequest', responseSchema: 'UserProfile' },

  'vendedores.list': { summary: 'Listar vendedores (admin)', method: 'get', queryParams: ['page', 'limit', 'search', 'estado'], paramDocs: { search: VENDEDOR_SEARCH_PARAM_DOC }, responseSchema: 'VendedorListItem', isArray: true, paginated: true, roles: ['super_admin'] },
  'vendedores.get_by_id': { summary: 'Obtener vendedor por ID', description: 'El id viaja en el path, no en la query: `GET /api/v1/vendedores/get-by-id/<uuid>`.', method: 'get', pathParams: ['id'], paramDocs: { id: VENDEDOR_ROW_ID_PARAM_DOC }, responseSchema: 'VendedorListItem', roles: ['super_admin'] },
  // 'vendedores.update': { summary: 'Actualizar vendedor', method: 'patch', pathParams: ['id'], bodySchema: 'UpdateVendedorRequest', responseSchema: 'VendedorListItem', roles: ['super_admin'] }, // deprecated: vendor self-manages via profile/update
  'vendedores.change_estado': { summary: 'Cambiar estado de vendedor', method: 'patch', pathParams: ['id'], paramDocs: { id: VENDEDOR_ROW_ID_PARAM_DOC }, bodySchema: 'ChangeEstadoRequest', responseSchema: 'VendedorListItem', roles: ['super_admin'] },
  'vendedores.profile': { summary: 'Obtener mi perfil (vendedor)', method: 'get', responseSchema: 'VendedorProfile', roles: ['vendedor'] },
  'vendedores.profile_update': { summary: 'Actualizar mi perfil (vendedor)', description: 'El vendedor actualiza sus propios datos: nombre, apellido, dni, cuil, cuit, teléfono, empresa, logo, ciudad, zona de entrega.', method: 'patch', bodySchema: 'UpdateVendedorProfileRequest', responseSchema: 'VendedorProfile', roles: ['vendedor'] },

  'super_admin.dashboard': { summary: 'Dashboard del super admin', method: 'get', responseSchema: 'SuperAdminDashboard', roles: ['super_admin'] },
  'super_admin.profile': { summary: 'Obtener perfil del super admin', method: 'get', responseSchema: 'SuperAdminProfile', roles: ['super_admin'] },
  'super_admin.profile_update': { summary: 'Actualizar perfil del super admin', method: 'patch', bodySchema: 'UpdateSuperAdminRequest', responseSchema: 'SuperAdminProfile', roles: ['super_admin'] },
  'super_admin.audit_log': { summary: 'Obtener logs de auditoría', method: 'get', queryParams: ['page', 'limit'], responseSchema: 'AuditLogItem', isArray: true, paginated: true, roles: ['super_admin'] },
  'super_admin.qr_codes': { summary: 'Listar QR codes de un vendedor', method: 'get', queryParams: ['vendedorId', 'page', 'limit'], responseSchema: 'QRCodeItem', isArray: true, paginated: true, roles: ['super_admin'] },
  'super_admin.link_invitacion': { summary: 'Listar links de invitación de un vendedor', method: 'get', queryParams: ['vendedorId', 'page', 'limit'], responseSchema: 'LinkInvitacionItem', isArray: true, paginated: true, roles: ['super_admin'] },
  'super_admin.vendedores': { summary: 'Listar vendedores (admin)', description: 'Alias de vendedores.list', method: 'get', queryParams: ['page', 'limit', 'search', 'estado'], paramDocs: { search: VENDEDOR_SEARCH_PARAM_DOC }, responseSchema: 'VendedorListItem', isArray: true, paginated: true, roles: ['super_admin'] },

  'clientes.list': { summary: 'Listar clientes (admin)', method: 'get', queryParams: ['page', 'limit', 'search'], paramDocs: { search: CLIENTE_SEARCH_PARAM_DOC }, responseSchema: 'ClienteListItem', isArray: true, paginated: true, roles: ['super_admin'] },
  'clientes.get_by_id': { summary: 'Obtener cliente por ID', description: 'El id viaja en el path, no en la query: `GET /api/v1/clientes/get-by-id/<uuid>`.', method: 'get', pathParams: ['id'], paramDocs: { id: CLIENTE_ROW_ID_PARAM_DOC }, responseSchema: 'ClienteListItem', roles: ['super_admin'] },
  'clientes.update': { summary: 'Actualizar cliente', method: 'patch', pathParams: ['id'], paramDocs: { id: CLIENTE_ROW_ID_PARAM_DOC }, bodySchema: 'UpdateClienteRequest', responseSchema: 'ClienteListItem', roles: ['super_admin'] },
  'clientes.reassign': { summary: 'Reasignar cliente a otro vendedor', method: 'patch', pathParams: ['id'], paramDocs: { id: CLIENTE_ROW_ID_PARAM_DOC }, bodySchema: 'ReasignarVendedorRequest', responseSchema: 'ClienteListItem', roles: ['super_admin'] },
  'clientes.providers': { summary: 'Listar proveedores disponibles del cliente', description: 'Lista proveedores desde RELACION_CARTERA activa usando userId/role del JWT.', method: 'get', responseSchema: 'ClienteProvidersResponse', roles: ['cliente'] },
  'clientes.providers_select': { summary: 'Seleccionar proveedor activo del cliente', description: 'Valida que vendedorId pertenezca a una RELACION_CARTERA activa para el cliente autenticado.', method: 'post', bodySchema: 'SelectClienteProviderRequest', responseSchema: 'SelectClienteProviderResponse', roles: ['cliente'] },
  'clientes.provider_add': { summary: 'Agregar proveedor activo a cliente', description: 'SUPER_ADMIN agrega una relación CLIENTE↔VENDEDOR activa; actorUserId sale del JWT.', method: 'post', bodySchema: 'AddClienteProviderRequest', responseSchema: 'ClienteProviderResponse', roles: ['super_admin'] },
  'clientes.cartera': { summary: 'Obtener mis clientes (vendedor)', method: 'get', queryParams: ['page', 'limit', 'search'], paramDocs: { search: CLIENTE_SEARCH_PARAM_DOC }, responseSchema: 'ClienteListItem', isArray: true, paginated: true, roles: ['vendedor'] },
  'clientes.own_get_by_id': { summary: 'Obtener cliente propio por ID', method: 'get', pathParams: ['id'], paramDocs: { id: CLIENTE_ROW_ID_PARAM_DOC }, responseSchema: 'ClienteListItem', roles: ['vendedor'] },
  'clientes.own_update': { summary: 'Actualizar cliente propio', method: 'patch', pathParams: ['id'], paramDocs: { id: CLIENTE_ROW_ID_PARAM_DOC }, bodySchema: 'UpdateClienteVendedorRequest', responseSchema: 'ClienteListItem', roles: ['vendedor'] },

  'qr.vendor_list': { summary: 'Listar mis QR codes (vendedor)', method: 'get', queryParams: ['page', 'limit'], responseSchema: 'QRCodeItem', isArray: true, paginated: true, roles: ['vendedor'] },
  'qr.vendor_create': { summary: 'Crear QR code (vendedor)', method: 'post', responseSchema: 'CreateQRResponse', roles: ['vendedor'] },
  'qr.admin_deactivate': { summary: 'Desactivar QR code (admin)', method: 'patch', pathParams: ['id'], paramDocs: { id: QR_ROW_ID_PARAM_DOC }, responseSchema: 'QRCodeItem', roles: ['super_admin'] },
  'qr.vendor_deactivate': { summary: 'Desactivar QR code propio', method: 'patch', pathParams: ['id'], paramDocs: { id: QR_ROW_ID_PARAM_DOC }, responseSchema: 'QRCodeItem', roles: ['vendedor'] },

  'link_invitacion.vendor_list': { summary: 'Listar mis links de invitación', method: 'get', queryParams: ['page', 'limit'], responseSchema: 'LinkInvitacionItem', isArray: true, paginated: true, roles: ['vendedor'] },
  'link_invitacion.vendor_create': { summary: 'Crear link de invitación', method: 'post', responseSchema: 'CreateLinkResponse', roles: ['vendedor'] },
  'link_invitacion.admin_deactivate': { summary: 'Desactivar link (admin)', method: 'patch', pathParams: ['id'], paramDocs: { id: INVITATION_LINK_ID_PARAM_DOC }, responseSchema: 'LinkInvitacionItem', roles: ['super_admin'] },
  'link_invitacion.vendor_deactivate': { summary: 'Desactivar link propio', method: 'patch', pathParams: ['id'], paramDocs: { id: INVITATION_LINK_ID_PARAM_DOC }, responseSchema: 'LinkInvitacionItem', roles: ['vendedor'] },

  'cart.get': { summary: 'Obtener carrito activo', description: 'Usa userId del JWT y vendedorId seleccionado para scope de proveedor.', method: 'get', queryParams: ['vendedorId'], paramDocs: { vendedorId: PROVIDER_VENDEDOR_ID_PARAM_DOC }, responseSchema: 'CartResponse', roles: ['cliente'] },
  'cart.items_add': { summary: 'Agregar item al carrito', description: 'Valida vendedorId contra providers/select antes de despachar mutación.', method: 'post', bodySchema: 'CartItemMutationRequest', responseSchema: 'CartResponse', roles: ['cliente'] },
  'cart.items_update': { summary: 'Actualizar item del carrito', description: 'Valida vendedorId contra providers/select antes de despachar mutación.', method: 'patch', bodySchema: 'CartItemMutationRequest', responseSchema: 'CartResponse', roles: ['cliente'] },
  'cart.items_delete': { summary: 'Eliminar item del carrito', description: 'Valida vendedorId contra providers/select antes de despachar mutación.', method: 'delete', bodySchema: 'CartItemMutationRequest', responseSchema: 'CartResponse', roles: ['cliente'] },

  // ─── Productos ───────────────────────────────────────────────────

  'products.list': { summary: 'Listar productos', description: 'Lista productos con filtros. Si el usuario autenticado es vendedor, se resuelve su vendedorId automáticamente. El filtro de categoría se llama `categoriaId` y espera un UUID. El catálogo normal oculta productos vinculados a categorías o marcas inactivas; `super_admin` conserva vista completa para auditoría.', method: 'get', queryParams: ['vendedorId', 'categoriaId', 'disponibles', 'page', 'limit'], optionalQueryParams: ['vendedorId', 'categoriaId', 'disponibles', 'page', 'limit'], paramDocs: { categoriaId: PRODUCT_CATEGORY_FILTER_PARAM_DOC, disponibles: PRODUCT_AVAILABLE_FILTER_PARAM_DOC }, responseSchema: 'ProductResponse', isArray: true, paginated: true },
  'products.get': { summary: 'Obtener producto por ID', description: 'Devuelve el producto si pertenece al alcance del token. Para roles normales no devuelve productos vinculados a categorías o marcas inactivas; `super_admin` puede inspeccionarlos.', method: 'get', queryParams: ['id'], paramDocs: { id: PRODUCT_ID_PARAM_DOC }, responseSchema: 'ProductResponse' },
  'products.search': { summary: 'Buscar productos', description: 'Busca productos por texto libre y oculta taxonomía inactiva para roles normales. `super_admin` conserva vista completa para auditoría.', method: 'get', queryParams: ['q', 'vendedorId', 'page', 'limit'], optionalQueryParams: ['vendedorId', 'page', 'limit'], paramDocs: { q: PRODUCT_SEARCH_PARAM_DOC }, responseSchema: 'ProductResponse', isArray: true, paginated: true },
  'products.create': { summary: 'Crear producto', description: 'El vendedor crea un producto. `vendedorId` no se envía: se resuelve del JWT automáticamente. `categoriaId` y `marcaId` deben pertenecer al vendedor y estar activos.', method: 'post', bodySchema: 'CreateProductRequest', bodyExample: { nombre: 'Bidón 20L', descripcion: 'Agua sin gas', precioSinIva: 8500, stock: 40, categoriaId: '3f5a7b1e-3f0a-4c8a-9d2e-1a2b3c4d5e6f', marcaId: '7c2d9e44-5b16-4f3a-8c71-6d0e9b2a4c83', imagen: 'products/bidon-20l.webp', mostrarPrecio: true }, responseSchema: 'ProductCreatedResponse', roles: ['vendedor'] },
  'products.update': { summary: 'Actualizar producto', description: 'El vendedor actualiza un producto propio. El `id` viaja por query string y el `vendedorId` se resuelve del JWT, no se envía.', method: 'patch', queryParams: ['id'], paramDocs: { id: PRODUCT_ID_PARAM_DOC }, bodySchema: 'UpdateProductRequest', bodyExample: { nombre: 'Bidón 20L (pack)', precioSinIva: 9200, stock: 25, activo: true }, responseSchema: 'ProductResponse', roles: ['vendedor'] },
  'products.delete': { summary: 'Desactivar producto', description: 'Baja lógica: el producto se marca con `activo: false` y la respuesta es `{ "deleted": true }`. La fila no se elimina y el `vendedorId` se resuelve del JWT.', method: 'delete', queryParams: ['id'], paramDocs: { id: PRODUCT_ID_PARAM_DOC }, responseSchema: 'ProductDeletedResponse', roles: ['vendedor'] },

  'categories.list': { summary: 'Listar categorías', description: 'Lista categorías activas. Si el token es de vendedor, el `vendedorId` se resuelve automáticamente; si se envía, debe ser el propio. Para uso público/cliente se envía `vendedorId`.', method: 'get', queryParams: ['vendedorId'], optionalQueryParams: ['vendedorId'], paramDocs: { vendedorId: CATALOG_VENDEDOR_ID_PARAM_DOC }, responseSchema: 'CategoriaResponse', isArray: true },
  'categories.list_inactive': { summary: 'Listar categorías desactivadas (auditoría)', description: 'Solo `super_admin`. Lista categorías con `activo: false` para auditoría/debugging. No habilita mutación ni expone inactivas a vendedores, clientes o público. `vendedorId` es opcional para filtrar por vendedor.', method: 'get', queryParams: ['vendedorId'], optionalQueryParams: ['vendedorId'], paramDocs: { vendedorId: CATALOG_VENDEDOR_ID_PARAM_DOC }, responseSchema: 'CategoriaResponse', isArray: true, roles: ['super_admin'] },
  'categories.create': { summary: 'Crear categoría', description: 'El vendedor crea una categoría propia. El `vendedorId` no se envía: se resuelve del JWT. El `orden` se asigna automáticamente.', method: 'post', bodySchema: 'CreateCategoriaRequest', bodyExample: { nombre: 'Bidones' }, responseSchema: 'CategoriaResponse', roles: ['vendedor'] },
  'categories.update': { summary: 'Actualizar categoría', description: 'El vendedor actualiza una categoría propia. Solo si le pertenece. El `vendedorId` no se envía: se resuelve del JWT.', method: 'patch', queryParams: ['id'], paramDocs: { id: CATEGORY_ID_PARAM_DOC }, bodySchema: 'UpdateCategoriaRequest', bodyExample: { nombre: 'Bidones y botellas', orden: 1 }, responseSchema: 'CategoriaResponse', roles: ['vendedor'] },
  'categories.delete': { summary: 'Desactivar categoría', description: 'Baja lógica idempotente: la categoría se marca con `activo: false` y la respuesta es `{ "deactivated": true }`. La fila NO se elimina, deja de aparecer en categories.list y los productos vinculados quedan ocultos del catálogo normal mientras la categoría esté inactiva. El `vendedorId` no se envía: se resuelve del JWT.', method: 'delete', queryParams: ['id'], paramDocs: { id: CATEGORY_ID_PARAM_DOC }, responseSchema: 'DeactivatedResponse', roles: ['vendedor'] },
  'categories.reactivate': { summary: 'Reactivar categoría', description: 'El vendedor restaura una categoría propia desactivada. El `vendedorId` no se envía: se resuelve del JWT. Falla con conflicto si ya existe otra categoría activa con el mismo nombre.', method: 'patch', queryParams: ['id'], paramDocs: { id: CATEGORY_ID_PARAM_DOC }, responseSchema: 'CategoriaResponse', roles: ['vendedor'] },
  'brands.list': { summary: 'Listar marcas', description: 'Lista marcas activas. Si el token es de vendedor, el `vendedorId` se resuelve automáticamente; si se envía, debe ser el propio. Para uso público/cliente se envía `vendedorId`.', method: 'get', queryParams: ['vendedorId'], optionalQueryParams: ['vendedorId'], paramDocs: { vendedorId: CATALOG_VENDEDOR_ID_PARAM_DOC }, responseSchema: 'MarcaResponse', isArray: true },
  'brands.create': { summary: 'Crear marca', description: 'El vendedor crea una marca propia. El `vendedorId` no se envía: se resuelve del JWT.', method: 'post', bodySchema: 'CreateMarcaRequest', bodyExample: { nombre: 'AguaFress' }, responseSchema: 'MarcaResponse', roles: ['vendedor'] },
  'brands.update': { summary: 'Actualizar marca', description: 'El vendedor actualiza una marca propia. Solo si le pertenece. El `vendedorId` no se envía: se resuelve del JWT.', method: 'patch', queryParams: ['id'], paramDocs: { id: BRAND_ID_PARAM_DOC }, bodySchema: 'UpdateMarcaRequest', bodyExample: { nombre: 'AguaFress Premium' }, responseSchema: 'MarcaResponse', roles: ['vendedor'] },
  'brands.delete': { summary: 'Desactivar marca', description: 'Baja lógica idempotente: la marca se marca con `activo: false` y la respuesta es `{ "deactivated": true }`. La fila NO se elimina, deja de aparecer en brands.list y los productos vinculados quedan ocultos del catálogo normal mientras la marca esté inactiva. El `vendedorId` no se envía: se resuelve del JWT.', method: 'delete', queryParams: ['id'], paramDocs: { id: BRAND_ID_PARAM_DOC }, responseSchema: 'DeactivatedResponse', roles: ['vendedor'] },
  'brands.reactivate': { summary: 'Reactivar marca', description: 'El vendedor restaura una marca propia desactivada. El `vendedorId` no se envía: se resuelve del JWT. Falla con conflicto si ya existe otra marca activa con el mismo nombre.', method: 'patch', queryParams: ['id'], paramDocs: { id: BRAND_ID_PARAM_DOC }, responseSchema: 'MarcaResponse', roles: ['vendedor'] },

  'orders.list': { summary: 'Listar pedidos', description: 'No acepta filtros: el alcance lo define el rol del token. `cliente` ve sus propios pedidos, `vendedor` los del perfil de vendedor resuelto desde el token, `super_admin` los de todos. Sin paginación.', method: 'get', responseSchema: 'OrderResponse', isArray: true },
  'orders.get_by_id': { summary: 'Obtener pedido por ID', description: 'El `id` viaja por query string. Solo el cliente dueño, el vendedor que atiende el pedido o `super_admin` pueden leerlo.', method: 'get', queryParams: ['id'], paramDocs: { id: ORDER_ID_PARAM_DOC }, responseSchema: 'OrderResponse' },
  'orders.create': { summary: 'Crear pedido async', description: '**Requiere el header `Idempotency-Key`** (ver el campo de arriba) y un `vendedorId` que sea un proveedor seleccionado por este cliente. Ignora cualquier `userId` del body: la identidad sale del JWT. Responde `202` con el seguimiento del comando, NO con el pedido; el resultado real se consulta en orders/job-status usando el `trackingId`.', method: 'post', headerParams: ['Idempotency-Key'], bodySchema: 'CreateOrderRequest', bodyExample: { vendedorId: 'c1a2b3d4-5e6f-4071-8293-a4b5c6d7e8f9', metodoPago: 'contra_entrega', direccion: { calle: 'Av. Corrientes', numero: '1234', pisoDepto: '3B', barrio: 'Balvanera', ciudad: 'Buenos Aires', provincia: 'Buenos Aires', codigoPostal: 'C1084' }, observaciones: 'Dejar en la puerta' }, responseSchema: 'AsyncAcceptedResponse', roles: ['cliente'] },
  'orders.job_status': { summary: 'Consultar estado de pedido async', description: 'El parámetro `id` es el `trackingId` del comando, NO el `id` del pedido.', method: 'get', queryParams: ['id'], paramDocs: { id: ORDER_TRACKING_ID_PARAM_DOC }, responseSchema: 'OrderJobStatusResponse' },
  'orders.status_update': { summary: 'Actualizar estado de pedido', description: 'El vendedor mueve el ciclo de vida de un pedido propio. El servicio valida la transición y rechaza las que no están permitidas.', method: 'patch', bodySchema: 'UpdateOrderStatusRequest', bodyExample: { id: '4b8d1c76-2a53-4e19-b7c0-95d3f8a26b71', estado: 'en_camino', notas: 'Sale del depósito' }, responseSchema: 'OrderResponse', roles: ['vendedor'] },
  'orders.cancel': { summary: 'Cancelar pedido', description: 'El cliente cancela un pedido propio. Solo se admite mientras el pedido está en estado `pendiente`.', method: 'patch', bodySchema: 'CancelOrderRequest', bodyExample: { id: '4b8d1c76-2a53-4e19-b7c0-95d3f8a26b71', motivo: 'Compré en otro lugar' }, responseSchema: 'OrderResponse', roles: ['cliente'] },
  'orders.confirm': { summary: 'Confirmar pedido', description: 'El vendedor confirma un pedido propio. Es equivalente a `orders.status/update` con `estado: confirmado`.', method: 'patch', bodySchema: 'ConfirmOrderRequest', bodyExample: { id: '4b8d1c76-2a53-4e19-b7c0-95d3f8a26b71' }, responseSchema: 'OrderResponse', roles: ['vendedor'] },
};

// ─── Service Family Display Names ───────────────────────────────

const SERVICE_NAMES: Record<string, string> = {
  auth: 'Autenticación',
  users: 'Usuarios / Perfil',
  vendedores: 'Vendedores (admin)',
  'super-admin': 'Super Admin',
  clientes: 'Clientes',
  qr: 'Códigos QR',
  'link-invitacion': 'Links de Invitación',
  products: 'Productos',
  categories: 'Catálogo',
  brands: 'Catálogo',
};

// ─── OpenAPI Generator ──────────────────────────────────────────

@Injectable()
export class OpenApiSpecService {
  generateSpec(): Record<string, unknown> {
    const paths: Record<string, Record<string, unknown>> = {};
    const tags: Set<string> = new Set();

    for (const [service, family] of Object.entries(ACTION_REGISTRY)) {
      if (family.status === 'unavailable') continue;

      const tagName = SERVICE_NAMES[service] ?? service;
      tags.add(tagName);

      for (const [actionName, mapping] of Object.entries(family.actions)) {
        const tcpPattern = mapping.tcpPattern;
        const doc = ACTIONS_DOC[tcpPattern];
        if (!doc) continue;

        const pathParamsSuffix = doc.pathParams?.length ? `/{${doc.pathParams.join('/}{')}}` : '';
        const path = `/api/v1/${service}/${actionName}${pathParamsSuffix}`;
        const method = doc.method;
        const operation = this.buildOperation(tcpPattern, mapping, doc, tagName);

        if (!paths[path]) paths[path] = {};
        paths[path][method] = operation;
      }
    }

    const spec: Record<string, unknown> = {
      openapi: '3.0.3',
      info: {
        title: 'AguaFress API Gateway',
        description: API_DESCRIPTION,
        version: '1.0.0',
      },
      servers: [
        { url: 'http://localhost:3000', description: 'Desarrollo local' },
      ],
      paths,
      components: {
        schemas: SHARED_SCHEMAS,
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      tags: Array.from(tags).map(name => ({ name })),
    };

    return spec;
  }

  private buildOperation(
    tcpPattern: string,
    mapping: ActionMapping,
    doc: ActionDoc,
    tagName: string,
  ): Record<string, unknown> {
    const parameters: Record<string, unknown>[] = [];
    const security: Record<string, unknown>[] = [];

    // Auth
    if (mapping.authRequired) {
      security.push({ bearerAuth: [] });
    }

    // Path params
    for (const param of doc.pathParams ?? []) {
      parameters.push({
        name: param,
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
        description: this.describeParam(doc, param, 'path'),
      });
    }

    // Query params
    for (const param of doc.queryParams ?? []) {
      const isPagination = ['page', 'limit'].includes(param);
      const optional = doc.optionalQueryParams?.includes(param) ?? false;
      parameters.push({
        name: param,
        in: 'query',
        required: !optional && (param === 'vendedorId' || param === 'id'),
        schema: isPagination ? { type: 'integer' } : { type: 'string' },
        description: this.describeParam(doc, param, 'query'),
      });
    }

    // Required request headers
    for (const header of doc.headerParams ?? []) {
      parameters.push({
        name: header,
        in: 'header',
        required: true,
        schema: { type: 'string' },
        description: this.describeParam(doc, header, 'header'),
      });
    }

    // Roles description
    const roles = doc.roles ?? mapping.roles;
    const roleDesc = roles?.length
      ? `**Roles requeridos**: ${roles.join(', ')}`
      : 'Requiere autenticación';

    const operation: Record<string, unknown> = {
      tags: [tagName],
      summary: doc.summary,
      description: doc.description ?? doc.summary,
      security,
      parameters: parameters.length > 0 ? parameters : undefined,
      responses: {
        '200': this.buildResponse(200, doc),
        '401': { description: 'No autenticado — falta JWT o es inválido' },
        '403': { description: `No autorizado — rol insuficiente. ${roleDesc}` },
        '404': { description: 'Recurso no encontrado' },
      },
    };

    // Request body
    if (doc.bodySchema && SHARED_SCHEMAS[doc.bodySchema]) {
      const mediaType: Schema = {
        schema: ref(`#/components/schemas/${doc.bodySchema}`),
      };
      if (doc.bodyExample) {
        mediaType.example = doc.bodyExample;
      }

      operation.requestBody = {
        // Only required when the referenced schema actually declares required properties.
        required: hasRequiredProperties(SHARED_SCHEMAS[doc.bodySchema]),
        content: {
          'application/json': mediaType,
        },
      };
    }

    return operation;
  }

  private describeParam(doc: ActionDoc, param: string, location: 'path' | 'query' | 'header'): string {
    return doc.paramDocs?.[param]
      ?? DEFAULT_PARAM_DOCS[param]
      ?? `Parámetro de ${PARAM_LOCATION_LABEL[location]} de esta operación.`;
  }

  private buildResponse(status: number, doc: ActionDoc): Record<string, unknown> {
    if (doc.paginated) {
      return {
        description: 'Operación exitosa (paginada)',
        content: {
          'application/json': {
            schema: obj({
              data: {
                type: 'array',
                items: ref(`#/components/schemas/${doc.responseSchema}`),
              },
              pagination: ref('#/components/schemas/PaginationResponse'),
            }),
          },
        },
      };
    }

    if (doc.isArray) {
      return {
        description: 'Operación exitosa',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: ref(`#/components/schemas/${doc.responseSchema}`),
            },
          },
        },
      };
    }

    if (doc.responseSchema && SHARED_SCHEMAS[doc.responseSchema]) {
      return {
        description: 'Operación exitosa',
        content: {
          'application/json': {
            schema: ref(`#/components/schemas/${doc.responseSchema}`),
          },
        },
      };
    }

    return { description: 'Operación exitosa' };
  }
}
