import { HttpErrorResponse } from '@angular/common/http';

/** Typed order-cancel failures. The page owns the Spanish copy. */
export enum ClientePedidoCancelError {
  Forbidden = 'cancel-forbidden',
  Network = 'cancel-network',
  Unexpected = 'cancel-unexpected',
}

/**
 * Maps `orders.cancel` failures. A 403 means the server rejected the cancel —
 * either the order left `PENDIENTE` or it no longer belongs to the
 * authenticated cliente — so the detail is reloaded to reflect the current
 * server-side state instead of surfacing an error. Every other failure stays
 * retryable inside the confirmation dialog.
 */
export function classifyPedidoCancelError(error: unknown): ClientePedidoCancelError {
  if (!(error instanceof HttpErrorResponse)) {
    return ClientePedidoCancelError.Unexpected;
  }

  switch (error.status) {
    case 403:
      return ClientePedidoCancelError.Forbidden;
    case 0:
      return ClientePedidoCancelError.Network;
    default:
      return ClientePedidoCancelError.Unexpected;
  }
}
