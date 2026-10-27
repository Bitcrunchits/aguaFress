import { HttpErrorResponse } from '@angular/common/http';

/** Typed order-detail failures. The page owns the Spanish copy. */
export enum ClientePedidoDetalleError {
  NotFound = 'detail-not-found',
  Network = 'detail-network',
  Unexpected = 'detail-unexpected',
}

/**
 * Maps `orders.get-by-id` failures. A 404 means the order is not visible to
 * the authenticated cliente; the detail page offers a way back instead of a
 * retry. Transport and unexpected failures stay retryable.
 */
export function classifyPedidoDetalleError(error: unknown): ClientePedidoDetalleError {
  if (!(error instanceof HttpErrorResponse)) {
    return ClientePedidoDetalleError.Unexpected;
  }

  switch (error.status) {
    case 404:
      return ClientePedidoDetalleError.NotFound;
    case 0:
      return ClientePedidoDetalleError.Network;
    default:
      return ClientePedidoDetalleError.Unexpected;
  }
}
