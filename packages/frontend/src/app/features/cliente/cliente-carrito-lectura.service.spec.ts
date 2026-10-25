import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { CartResponse } from '@agua/contracts';
import { API_CONFIG } from '../../core/config/api.config';
import { ClienteCarritoLecturaService } from './cliente-carrito-lectura.service';

const CART_GET_URL = `${API_CONFIG.baseUrl}/api/v1/cart/get`;

const CART_RESPONSE: CartResponse = {
  id: 'cart-1',
  clienteId: 'cliente-1',
  vendedorId: 'vendedor-1',
  items: [],
  total: 0,
  expiresAt: '2026-10-24T00:00:00.000Z',
};

describe('ClienteCarritoLecturaService', () => {
  let service: ClienteCarritoLecturaService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ClienteCarritoLecturaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('reads the active cart scoped by the selected provider', () => {
    let response: CartResponse | null | undefined;

    service.getCart('vendedor-1').subscribe((value) => (response = value));

    const request = httpMock.expectOne(
      (candidate) =>
        candidate.url === CART_GET_URL && candidate.params.get('vendedorId') === 'vendedor-1',
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual(['vendedorId']);

    request.flush(CART_RESPONSE);
    expect(response).toEqual(CART_RESPONSE);
  });

  it('types a missing active cart as null instead of an error', () => {
    let response: CartResponse | null | undefined;
    let failed = false;

    service.getCart('vendedor-1').subscribe({
      next: (value) => (response = value),
      error: () => (failed = true),
    });

    httpMock.expectOne((candidate) => candidate.url === CART_GET_URL).flush(null);

    expect(failed).toBe(false);
    expect(response).toBeNull();
  });
});
