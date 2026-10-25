import { HttpErrorResponse } from '@angular/common/http';
import { ClientePedidoFailure, classifyOrderCreateFailure } from './cliente-pedido-error';

function httpError(status: number, error: unknown = null): HttpErrorResponse {
  return new HttpErrorResponse({ status, error });
}

describe('classifyOrderCreateFailure', () => {
  it('maps a provider-selection 400 to ProviderLost', () => {
    expect(
      classifyOrderCreateFailure(httpError(400, { message: 'requiresSelection' })),
    ).toBe(ClientePedidoFailure.ProviderLost);
  });

  it('reads a plain-text provider-selection message', () => {
    expect(classifyOrderCreateFailure(httpError(400, 'requiresSelection'))).toBe(
      ClientePedidoFailure.ProviderLost,
    );
  });

  it('maps any other 400 to Validation', () => {
    expect(
      classifyOrderCreateFailure(httpError(400, { message: 'Invalid delivery address' })),
    ).toBe(ClientePedidoFailure.Validation);
  });

  it('maps a 404 to ProviderLost', () => {
    expect(classifyOrderCreateFailure(httpError(404))).toBe(ClientePedidoFailure.ProviderLost);
  });

  it('maps a 403 to Forbidden', () => {
    expect(classifyOrderCreateFailure(httpError(403))).toBe(ClientePedidoFailure.Forbidden);
  });

  it('maps a transport failure to Network', () => {
    expect(classifyOrderCreateFailure(httpError(0))).toBe(ClientePedidoFailure.Network);
  });

  it('does not treat a 409 as a synchronous conflict', () => {
    // The gateway answers 202 before the worker resolves the idempotency key,
    // so a synchronous 409 is outside the contract.
    expect(classifyOrderCreateFailure(httpError(409))).toBe(ClientePedidoFailure.Unexpected);
  });

  it('maps an unknown error to Unexpected', () => {
    expect(classifyOrderCreateFailure(new Error('boom'))).toBe(
      ClientePedidoFailure.Unexpected,
    );
  });
});
