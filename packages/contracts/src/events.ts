// ──────────────────────────────────────────────────────
//  EVENTOS DEL SISTEMA (Redis Streams)
//  ──────────────────────────────────────────────────────
//  Cada interfaz extiende BaseEvent e incluye un campo
//  `type` como discriminante. Esto permite:
//
//  1. Narrowing automático en switch/case
//  2. Uniones por stream (OrderEvent, ProductEvent, etc.)
//  3. Routing tipado en el consumer (AguaFressEvent)
//  4. Extensibilidad sin modificar interfaces existentes
//
//  PRINCIPIOS:
//  - SRP: cada evento representa UNA acción
//  - OCP: nuevos eventos se agregan a las uniones, no se modifican las existentes
//  - ISP: cada consumer importa solo la unión que necesita
//  - DIP: eventos dependen de enums abstractos, no de servicios concretos
// ──────────────────────────────────────────────────────

import {
  DeliveryEstado,
  MetodoPago,
  OrderEstado,
  UserRole,
  VendedorEstado,
} from './enums';

// ─── Base ────────────────────────────────────
// Todos los eventos comparten timestamp ISO 8601

export interface BaseEvent {
  /** ISO 8601 */
  timestamp: string;
}

// ════════════════════════════════════════════════
//  AUTH STREAM (usuario-service, módulo auth)
// ════════════════════════════════════════════════

export interface UserCreatedEvent extends BaseEvent {
  type: 'UserCreated';
  userId: string;
  email: string;
  role: UserRole;
  /** Solo si el registro viene de link QR público */
  qrToken?: string;
}

export type AuthEvent = UserCreatedEvent;

// ════════════════════════════════════════════════
//  USER STREAM (usuario-service, módulo users)
// ════════════════════════════════════════════════

export interface VendedorStatusChangedEvent extends BaseEvent {
  type: 'VendedorStatusChanged';
  vendedorId: string;
  estadoAnterior: VendedorEstado;
  estadoNuevo: VendedorEstado;
}

export interface CarteraClienteAddedEvent extends BaseEvent {
  type: 'CarteraClienteAdded';
  vendedorId: string;
  clienteId: string;
}

export type UserEvent =
  | VendedorStatusChangedEvent
  | CarteraClienteAddedEvent;

// ════════════════════════════════════════════════
//  PRODUCTS STREAM
// ════════════════════════════════════════════════

export interface ProductUpdatedEvent extends BaseEvent {
  type: 'ProductUpdated';
  productId: string;
  vendedorId: string;
  nombre: string;
  precioFinal: number;
  stock: number;
}

export interface ProductDeletedEvent extends BaseEvent {
  type: 'ProductDeleted';
  productId: string;
  vendedorId: string;
}

export type ProductEvent =
  | ProductUpdatedEvent
  | ProductDeletedEvent;

// ════════════════════════════════════════════════
//  ORDERS STREAM
// ════════════════════════════════════════════════

export interface OrderCreatedEvent extends BaseEvent {
  type: 'OrderCreated';
  orderId: string;
  pedidoNumero: string;
  vendedorId: string;
  clienteId: string;
  total: number;
  estado: OrderEstado;
  metodoPago: MetodoPago.CONTRA_ENTREGA;
  items: {
    productId: string;
    cantidad: number;
    precioUnitario: number;
  }[];
}

export interface OrderStatusChangedEvent extends BaseEvent {
  type: 'OrderStatusChanged';
  orderId: string;
  vendedorId: string;
  estadoAnterior: OrderEstado;
  estadoNuevo: OrderEstado;
}

export type OrderEvent =
  | OrderCreatedEvent
  | OrderStatusChangedEvent;

// ════════════════════════════════════════════════
//  DELIVERIES STREAM
// ════════════════════════════════════════════════

export interface DeliveryStartedEvent extends BaseEvent {
  type: 'DeliveryStarted';
  deliveryId: string;
  orderId: string;
  vendedorId: string;
}

export interface DeliveryCompletedEvent extends BaseEvent {
  type: 'DeliveryCompleted';
  deliveryId: string;
  orderId: string;
  vendedorId: string;
}

export interface DeliveryStatusChangedEvent extends BaseEvent {
  type: 'DeliveryStatusChanged';
  deliveryId: string;
  orderId: string;
  estadoAnterior: DeliveryEstado;
  estadoNuevo: DeliveryEstado;
  actorUserId: string;
}

export type DeliveryEvent =
  | DeliveryStartedEvent
  | DeliveryCompletedEvent
  | DeliveryStatusChangedEvent;

// ════════════════════════════════════════════════
//  UNIÓN GLOBAL — routing centralizado
//  Útil cuando un consumer escucha varios streams
//  y necesita un switch exhaustivo.
// ════════════════════════════════════════════════

export type AguaFressEvent =
  | AuthEvent
  | UserEvent
  | ProductEvent
  | OrderEvent
  | DeliveryEvent;
