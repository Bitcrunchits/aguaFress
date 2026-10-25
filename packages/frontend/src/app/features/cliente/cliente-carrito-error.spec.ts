import { HttpErrorResponse } from '@angular/common/http';
import {
  ClienteCarritoFailure,
  classifyCartMutationFailure,
  classifyCartReadFailure,
} from './cliente-carrito-error';

function httpError(status: number, error: unknown = null): HttpErrorResponse {
  return new HttpErrorResponse({ status, error });
}

describe('classifyCartReadFailure', () => {
  it('maps a provider-selection 400 to ProviderLost', () => {
    expect(classifyCartReadFailure(httpError(400, { message: 'requiresSelection' }))).toBe(
      ClienteCarritoFailure.ProviderLost,
    );
  });

  it('reads a plain-text provider-selection message', () => {
    expect(classifyCartReadFailure(httpError(400, 'requiresSelection'))).toBe(
      ClienteCarritoFailure.ProviderLost,
    );
  });

  it('maps any other 400 to Unexpected', () => {
    expect(classifyCartReadFailure(httpError(400, { message: 'Bad request' }))).toBe(
      ClienteCarritoFailure.Unexpected,
    );
  });

  it('maps a 404 to ProviderLost', () => {
    expect(classifyCartReadFailure(httpError(404))).toBe(ClienteCarritoFailure.ProviderLost);
  });

  it('maps a 403 to Forbidden', () => {
    expect(classifyCartReadFailure(httpError(403))).toBe(ClienteCarritoFailure.Forbidden);
  });

  it('maps a 503 to OutOfStock', () => {
    expect(classifyCartReadFailure(httpError(503))).toBe(ClienteCarritoFailure.OutOfStock);
  });

  it('maps a transport failure to Network', () => {
    expect(classifyCartReadFailure(httpError(0))).toBe(ClienteCarritoFailure.Network);
  });

  it('maps an unknown error to Unexpected', () => {
    expect(classifyCartReadFailure(new Error('boom'))).toBe(ClienteCarritoFailure.Unexpected);
  });
});

describe('classifyCartMutationFailure', () => {
  it('maps a provider-selection 400 to ProviderLost', () => {
    expect(classifyCartMutationFailure(httpError(400, { message: 'requiresSelection' }))).toBe(
      ClienteCarritoFailure.ProviderLost,
    );
  });

  it('maps any other 400 to Unexpected', () => {
    expect(classifyCartMutationFailure(httpError(400, { message: 'Bad request' }))).toBe(
      ClienteCarritoFailure.Unexpected,
    );
  });

  it('maps the provider-scope 404 to ProviderLost', () => {
    expect(
      classifyCartMutationFailure(
        httpError(404, { message: 'Active provider relation not found' }),
      ),
    ).toBe(ClienteCarritoFailure.ProviderLost);
  });

  it('maps any other 404 to CartDrift', () => {
    const error = httpError(404, { message: 'Cart item was not found' });
    expect(classifyCartMutationFailure(error)).toBe(ClienteCarritoFailure.CartDrift);
  });

  it('maps a product 404 to CartDrift', () => {
    // The backend reports a product that disappeared as a 404; for a mutation
    // that is drift, not a lost provider scope.
    const error = httpError(404, { message: 'Product was not found' });
    expect(classifyCartMutationFailure(error)).toBe(ClienteCarritoFailure.CartDrift);
  });

  it('maps a 403 to Forbidden', () => {
    expect(classifyCartMutationFailure(httpError(403))).toBe(ClienteCarritoFailure.Forbidden);
  });

  it('maps a 503 to OutOfStock', () => {
    expect(classifyCartMutationFailure(httpError(503))).toBe(ClienteCarritoFailure.OutOfStock);
  });

  it('maps a transport failure to Network', () => {
    expect(classifyCartMutationFailure(httpError(0))).toBe(ClienteCarritoFailure.Network);
  });

  it('maps a non-http error to Unexpected', () => {
    expect(classifyCartMutationFailure(new Error('boom'))).toBe(ClienteCarritoFailure.Unexpected);
  });
});
