import { HttpErrorResponse } from '@angular/common/http';
import {
  ClientePedidoCancelError,
  classifyPedidoCancelError,
} from './cliente-pedido-cancel-error';

function httpError(status: number): HttpErrorResponse {
  return new HttpErrorResponse({ status });
}

describe('classifyPedidoCancelError', () => {
  it('maps a 403 to Forbidden', () => {
    expect(classifyPedidoCancelError(httpError(403))).toBe(
      ClientePedidoCancelError.Forbidden,
    );
  });

  it('maps a transport failure to Network', () => {
    expect(classifyPedidoCancelError(httpError(0))).toBe(ClientePedidoCancelError.Network);
  });

  it('maps any other HTTP status to Unexpected', () => {
    expect(classifyPedidoCancelError(httpError(500))).toBe(
      ClientePedidoCancelError.Unexpected,
    );
  });

  it('maps a non-HTTP error to Unexpected', () => {
    expect(classifyPedidoCancelError(new Error('boom'))).toBe(
      ClientePedidoCancelError.Unexpected,
    );
  });
});
