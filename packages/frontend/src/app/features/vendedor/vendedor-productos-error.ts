import { HttpErrorResponse } from '@angular/common/http';

/** Typed product failures. The page owns the Spanish copy. */
export enum VendedorProductosFailure {
  Validation = 'validation',
  Forbidden = 'forbidden',
  NotFound = 'not-found',
  Network = 'network',
  Unexpected = 'unexpected',
}

/**
 * Maps `products.*` failures. 403 also covers a vendedor that is not
 * `activo` yet: create/update resolve the vendedor with
 * `resolveActiveVendedorIdByAuthUserId`, which refuses non-active accounts.
 */
export function classifyProductosError(error: unknown): VendedorProductosFailure {
  if (!(error instanceof HttpErrorResponse)) {
    return VendedorProductosFailure.Unexpected;
  }

  switch (error.status) {
    case 400:
    case 422:
      return VendedorProductosFailure.Validation;
    case 403:
      return VendedorProductosFailure.Forbidden;
    case 404:
      return VendedorProductosFailure.NotFound;
    case 0:
      return VendedorProductosFailure.Network;
    default:
      return VendedorProductosFailure.Unexpected;
  }
}
