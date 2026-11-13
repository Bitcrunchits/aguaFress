import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MetodoPago, OrderEstado } from '@agua/contracts';
import type { ConfirmOrderResponse, OrderResponse } from '@agua/contracts';
import { VendedorPedidosService } from './vendedor-pedidos.service';

const BASE = 'https://api-aguafress.eadev.cloud';

const ORDER: OrderResponse = {
  id: 'order-1',
  pedidoNumero: 'P-0001',
  clienteId: 'cliente-user-1',
  vendedorId: 'vendedor-1',
  items: [
    {
      productId: 'producto-1',
      nombre: 'Agua mineral 500 ml',
      cantidad: 2,
      precioUnitario: 1000,
    },
  ],
  totalSinIva: 2000,
  iva: 420,
  total: 2420,
  estado: OrderEstado.PENDIENTE,
  metodoPago: MetodoPago.CONTRA_ENTREGA,
  direccion: { calle: 'Av. Corrientes', numero: '1234' },
  createdAt: '2026-10-24T00:00:00.000Z',
  updatedAt: '2026-10-24T00:00:00.000Z',
};

describe('VendedorPedidosService', () => {
  let service: VendedorPedidosService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(VendedorPedidosService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lists the vendedor orders with no query params and no identity field', () => {
    let response: OrderResponse[] | undefined;

    service.list().subscribe((value) => (response = value));

    const request = httpMock.expectOne(
      (candidate) =>
        candidate.url === `${BASE}/api/v1/orders/list` &&
        candidate.params.get('vendedorId') === null &&
        candidate.params.get('clienteId') === null &&
        candidate.params.get('estado') === null,
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.body).toBeNull();

    request.flush([ORDER]);
    expect(response).toEqual([ORDER]);
  });

  it('gets an order by id as an encoded query param with no identity field', () => {
    const orderId = 'order 1&2';
    let response: OrderResponse | undefined;

    service.getById(orderId).subscribe((value) => (response = value));

    const request = httpMock.expectOne(
      (candidate) =>
        candidate.urlWithParams === `${BASE}/api/v1/orders/get-by-id?id=${encodeURIComponent(orderId)}`,
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.body).toBeNull();
    expect(request.request.urlWithParams).not.toContain('/get-by-id/');
    expect(request.request.urlWithParams).not.toContain('vendedorId');
    expect(request.request.urlWithParams).not.toContain('userId');

    request.flush(ORDER);
    expect(response).toEqual(ORDER);
  });

  it('confirms an order with the id in the body and no identity field', () => {
    const confirmed: ConfirmOrderResponse = {
      orderId: 'order-1',
      estado: OrderEstado.CONFIRMADO,
      mensaje: 'Pedido confirmado',
    };
    let response: ConfirmOrderResponse | undefined;

    service.confirm('order-1').subscribe((value) => (response = value));

    const request = httpMock.expectOne(`${BASE}/api/v1/orders/confirm`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ id: 'order-1' });
    const body = request.request.body as Record<string, unknown>;
    expect(body['vendedorId']).toBeUndefined();
    expect(body['userId']).toBeUndefined();

    request.flush(confirmed);
    expect(response).toEqual(confirmed);
  });

  it('updates the status with estado only (no notas)', () => {
    service.updateStatus('order-1', OrderEstado.EN_CAMINO).subscribe();

    const request = httpMock.expectOne(`${BASE}/api/v1/orders/status/update`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ id: 'order-1', estado: OrderEstado.EN_CAMINO });

    request.flush({ ...ORDER, estado: OrderEstado.EN_CAMINO });
  });

  it('updates the status with notas when provided', () => {
    service.updateStatus('order-1', OrderEstado.ENTREGADO, 'Entregado en mano').subscribe();

    const request = httpMock.expectOne(`${BASE}/api/v1/orders/status/update`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({
      id: 'order-1',
      estado: OrderEstado.ENTREGADO,
      notas: 'Entregado en mano',
    });

    request.flush({ ...ORDER, estado: OrderEstado.ENTREGADO });
  });
});
