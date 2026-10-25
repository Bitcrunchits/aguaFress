import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MetodoPago, OrderJobStatus } from '@agua/contracts';
import type { AsyncAcceptedResponse, CreateOrderV2Request } from '@agua/contracts';
import { API_CONFIG } from '../../core/config/api.config';
import { ClientePedidoService } from './cliente-pedido.service';

const CREATE_ORDER_URL = `${API_CONFIG.baseUrl}/api/v1/orders/create`;

const ACCEPTED_RESPONSE: AsyncAcceptedResponse = {
  jobId: 'job-1',
  trackingId: 'tracking-1',
  vendedorId: 'vendedor-1',
  status: OrderJobStatus.PENDING,
  statusUrl: '/api/v1/orders/job-status?id=tracking-1',
  acceptedAt: '2026-10-24T00:00:00.000Z',
};

describe('ClientePedidoService', () => {
  let service: ClientePedidoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ClientePedidoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('creates the order with the idempotency header and no identity fields', () => {
    let response: AsyncAcceptedResponse | undefined;
    const body: CreateOrderV2Request = {
      vendedorId: 'vendedor-1',
      metodoPago: MetodoPago.CONTRA_ENTREGA,
      direccion: {
        calle: 'Av. Corrientes',
        numero: '1234',
        barrio: 'Balvanera',
        ciudad: 'Buenos Aires',
        provincia: 'Buenos Aires',
        codigoPostal: 'C1084',
      },
    };

    service.createOrder(body, 'key-1').subscribe((value) => (response = value));

    const request = httpMock.expectOne(CREATE_ORDER_URL);
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Idempotency-Key')).toBe('key-1');
    expect(request.request.body).toEqual(body);
    expect('userId' in request.request.body).toBeFalse();
    expect('clienteId' in request.request.body).toBeFalse();

    request.flush(ACCEPTED_RESPONSE);
    expect(response).toEqual(ACCEPTED_RESPONSE);
  });
});
