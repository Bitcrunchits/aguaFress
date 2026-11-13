import type { OrderResponse, VendedorClienteItemV2 } from '@agua/contracts';

/**
 * Pure name-resolution helpers for vendedor order screens. Kept free of
 * Angular/HTTP so the join between `OrderResponse.clienteId` (AUTH_USER.id)
 * and the cartera lookup can be unit-tested in isolation.
 */

/** Lookup keyed by `VendedorClienteItemV2.clienteUserId` (== `OrderResponse.clienteId`). */
export type ClienteLookupMap = ReadonlyMap<string, VendedorClienteItemV2>;

export const CLIENTE_FALLBACK = 'Cliente no disponible';

/** Builds an O(1) `clienteUserId → cartera item` map from a flat cartera list. */
export function buildClienteLookup(items: readonly VendedorClienteItemV2[]): ClienteLookupMap {
  const map = new Map<string, VendedorClienteItemV2>();
  for (const item of items) {
    map.set(item.clienteUserId, item);
  }
  return map;
}

/** Formats a cartera item as "nombre apellido" (or just nombre), with undefined handling. */
export function formatClienteNombre(item: VendedorClienteItemV2): string {
  return item.apellido ? `${item.nombre} ${item.apellido}` : item.nombre;
}

/**
 * Resolves the display name for an order's `clienteId`, or the fallback when
 * the cartera lookup has no matching `clienteUserId`.
 */
export function resolveClienteNombre(order: OrderResponse, lookup: ClienteLookupMap): string {
  const cliente = lookup.get(order.clienteId);
  return cliente === undefined ? CLIENTE_FALLBACK : formatClienteNombre(cliente);
}
