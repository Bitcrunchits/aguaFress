import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { AddCartItemV2Request, CartResponse } from '@agua/contracts';
import { ClienteCarritoService } from './cliente-carrito.service';

const ADD_CART_ITEM_URL = 'https://api-aguafress.eadev.cloud/api/v1/cart/items/add';

const CART_RESPONSE: CartResponse = {
  id: 'cart-1',
  clienteId: 'cliente-1',
  vendedorId: 'vendedor-1',
  items: [
    {
      id: 'item-1',
      productoId: 'producto-1',
      nombre: 'Agua mineral 500 ml',
      cantidad: 1,
      precioUnitario: 1210,
      subtotal: 1210,
    },
  ],
  total: 1210,
  expiresAt: '2026-10-24T00:00:00.000Z',
};

describe('ClienteCarritoService', () => {
  let service: ClienteCarritoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ClienteCarritoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('adds one unit with the provider-scoped body and no identity fields', () => {
    let response: CartResponse | undefined;
    const body: AddCartItemV2Request = {
      vendedorId: 'vendedor-1',
      productoId: 'producto-1',
      cantidad: 1,
    };

    service.addToCart(body).subscribe((value) => (response = value));

    const request = httpMock.expectOne(ADD_CART_ITEM_URL);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);

    request.flush(CART_RESPONSE);
    expect(response).toEqual(CART_RESPONSE);
  });
});
