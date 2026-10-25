import { HttpErrorResponse } from '@angular/common/http';
import { ClienteProviderServerMessage } from './cliente-provider-contract';

/** Exact server messages that identify cart-specific failures. */
export enum ClienteCarritoServerMessage {
  ProviderScopeLost = 'Active provider relation not found',
}

/**
 * Typed cart failures. Reads and mutations classify a 404 differently: a
 * `cart.get` 404 can only mean the gateway rejected the stored provider
 * (a missing cart answers `null`), while a mutation 404 is usually a cart
 * that changed underneath the screen. Collapsing both into "stale provider"
 * would silently drop a valid selection.
 */
export enum ClienteCarritoFailure {
  ProviderLost = 'provider-lost',
  CartDrift = 'cart-drift',
  OutOfStock = 'out-of-stock',
  Forbidden = 'forbidden',
  Network = 'network',
  Unexpected = 'unexpected',
}

export function classifyCartReadFailure(error: unknown): ClienteCarritoFailure {
  if (!(error instanceof HttpErrorResponse)) {
    return ClienteCarritoFailure.Unexpected;
  }

  switch (error.status) {
    case 400:
      return readServerMessage(error) === ClienteProviderServerMessage.RequiresSelection
        ? ClienteCarritoFailure.ProviderLost
        : ClienteCarritoFailure.Unexpected;
    case 404:
      return ClienteCarritoFailure.ProviderLost;
    case 403:
      return ClienteCarritoFailure.Forbidden;
    case 503:
      return ClienteCarritoFailure.OutOfStock;
    case 0:
      return ClienteCarritoFailure.Network;
    default:
      return ClienteCarritoFailure.Unexpected;
  }
}

export function classifyCartMutationFailure(error: unknown): ClienteCarritoFailure {
  if (!(error instanceof HttpErrorResponse)) {
    return ClienteCarritoFailure.Unexpected;
  }

  switch (error.status) {
    case 400:
      return readServerMessage(error) === ClienteProviderServerMessage.RequiresSelection
        ? ClienteCarritoFailure.ProviderLost
        : ClienteCarritoFailure.Unexpected;
    case 404:
      return readServerMessage(error) === ClienteCarritoServerMessage.ProviderScopeLost
        ? ClienteCarritoFailure.ProviderLost
        : ClienteCarritoFailure.CartDrift;
    case 403:
      return ClienteCarritoFailure.Forbidden;
    case 503:
      return ClienteCarritoFailure.OutOfStock;
    case 0:
      return ClienteCarritoFailure.Network;
    default:
      return ClienteCarritoFailure.Unexpected;
  }
}

function readServerMessage(error: HttpErrorResponse): string {
  const body: unknown = error.error;
  if (typeof body === 'string') {
    return body;
  }
  if (typeof body === 'object' && body !== null && 'message' in body) {
    const message: unknown = (body as { message?: unknown }).message;
    return typeof message === 'string' ? message : '';
  }
  return '';
}
