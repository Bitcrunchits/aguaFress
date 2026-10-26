import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MetodoPago, OrderEstado, OrderJobStatus } from '@agua/contracts';
import type { OrderJobStatusResponse, OrderResponse } from '@agua/contracts';
import { API_CONFIG } from '../../core/config/api.config';
import { ClientePedidosService } from './cliente-pedidos.service';

const LIST_ORDERS_URL = `${API_CONFIG.baseUrl}/api/v1/orders/list`;
const GET_ORDER_URL = `${API_CONFIG.baseUrl}/api/v1/orders/get-by-id`;
const GET_JOB_STATUS_URL = `${API_CONFIG.baseUrl}/api/v1/orders/job-status`;

const ORDER: OrderResponse = {
  id: 'order-1',
  pedidoNumero: 'P-0001',
  clienteId: 'cliente-profile-1',
  vendedorId: 'vendedor-1',
  items: [
    {
      productId: 'product-1',
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
  direccion: {
    calle: 'Av. Corrientes',
    numero: '1234',
    barrio: 'Balvanera',
    ciudad: 'Buenos Aires',
    provincia: 'Buenos Aires',
    codigoPostal: 'C1084',
  },
  createdAt: '2026-10-24T00:00:00.000Z',
  updatedAt: '2026-10-24T00:00:00.000Z',
};

const JOB_STATUS: OrderJobStatusResponse = {
  clienteId: 'cliente-profile-1',
  idempotencyKey: 'key-1',
  jobId: 'job-1',
  trackingId: 'tracking-1',
  vendedorId: 'vendedor-1',
  status: OrderJobStatus.PROCESSING,
  attempts: 1,
  createdAt: '2026-10-24T00:00:00.000Z',
  updatedAt: '2026-10-24T00:00:05.000Z',
};

describe('ClientePedidosService', () => {
  let service: ClientePedidosService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ClientePedidosService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lists the authenticated cliente orders without identity params', () => {
    let response: OrderResponse[] | undefined;

    service.listOrders().subscribe((value) => (response = value));

    const request = httpMock.expectOne(LIST_ORDERS_URL);
    expect(request.request.method).toBe('GET');
    expect(request.request.body).toBeNull();
    expect(request.request.params.keys()).toEqual([]);

    request.flush([ORDER]);
    expect(response).toEqual([ORDER]);
  });

  it('gets an order by id as an encoded query param', () => {
    const orderId = 'order 1&2';
    let response: OrderResponse | undefined;

    service.getOrder(orderId).subscribe((value) => (response = value));

    const request = httpMock.expectOne(
      (candidate) =>
        candidate.urlWithParams === `${GET_ORDER_URL}?id=${encodeURIComponent(orderId)}`,
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.body).toBeNull();
    expect(request.request.urlWithParams).not.toContain('/get-by-id/');

    request.flush(ORDER);
    expect(response).toEqual(ORDER);
  });

  it('gets the job status by tracking id as an encoded query param', () => {
    const trackingId = 'tracking 1&2';
    let response: OrderJobStatusResponse | undefined;

    service.getJobStatus(trackingId).subscribe((value) => (response = value));

    const request = httpMock.expectOne(
      (candidate) =>
        candidate.urlWithParams ===
        `${GET_JOB_STATUS_URL}?id=${encodeURIComponent(trackingId)}`,
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.body).toBeNull();
    expect(request.request.urlWithParams).not.toContain('orderId');

    request.flush(JOB_STATUS);
    expect(response).toEqual(JOB_STATUS);
    expect(response?.status).toBe(OrderJobStatus.PROCESSING);
  });
});
