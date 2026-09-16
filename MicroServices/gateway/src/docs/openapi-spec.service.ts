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
    metodoPago: str('Payment method'),
    direccion: ref('#/components/schemas/DireccionEntrega'),
    observaciones: str('Optional notes'),
  }, ['vendedorId', 'metodoPago']),

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

  CategoriaResponse: obj({
    id: str('Categoría ID'),
    nombre: str('Nombre'),
    orden: { type: 'integer', description: 'Orden de visualización' },
    vendedorId: str('ID del vendedor'),
  }, ['id', 'nombre', 'vendedorId']),

  CreateCategoriaRequest: obj({
    nombre: str('Nombre de la categoría'),
    orden: { type: 'integer', description: 'Orden de visualización (opcional)' },
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
};

// ─── Action → HTTP method mapping ──────────────────────────────

type HttpMethod = 'get' | 'post' | 'patch' | 'delete';

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
  bodySchema?: string;
  responseSchema: string;
  isArray?: boolean;
  paginated?: boolean;
  roles?: string[];
}

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

  'vendedores.list': { summary: 'Listar vendedores (admin)', method: 'get', queryParams: ['page', 'limit', 'search', 'estado'], responseSchema: 'VendedorListItem', isArray: true, paginated: true, roles: ['super_admin'] },
  'vendedores.get_by_id': { summary: 'Obtener vendedor por ID', method: 'get', pathParams: ['id'], responseSchema: 'VendedorListItem', roles: ['super_admin'] },
  // 'vendedores.update': { summary: 'Actualizar vendedor', method: 'patch', pathParams: ['id'], bodySchema: 'UpdateVendedorRequest', responseSchema: 'VendedorListItem', roles: ['super_admin'] }, // deprecated: vendor self-manages via profile/update
  'vendedores.change_estado': { summary: 'Cambiar estado de vendedor', method: 'patch', pathParams: ['id'], bodySchema: 'ChangeEstadoRequest', responseSchema: 'VendedorListItem', roles: ['super_admin'] },
  'vendedores.profile': { summary: 'Obtener mi perfil (vendedor)', method: 'get', responseSchema: 'VendedorProfile', roles: ['vendedor'] },
  'vendedores.profile_update': { summary: 'Actualizar mi perfil (vendedor)', description: 'El vendedor actualiza sus propios datos: nombre, apellido, dni, cuil, cuit, teléfono, empresa, logo, ciudad, zona de entrega.', method: 'patch', bodySchema: 'UpdateVendedorProfileRequest', responseSchema: 'VendedorProfile', roles: ['vendedor'] },

  'super_admin.dashboard': { summary: 'Dashboard del super admin', method: 'get', responseSchema: 'SuperAdminDashboard', roles: ['super_admin'] },
  'super_admin.profile': { summary: 'Obtener perfil del super admin', method: 'get', responseSchema: 'SuperAdminProfile', roles: ['super_admin'] },
  'super_admin.profile_update': { summary: 'Actualizar perfil del super admin', method: 'patch', bodySchema: 'UpdateSuperAdminRequest', responseSchema: 'SuperAdminProfile', roles: ['super_admin'] },
  'super_admin.audit_log': { summary: 'Obtener logs de auditoría', method: 'get', queryParams: ['page', 'limit'], responseSchema: 'AuditLogItem', isArray: true, paginated: true, roles: ['super_admin'] },
  'super_admin.qr_codes': { summary: 'Listar QR codes de un vendedor', method: 'get', queryParams: ['vendedorId', 'page', 'limit'], responseSchema: 'QRCodeItem', isArray: true, paginated: true, roles: ['super_admin'] },
  'super_admin.link_invitacion': { summary: 'Listar links de invitación de un vendedor', method: 'get', queryParams: ['vendedorId', 'page', 'limit'], responseSchema: 'LinkInvitacionItem', isArray: true, paginated: true, roles: ['super_admin'] },
  'super_admin.vendedores': { summary: 'Listar vendedores (admin)', description: 'Alias de vendedores.list', method: 'get', queryParams: ['page', 'limit', 'search', 'estado'], responseSchema: 'VendedorListItem', isArray: true, paginated: true, roles: ['super_admin'] },

  'clientes.list': { summary: 'Listar clientes (admin)', method: 'get', queryParams: ['page', 'limit', 'search'], responseSchema: 'ClienteListItem', isArray: true, paginated: true, roles: ['super_admin'] },
  'clientes.get_by_id': { summary: 'Obtener cliente por ID', method: 'get', pathParams: ['id'], responseSchema: 'ClienteListItem', roles: ['super_admin'] },
  'clientes.update': { summary: 'Actualizar cliente', method: 'patch', pathParams: ['id'], bodySchema: 'UpdateClienteRequest', responseSchema: 'ClienteListItem', roles: ['super_admin'] },
  'clientes.reassign': { summary: 'Reasignar cliente a otro vendedor', method: 'patch', pathParams: ['id'], bodySchema: 'ReasignarVendedorRequest', responseSchema: 'ClienteListItem', roles: ['super_admin'] },
  'clientes.providers': { summary: 'Listar proveedores disponibles del cliente', description: 'Lista proveedores desde RELACION_CARTERA activa usando userId/role del JWT.', method: 'get', responseSchema: 'ClienteProvidersResponse', roles: ['cliente'] },
  'clientes.providers_select': { summary: 'Seleccionar proveedor activo del cliente', description: 'Valida que vendedorId pertenezca a una RELACION_CARTERA activa para el cliente autenticado.', method: 'post', bodySchema: 'SelectClienteProviderRequest', responseSchema: 'SelectClienteProviderResponse', roles: ['cliente'] },
  'clientes.provider_add': { summary: 'Agregar proveedor activo a cliente', description: 'SUPER_ADMIN agrega una relación CLIENTE↔VENDEDOR activa; actorUserId sale del JWT.', method: 'post', bodySchema: 'AddClienteProviderRequest', responseSchema: 'ClienteProviderResponse', roles: ['super_admin'] },
  'clientes.cartera': { summary: 'Obtener mis clientes (vendedor)', method: 'get', queryParams: ['page', 'limit', 'search'], responseSchema: 'ClienteListItem', isArray: true, paginated: true, roles: ['vendedor'] },
  'clientes.own_get_by_id': { summary: 'Obtener cliente propio por ID', method: 'get', pathParams: ['id'], responseSchema: 'ClienteListItem', roles: ['vendedor'] },
  'clientes.own_update': { summary: 'Actualizar cliente propio', method: 'patch', pathParams: ['id'], bodySchema: 'UpdateClienteVendedorRequest', responseSchema: 'ClienteListItem', roles: ['vendedor'] },

  'qr.vendor_list': { summary: 'Listar mis QR codes (vendedor)', method: 'get', queryParams: ['page', 'limit'], responseSchema: 'QRCodeItem', isArray: true, paginated: true, roles: ['vendedor'] },
  'qr.vendor_create': { summary: 'Crear QR code (vendedor)', method: 'post', responseSchema: 'CreateQRResponse', roles: ['vendedor'] },
  'qr.admin_deactivate': { summary: 'Desactivar QR code (admin)', method: 'patch', pathParams: ['id'], responseSchema: 'QRCodeItem', roles: ['super_admin'] },
  'qr.vendor_deactivate': { summary: 'Desactivar QR code propio', method: 'patch', pathParams: ['id'], responseSchema: 'QRCodeItem', roles: ['vendedor'] },

  'link_invitacion.vendor_list': { summary: 'Listar mis links de invitación', method: 'get', queryParams: ['page', 'limit'], responseSchema: 'LinkInvitacionItem', isArray: true, paginated: true, roles: ['vendedor'] },
  'link_invitacion.vendor_create': { summary: 'Crear link de invitación', method: 'post', responseSchema: 'CreateLinkResponse', roles: ['vendedor'] },
  'link_invitacion.admin_deactivate': { summary: 'Desactivar link (admin)', method: 'patch', pathParams: ['id'], responseSchema: 'LinkInvitacionItem', roles: ['super_admin'] },
  'link_invitacion.vendor_deactivate': { summary: 'Desactivar link propio', method: 'patch', pathParams: ['id'], responseSchema: 'LinkInvitacionItem', roles: ['vendedor'] },

  'cart.get': { summary: 'Obtener carrito activo', description: 'Usa userId del JWT y vendedorId seleccionado para scope de proveedor.', method: 'get', queryParams: ['vendedorId'], responseSchema: 'CartResponse', roles: ['cliente'] },
  'cart.items_add': { summary: 'Agregar item al carrito', description: 'Valida vendedorId contra providers/select antes de despachar mutación.', method: 'post', bodySchema: 'CartItemMutationRequest', responseSchema: 'CartResponse', roles: ['cliente'] },
  'cart.items_update': { summary: 'Actualizar item del carrito', description: 'Valida vendedorId contra providers/select antes de despachar mutación.', method: 'patch', bodySchema: 'CartItemMutationRequest', responseSchema: 'CartResponse', roles: ['cliente'] },
  'cart.items_delete': { summary: 'Eliminar item del carrito', description: 'Valida vendedorId contra providers/select antes de despachar mutación.', method: 'delete', bodySchema: 'CartItemMutationRequest', responseSchema: 'CartResponse', roles: ['cliente'] },

  // ─── Productos ───────────────────────────────────────────────────

  'products.list': { summary: 'Listar productos', description: 'Público. Lista productos con filtros. Si el usuario autenticado es vendedor, se resuelve su vendedorId automáticamente.', method: 'get', queryParams: ['vendedorId', 'categoria', 'disponibles', 'page', 'limit'], responseSchema: 'ProductResponse', isArray: true, paginated: true },
  'products.get': { summary: 'Obtener producto por ID', method: 'get', queryParams: ['id'], responseSchema: 'ProductResponse' },
  'products.search': { summary: 'Buscar productos', description: 'Público. Busca productos por texto libre.', method: 'get', queryParams: ['q', 'vendedorId', 'page', 'limit'], responseSchema: 'ProductResponse', isArray: true, paginated: true },
  'products.create': { summary: 'Crear producto', description: 'El vendedor crea un producto. vendedorId se resuelve del JWT automáticamente.', method: 'post', bodySchema: 'CreateProductRequest', responseSchema: 'ProductCreatedResponse', roles: ['vendedor'] },
  'products.update': { summary: 'Actualizar producto', description: 'El vendedor actualiza un producto propio. id se pasa por query string.', method: 'patch', queryParams: ['id'], bodySchema: 'UpdateProductRequest', responseSchema: 'ProductResponse', roles: ['vendedor'] },
  'products.delete': { summary: 'Eliminar producto', description: 'El vendedor elimina un producto propio. id se pasa por query string.', method: 'delete', queryParams: ['id'], responseSchema: 'ProductDeletedResponse', roles: ['vendedor'] },

  'categories.list': { summary: 'Listar categorías', description: 'Público. Lista categorías de un vendedor.', method: 'get', queryParams: ['vendedorId'], responseSchema: 'CategoriaResponse', isArray: true },
  'categories.create': { summary: 'Crear categoría', description: 'El vendedor crea una categoría propia.', method: 'post', bodySchema: 'CreateCategoriaRequest', responseSchema: 'CategoriaResponse', roles: ['vendedor'] },
  'categories.update': { summary: 'Actualizar categoría', description: 'El vendedor actualiza una categoría propia. Solo si le pertenece.', method: 'patch', queryParams: ['id'], bodySchema: 'UpdateCategoriaRequest', responseSchema: 'CategoriaResponse', roles: ['vendedor'] },
  'categories.delete': { summary: 'Eliminar categoría', description: 'El vendedor elimina una categoría propia. Productos asociados pasan a null.', method: 'delete', queryParams: ['id'], responseSchema: 'ProductDeletedResponse', roles: ['vendedor'] },
  'brands.list': { summary: 'Listar marcas', description: 'Público. Lista marcas de un vendedor.', method: 'get', queryParams: ['vendedorId'], responseSchema: 'MarcaResponse', isArray: true },
  'brands.create': { summary: 'Crear marca', description: 'El vendedor crea una marca propia.', method: 'post', bodySchema: 'CreateMarcaRequest', responseSchema: 'MarcaResponse', roles: ['vendedor'] },
  'brands.update': { summary: 'Actualizar marca', description: 'El vendedor actualiza una marca propia. Solo si le pertenece.', method: 'patch', queryParams: ['id'], bodySchema: 'UpdateMarcaRequest', responseSchema: 'MarcaResponse', roles: ['vendedor'] },
  'brands.delete': { summary: 'Eliminar marca', description: 'El vendedor elimina una marca propia. Productos asociados pasan a null.', method: 'delete', queryParams: ['id'], responseSchema: 'ProductDeletedResponse', roles: ['vendedor'] },

  'orders.create': { summary: 'Crear pedido async', description: 'Valida vendedorId seleccionado, ignora body userId y encola con userId JWT + vendedorId.', method: 'post', bodySchema: 'CreateOrderRequest', responseSchema: 'AsyncAcceptedResponse', roles: ['cliente'] },
  'orders.job_status': { summary: 'Consultar estado de pedido async', method: 'get', queryParams: ['id'], responseSchema: 'AsyncAcceptedResponse' },
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
        description: `API Gateway para AguaFress — plataforma de pedidos y gestión para distribuidores de agua y soda.
        
**Autenticación**: Los endpoints protegidos requieren un JWT en el header \`Authorization: Bearer <token>\`.
Los roles se especifican por endpoint: \`super_admin\`, \`vendedor\`.

**IDs en parámetros de ruta**: Se pasan como query params. Ej: \`GET /api/v1/vendedores/get-by-id?id=uuid\``,
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
        description: `ID del recurso`,
      });
    }

    // Query params
    for (const param of doc.queryParams ?? []) {
      const isPagination = ['page', 'limit'].includes(param);
      parameters.push({
        name: param,
        in: 'query',
        required: param === 'vendedorId' || param === 'id',
        schema: isPagination ? { type: 'integer' } : { type: 'string' },
        description: isPagination
          ? param === 'page' ? 'Número de página' : 'Items por página'
          : `Filtro por ${param}`,
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
      operation.requestBody = {
        required: true,
        content: {
          'application/json': {
            schema: ref(`#/components/schemas/${doc.bodySchema}`),
          },
        },
      };
    }

    return operation;
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
