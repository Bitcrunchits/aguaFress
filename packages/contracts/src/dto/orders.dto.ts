// ─── Orders Service ───
// Puerto: 3014
// Base de datos: PostgreSQL
// Unifica: carrito + pedidos + facturas
//
// ⚠️ REGLA DE SEGURIDAD: userId/clienteId NUNCA viene del body.
//    Se extrae del token JWT en el middleware. Si un endpoint necesita
//    el usuario autenticado, lo lee del token, NO del request body.

import { MetodoPago, OrderEstado } from '../enums';
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
 * - userId y clienteId se obtienen del token JWT
 * - Los precios se calculan server-side contra products-service
 * - Hasta que exista el adaptador real de productos, puede devolver 503 controlado
 * - No se aceptan otros métodos de pago en MVP V1
 */
export interface CreateOrderRequest {
  metodoPago: MetodoPagoPermitido;
  direccion: DireccionEntrega;
  observaciones?: string;
}

export interface OrderResponse {
  id: string;
  pedidoNumero: string;
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
