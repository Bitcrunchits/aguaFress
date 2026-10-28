import { HttpErrorResponse } from '@angular/common/http';

/** Typed orders-list failures. The page owns the Spanish copy. */
export enum ClientePedidosListError {
  Forbidden = 'forbidden',
  Network = 'network',
  Unexpected = 'unexpected',
}

/**
 * Maps `orders.list` failures. The endpoint is scoped by the JWT, so there is
 * no provider-scope recovery here: a refused session is handled by the auth
 * layer, while the page can only offer a retry for the remaining outcomes.
 */
export function classifyPedidosListError(error: unknown): ClientePedidosListError {
  if (!(error instanceof HttpErrorResponse)) {
    return ClientePedidosListError.Unexpected;
  }

  switch (error.status) {
    case 403:
      return ClientePedidosListError.Forbidden;
    case 0:
      return ClientePedidosListError.Network;
    default:
      return ClientePedidosListError.Unexpected;
  }
}
