import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { PaginatedResponse, ProductResponse } from '@agua/contracts';
import { ClienteCatalogoService } from './cliente-catalogo.service';

const LIST_URL = 'https://api-aguafress.eadev.cloud/api/v1/products/list';
const SEARCH_URL = 'https://api-aguafress.eadev.cloud/api/v1/products/search';

const PRODUCT: ProductResponse = {
  id: 'producto-1',
  nombre: 'Agua mineral 500 ml',
  precioSinIva: 1000,
  porcentajeIva: 21,
  porcentajeImpuestos: 0,
  costoIva: 210,
  costoImpuestos: 0,
  precioFinal: 1210,
  stock: 12,
  vendedorId: 'vendedor-1',
  activo: true,
};

const PRODUCTS_RESPONSE: PaginatedResponse<ProductResponse> = {
  data: [PRODUCT],
  pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
};

const SEARCH_RESPONSE: PaginatedResponse<ProductResponse> = {
  data: [PRODUCT],
  pagination: { page: 2, limit: 10, total: 1, totalPages: 1 },
};

describe('ClienteCatalogoService', () => {
  let service: ClienteCatalogoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ClienteCatalogoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lists the provider products with the pagination params', () => {
    let response: PaginatedResponse<ProductResponse> | undefined;

    service.list('vendedor-1').subscribe((value) => (response = value));

    const request = httpMock.expectOne(
      (candidate) =>
        candidate.url === LIST_URL &&
        candidate.params.get('vendedorId') === 'vendedor-1' &&
        candidate.params.get('page') === '1' &&
        candidate.params.get('limit') === '20',
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.body).toBeNull();

    request.flush(PRODUCTS_RESPONSE);
    expect(response).toEqual(PRODUCTS_RESPONSE);
  });

  it('searches the provider products with the query and pagination params', () => {
    let response: PaginatedResponse<ProductResponse> | undefined;

    service.search('agua mineral', 'vendedor-1', 2, 10).subscribe((value) => (response = value));

    const request = httpMock.expectOne((candidate) => candidate.url === SEARCH_URL);
    expect(request.request.url).toBe(SEARCH_URL);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('q')).toBe('agua mineral');
    expect(request.request.params.get('vendedorId')).toBe('vendedor-1');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('limit')).toBe('10');
    expect(request.request.body).toBeNull();

    request.flush(SEARCH_RESPONSE);
    expect(response).toEqual(SEARCH_RESPONSE);
    expect(response?.data).toEqual([PRODUCT]);
    expect(response?.pagination).toEqual({ page: 2, limit: 10, total: 1, totalPages: 1 });
  });
});
