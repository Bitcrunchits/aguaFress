import { HttpErrorResponse } from '@angular/common/http';
import { ClienteProviderServerMessage } from './cliente-provider-contract';

/** Typed order-confirmation failures. The page owns the Spanish copy. */
export enum ClientePedidoFailure {
  Validation = 'validation',
  ProviderLost = 'provider-lost',
  Forbidden = 'forbidden',
  Network = 'network',
  Unexpected = 'unexpected',
}

/**
 * Maps `orders.create` failures. The gateway validates the stored provider
 * before enqueueing and answers `202`, so a 404 here means the provider scope
 * was rejected. An idempotency conflict is resolved by the order worker and
 * surfaces through the job status; it is not a synchronous `409`.
 */
export function classifyOrderCreateFailure(error: unknown): ClientePedidoFailure {
  if (!(error instanceof HttpErrorResponse)) {
    return ClientePedidoFailure.Unexpected;
  }

  switch (error.status) {
    case 400:
      return readServerMessage(error) === ClienteProviderServerMessage.RequiresSelection
        ? ClientePedidoFailure.ProviderLost
        : ClientePedidoFailure.Validation;
    case 404:
      return ClientePedidoFailure.ProviderLost;
    case 403:
      return ClientePedidoFailure.Forbidden;
    case 0:
      return ClientePedidoFailure.Network;
    default:
      return ClientePedidoFailure.Unexpected;
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
