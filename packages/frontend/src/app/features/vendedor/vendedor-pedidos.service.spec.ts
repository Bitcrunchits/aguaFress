import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MetodoPago, OrderEstado, type OrderResponse } from '@agua/contracts';
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
});
