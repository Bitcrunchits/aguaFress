import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { CartResponse, DeleteCartItemV2Request, UpdateCartItemV2Request } from '@agua/contracts';
import { API_CONFIG } from '../../core/config/api.config';
import { ClienteCarritoEdicionService } from './cliente-carrito-edicion.service';

const UPDATE_CART_ITEM_URL = `${API_CONFIG.baseUrl}/api/v1/cart/items/update`;
const DELETE_CART_ITEM_URL = `${API_CONFIG.baseUrl}/api/v1/cart/items/delete`;

const CART_RESPONSE: CartResponse = {
  id: 'cart-1',
  clienteId: 'cliente-1',
  vendedorId: 'vendedor-1',
  items: [],
  total: 0,
  expiresAt: '2026-10-24T00:00:00.000Z',
};

describe('ClienteCarritoEdicionService', () => {
  let service: ClienteCarritoEdicionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ClienteCarritoEdicionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('updates a quantity with the provider-scoped body and no identity fields', () => {
    let response: CartResponse | undefined;
    const body: UpdateCartItemV2Request = {
      cartId: 'cart-1',
      vendedorId: 'vendedor-1',
      productoId: 'producto-1',
      cantidad: 3,
    };

    service.updateItem(body).subscribe((value) => (response = value));

    const request = httpMock.expectOne(UPDATE_CART_ITEM_URL);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual(body);

    request.flush(CART_RESPONSE);
    expect(response).toEqual(CART_RESPONSE);
  });

  it('deletes an item without sending cantidad, which the backend rejects', () => {
    let response: CartResponse | undefined;
    const body: DeleteCartItemV2Request = {
      cartId: 'cart-1',
      vendedorId: 'vendedor-1',
      productoId: 'producto-1',
    };

    service.deleteItem(body).subscribe((value) => (response = value));

    const request = httpMock.expectOne(DELETE_CART_ITEM_URL);
    expect(request.request.method).toBe('DELETE');
    expect(request.request.body).toEqual(body);
    expect('cantidad' in request.request.body).toBeFalse();

    request.flush(CART_RESPONSE);
    expect(response).toEqual(CART_RESPONSE);
  });
});
