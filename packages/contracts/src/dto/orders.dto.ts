// ─── Orders Service ───
// Puerto: 3014
// Base de datos: PostgreSQL
// Unifica: carrito + pedidos + facturas
//
// ⚠️ REGLA DE SEGURIDAD: la identidad NUNCA viene del body.
//    userId = AUTH_USER.id desde JWT sub. En V1, algunos campos públicos
//    legacy llamados clienteId representan clienteUserId (AUTH_USER.id), no CLIENTE.id.
//    Mantener compatibilidad hasta una migración V2 explícita.

import { MetodoPago, OrderEstado, OrderJobStatus } from '../enums';
import type { DireccionEntrega, PaginationRequest } from './common.dto';

// ─── OCP-friendly: al agregar un método de pago:
//     1. Agregar el valor al enum MetodoPago
//     2. Agregarlo a esta unión
//     3. Ninguna interfaz existente se modifica
export type MetodoPagoPermitido = Extract<MetodoPago, MetodoPago.CONTRA_ENTREGA>;

// ════════════════════════════════════════════
//  CARRITO
// ════════════════════════════════════════════

/**
 * Agregar un item al carrito del usuario autenticado.
 * El userId se obtiene del token JWT, no del body.
 * Puede devolver 503 controlado hasta que exista el adaptador real de productos.
 */
export interface AddCartItemRequest {
  cartId?: string;
  productoId: string;
  cantidad: number;
}

export interface CartItemResponse {
  id: string;
  productoId: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface CartResponse {
  id: string;
  /** V1 compatibility: auth-user id (`clienteUserId` / AUTH_USER.id), not CLIENTE.id. */
  clienteId: string;
  vendedorId: string;
  items: CartItemResponse[];
  total: number;
  /** ISO 8601 — el carrito expira 24hs después de creado */
  expiresAt: string;
}

/**
 * Actualiza la cantidad de un item existente.
 * No crea items faltantes y puede devolver 503 controlado hasta que exista el adaptador real de productos.
 */
export interface UpdateCartItemRequest {
  cartId: string;
  productoId: string;
  cantidad: number;
}

export interface DeleteCartItemRequest {
  cartId: string;
  productoId: string;
}

// ════════════════════════════════════════════
//  PEDIDOS
// ════════════════════════════════════════════

/**
 * Crear un pedido desde el carrito del usuario autenticado.
 * - userId se obtiene del JWT; V1 usa clienteId con semántica legacy de clienteUserId (AUTH_USER.id)
 * - Los precios se calculan server-side contra products-service
 * - Hasta que exista el adaptador real de productos, puede devolver 503 controlado
 * - No se aceptan otros métodos de pago en MVP V1
 */
export interface CreateOrderRequest {
  metodoPago: MetodoPagoPermitido;
  direccion: DireccionEntrega;
  observaciones?: string;
}

export interface OrderCommandIdempotencyMetadata {
  /** V1 compatibility: auth-user id (`clienteUserId` / AUTH_USER.id), not CLIENTE.id. */
  clienteId: string;
  idempotencyKey: string;
}

export interface AsyncAcceptedResponse {
  jobId: string;
  trackingId: string;
  /** Selected provider domain ID used to scope the async order command. */
  vendedorId?: string;
  status: OrderJobStatus.PENDING;
  statusUrl: string;
  /** ISO 8601 */
  acceptedAt: string;
}

export interface CreateOrderJobData extends OrderCommandIdempotencyMetadata {
  jobId: string;
  trackingId: string;
  /** Selected provider domain ID; validated before gateway enqueue. */
  vendedorId?: string;
  requestId: string;
  body: Record<string, unknown>;
  /** ISO 8601 */
  requestedAt: string;
}

export interface OrderJobStatusResponse extends OrderCommandIdempotencyMetadata {
  jobId: string;
  trackingId: string;
  status: OrderJobStatus;
  orderId?: string;
  errorCode?: string;
  errorMessage?: string;
  attempts: number;
  /** ISO 8601 */
  createdAt: string;
  /** ISO 8601 */
  updatedAt: string;
}

export interface OrderResponse {
  id: string;
  pedidoNumero: string;
  /** V1 compatibility: auth-user id (`clienteUserId` / AUTH_USER.id), not CLIENTE.id. */
  clienteId: string;
  vendedorId: string;
  items: {
    productId: string;
    nombre: string;
    cantidad: number;
    precioUnitario: number;
  }[];
  totalSinIva: number;
  iva: number;
  total: number;
  estado: OrderEstado;
  metodoPago: MetodoPagoPermitido;
  direccion: DireccionEntrega;
  observaciones?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderListFilters extends PaginationRequest {
  /** Filtra pedidos de un cliente específico (usado por VENDEDOR/ADMIN) */
  clienteId?: string;
  vendedorId?: string;
  estado?: OrderEstado;
}

export interface OrderListResponse {
  id: string;
  pedidoNumero: string;
  estado: OrderEstado;
  total: number;
  clienteNombre?: string;
  clienteApellido?: string;
  createdAt: string;
}

// ════════════════════════════════════════════
//  CONFIRMAR VISITA
// ════════════════════════════════════════════

/**
 * El vendedor confirma el pedido como parte del ciclo de vida operativo.
 */
export interface ConfirmOrderRequest {
  id: string;
}

export interface ConfirmOrderResponse {
  orderId: string;
  estado: OrderEstado.CONFIRMADO;
  mensaje: string;
}

// ════════════════════════════════════════════
//  ESTADOS
// ════════════════════════════════════════════

export interface UpdateOrderStatusRequest {
  id: string;
  estado: OrderEstado;
  notas?: string;
}

export interface CancelOrderRequest {
  id: string;
  motivo?: string;
}
