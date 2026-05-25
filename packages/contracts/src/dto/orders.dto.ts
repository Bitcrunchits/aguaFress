// ─── Orders Service ───
// Puerto: 3004
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
 */
export interface AddCartItemRequest {
  productId: string;
  cantidad: number;
}

export interface CartItemResponse {
  id: string;
  productId: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
}

export interface CartResponse {
  items: CartItemResponse[];
  totalSinIva: number;
  iva: number;
  total: number;
}

export interface UpdateCartItemRequest {
  cantidad: number;
}

// ════════════════════════════════════════════
//  PEDIDOS
// ════════════════════════════════════════════

/**
 * Crear un pedido desde el carrito del usuario autenticado.
 * - userId y clienteId se obtienen del token JWT
 * - Los precios se calculan server-side contra products-service
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
  cliente: { id: string; nombre: string };
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
  createdAt: string;
}

export interface OrderListFilters extends PaginationRequest {
  userId?: string;
  vendedorId?: string;
  estado?: OrderEstado;
}

export interface OrderListResponse {
  id: string;
  pedidoNumero: string;
  estado: OrderEstado;
  total: number;
  clienteNombre?: string;
  createdAt: string;
}

// ════════════════════════════════════════════
//  ESTADOS
// ════════════════════════════════════════════

export interface UpdateOrderStatusRequest {
  estado: OrderEstado;
}

export interface CancelOrderRequest {
  motivo?: string;
}
