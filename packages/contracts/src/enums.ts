// ─── Roles del sistema ───
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  VENDEDOR = 'vendedor',
  CLIENTE = 'cliente',
}

// ─── Estados de vendedor ───
export enum VendedorEstado {
  PENDIENTE = 'pendiente',
  ACTIVO = 'activo',
  INACTIVO = 'inactivo',
  BLOQUEADO = 'bloqueado',
}

// ─── Estados de un pedido ───
export enum OrderEstado {
  PENDIENTE = 'pendiente',
  CONFIRMADO = 'confirmado',
  EN_CAMINO = 'en_camino',
  ENTREGADO = 'entregado',
  CANCELADO = 'cancelado',
  VENCIDO = 'vencido',
}

// ─── Estados de una entrega / reparto ───
export enum DeliveryEstado {
  PENDIENTE = 'pendiente',
  EN_CAMINO = 'en_camino',
  ENTREGADA = 'entregada',
}

// ─── Métodos de pago ───
// MVP V1: solo CONTRA_ENTREGA. Futuros métodos se agregan aquí.
export enum MetodoPago {
  CONTRA_ENTREGA = 'contra_entrega',
}

// ─── Tipo de factura (Argentina AFIP) ───
export enum TipoFactura {
  B = 'B',
  C = 'C',
}

// ─── Acciones de auditoría ───
export enum AuditAction {
  USER_REGISTERED = 'USER_REGISTERED',
  USER_LOGIN = 'USER_LOGIN',
  VENDEDOR_UPDATED = 'VENDEDOR_UPDATED',
  VENDEDOR_STATUS_CHANGED = 'VENDEDOR_STATUS_CHANGED',
  CLIENTE_UPDATED = 'CLIENTE_UPDATED',
  CLIENTE_REASSIGNED = 'CLIENTE_REASSIGNED',
  QR_CREATED = 'QR_CREATED',
  QR_DEACTIVATED = 'QR_DEACTIVATED',
  LINK_CREATED = 'LINK_CREATED',
  LINK_DEACTIVATED = 'LINK_DEACTIVATED',
  SUPER_ADMIN_UPDATED = 'SUPER_ADMIN_UPDATED',
  PROFILE_UPDATED = 'PROFILE_UPDATED',
}

// ─── Nombres de streams Redis ───
// Cada servicio PUBLICA en su stream y los demás CONSUMEN.
// Notifications solo consume (activity_log), no publica.
export const RedisStreams = {
  AUTH: 'auth-stream',
  USER: 'user-stream',
  PRODUCTS: 'products-stream',
  ORDERS: 'orders-stream',
  DELIVERIES: 'deliveries-stream',
} as const;
