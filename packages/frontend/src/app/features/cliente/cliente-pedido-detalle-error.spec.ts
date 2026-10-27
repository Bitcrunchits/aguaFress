import { HttpErrorResponse } from '@angular/common/http';
import {
  ClientePedidoDetalleError,
  classifyPedidoDetalleError,
} from './cliente-pedido-detalle-error';

function httpError(status: number, error: unknown = null): HttpErrorResponse {
  return new HttpErrorResponse({ status, error });
}

describe('classifyPedidoDetalleError', () => {
  it('maps a 404 to NotFound', () => {
    expect(classifyPedidoDetalleError(httpError(404))).toBe(
      ClientePedidoDetalleError.NotFound,
    );
  });

  it('maps a transport failure to Network', () => {
    expect(classifyPedidoDetalleError(httpError(0))).toBe(
      ClientePedidoDetalleError.Network,
    );
  });

  it('maps any other HTTP status to Unexpected', () => {
    expect(classifyPedidoDetalleError(httpError(500))).toBe(
      ClientePedidoDetalleError.Unexpected,
    );
    expect(classifyPedidoDetalleError(httpError(403))).toBe(
      ClientePedidoDetalleError.Unexpected,
    );
  });

  it('maps a non-HTTP error to Unexpected', () => {
    expect(classifyPedidoDetalleError(new Error('boom'))).toBe(
      ClientePedidoDetalleError.Unexpected,
    );
  });
});
