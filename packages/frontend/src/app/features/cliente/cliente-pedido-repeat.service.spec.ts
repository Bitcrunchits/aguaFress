import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { CartResponse } from '@agua/contracts';
import { API_CONFIG } from '../../core/config/api.config';
import { ClientePedidoRepeatService } from './cliente-pedido-repeat.service';

const ADD_CART_ITEM_URL = `${API_CONFIG.baseUrl}/api/v1/cart/items/add`;

const CART: CartResponse = {
  id: 'cart-1',
  clienteId: 'user-1',
  vendedorId: 'vendedor-1',
  items: [],
  total: 0,
  expiresAt: '2026-10-25T00:00:00.000Z',
};

describe('ClientePedidoRepeatService', () => {
  let service: ClientePedidoRepeatService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ClientePedidoRepeatService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('adds a single item with a provider-scoped body and no identity fields', () => {
    let response: CartResponse | undefined;

    service
      .addItem({ vendedorId: 'vendedor-1', productoId: 'producto-1', cantidad: 2 })
      .subscribe((value) => (response = value));

    const request = httpMock.expectOne(ADD_CART_ITEM_URL);
    expect(request.request.method).toBe('POST');
    // Identity comes from the JWT: the body carries only provider + product.
    expect(request.request.body).toEqual({
      vendedorId: 'vendedor-1',
      productoId: 'producto-1',
      cantidad: 2,
    });

    request.flush(CART);
    expect(response).toEqual(CART);
  });
});
