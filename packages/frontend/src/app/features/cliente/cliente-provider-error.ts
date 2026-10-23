import { HttpErrorResponse } from '@angular/common/http';
import { ClienteProviderServerMessage } from './cliente-provider-contract';

/**
 * A 404 or a 400 `requiresSelection` means the stored provider is no longer
 * valid. Catalog reads and cart writes share this recovery rule: clear the
 * stored id and return to the cliente home.
 */
export function isStaleProviderError(error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse)) {
    return false;
  }
  if (error.status === 404) {
    return true;
  }
  return (
    error.status === 400 &&
    readServerMessage(error) === ClienteProviderServerMessage.RequiresSelection
  );
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
