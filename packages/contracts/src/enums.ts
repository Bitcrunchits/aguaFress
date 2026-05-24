// ─── Roles ───
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

// ─── Estados de pedido ───
export enum OrderEstado {
  PENDIENTE = 'pendiente',
  CONFIRMADO = 'confirmado',
  EN_CAMINO = 'en_camino',
  ENTREGADO = 'entregado',
  CANCELADO = 'cancelado',
  VENCIDO = 'vencido',
}

// ─── Estados de entrega ───
export enum DeliveryEstado {
  PENDIENTE = 'pendiente',
  EN_CAMINO = 'en_camino',
  ENTREGADA = 'entregada',
}

// ─── Métodos de pago ───
export enum MetodoPago {
  ANTICIPADO = 'anticipado',
  CONTRA_ENTREGA = 'contra_entrega',
}

// ─── Tipo de dirección ───
export enum TipoDireccion {
  FACTURACION = 'facturacion',
  ENTREGA = 'entrega',
  PERSONAL = 'personal',
}

// ─── Tipo de factura ───
export enum TipoFactura {
  B = 'B',
  C = 'C',
}

// ─── Nombres de streams Redis ───
export const RedisStreams = {
  AUTH: 'auth-stream',
  USER: 'user-stream',
  PRODUCTS: 'products-stream',
  ORDERS: 'orders-stream',
  DELIVERIES: 'deliveries-stream',
} as const;
