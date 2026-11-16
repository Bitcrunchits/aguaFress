import type { DireccionEntrega, OrderListResponse, OrderListResponseV2 } from '@agua/contracts';
import type { OrderResponse } from './orders.dto';
import type { OrderRecord } from './orders.repository';

export function toOrderResponse(order: OrderRecord): OrderResponse {
  return {
    id: order.id,
    pedidoNumero: order.pedidoNumero,
    clienteId: order.usuarioId,
    vendedorId: order.vendedorId,
    items: order.items.map((item) => ({
      productId: item.productoId,
      nombre: item.nombre,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
    })),
    totalSinIva: order.totalSinIva,
    iva: order.iva,
    total: order.total,
    estado: order.estado,
    metodoPago: order.metodoPago,
    direccion: order.direccion,
    observaciones: order.observaciones ?? undefined,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

export function toOrderListResponse(order: OrderRecord, clienteNombre?: string, clienteApellido?: string): OrderListResponse {
  return {
    id: order.id,
    pedidoNumero: order.pedidoNumero,
    estado: order.estado,
    total: order.total,
    clienteNombre,
    clienteApellido,
    createdAt: order.createdAt.toISOString(),
  };
}

export function toOrderListResponseV2(
  order: OrderRecord,
  clienteNombre?: string,
  clienteApellido?: string,
  vendedorNombre?: string,
  vendedorEmpresa?: string,
): OrderListResponseV2 {
  return {
    ...toOrderListResponse(order, clienteNombre, clienteApellido),
    vendedorId: order.vendedorId,
    vendedorNombre,
    vendedorEmpresa,
  };
}

export function toDireccionEntrega(value: unknown): DireccionEntrega {
  if (!isDireccionEntrega(value)) {
    throw new Error('Stored order address is invalid');
  }

  return value;
}

function isDireccionEntrega(value: unknown): value is DireccionEntrega {
  return typeof value === 'object' && value !== null && 'calle' in value && 'numero' in value;
}
