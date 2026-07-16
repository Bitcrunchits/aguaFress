import type { CartResponse } from './cart.dto';
import type { CartRecord } from './cart.repository';

export function toCartResponse(cart: CartRecord): CartResponse {
  const items = cart.items.map((item) => {
    const subtotal = item.cantidad * item.precioUnitario;
    return {
      id: item.id,
      productoId: item.productoId,
      nombre: item.nombre,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
      subtotal,
    };
  });

  return {
    id: cart.id,
    clienteId: cart.usuarioId,
    vendedorId: cart.vendedorId,
    expiresAt: cart.expiresAt.toISOString(),
    items,
    total: items.reduce((total, item) => total + item.subtotal, 0),
  };
}
