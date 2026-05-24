// ────────────────────────────────────────────
//  EVENTOS DEL SISTEMA
//  Cada interfaz define el payload exacto que
//  viaja por Redis Streams entre servicios.
// ────────────────────────────────────────────

// ─── Auth Stream ────────────────────────────

/** Auth publica cuando se crea un usuario en el sistema */
export interface UserCreatedEvent {
  userId: string;
  email: string;
  role: 'super_admin' | 'vendedor' | 'cliente';
  /** Solo presente si el registro viene de un link público QR */
  qrToken?: string;
  timestamp: string;
}

// ─── User Stream ────────────────────────────

/** User publica cuando cambia el estado de un vendedor */
export interface VendedorStatusChangedEvent {
  vendedorId: string;
  estadoAnterior: 'pendiente' | 'activo' | 'inactivo' | 'bloqueado';
  estadoNuevo: 'pendiente' | 'activo' | 'inactivo' | 'bloqueado';
  timestamp: string;
}

/** User publica cuando se asigna un cliente a la cartera de un vendedor */
export interface CarteraClienteAddedEvent {
  vendedorId: string;
  clienteId: string;
  timestamp: string;
}

// ─── Products Stream ────────────────────────

/** Products publica cuando se crea o actualiza un producto */
export interface ProductUpdatedEvent {
  productId: string;
  vendedorId: string;
  nombre: string;
  precioFinal: number;
  stock: number;
  timestamp: string;
}

/** Products publica cuando se elimina un producto */
export interface ProductDeletedEvent {
  productId: string;
  vendedorId: string;
  timestamp: string;
}

// ─── Orders Stream ──────────────────────────

/** Orders publica cuando se crea un pedido */
export interface OrderCreatedEvent {
  orderId: string;
  vendedorId: string;
  clienteId: string;
  total: number;
  estado: string;
  timestamp: string;
}

/** Orders publica cuando cambia el estado de un pedido */
export interface OrderStatusChangedEvent {
  orderId: string;
  estadoAnterior: string;
  estadoNuevo: string;
  timestamp: string;
}

// ─── Deliveries Stream ──────────────────────

/** Entregas publica cuando comienza un reparto */
export interface DeliveryStartedEvent {
  deliveryId: string;
  orderId: string;
  timestamp: string;
}

/** Entregas publica cuando se completa una entrega */
export interface DeliveryCompletedEvent {
  deliveryId: string;
  orderId: string;
  timestamp: string;
}
