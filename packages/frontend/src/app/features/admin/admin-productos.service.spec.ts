import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { PaginatedResponse, ProductResponse } from '@agua/contracts';
import { AdminProductosService } from './admin-productos.service';

const LIST_URL = 'https://api-aguafress.eadev.cloud/api/v1/products/list';

const PRODUCT: ProductResponse = {
  id: 'product-1',
  nombre: 'Bidón 20L',
  precioSinIva: 1000,
  porcentajeIva: 21,
  porcentajeImpuestos: 0,
  costoIva: 210,
  costoImpuestos: 0,
  precioFinal: 1210,
  stock: 5,
  marca: 'Aguas del Sur',
  categoria: 'Bidones',
  vendedorId: 'vendedor-1',
  activo: true,
  mostrarPrecio: true,
};

const LIST_RESPONSE: PaginatedResponse<ProductResponse> = {
  data: [PRODUCT],
  pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
};

describe('AdminProductosService', () => {
  let service: AdminProductosService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminProductosService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('gets the products.list action with page and limit query params', () => {
    let response: PaginatedResponse<ProductResponse> | undefined;

    service.list({ page: 2, limit: 10 }).subscribe((value) => (response = value));

    const request = httpMock.expectOne(`${LIST_URL}?page=2&limit=10`);
    expect(request.request.method).toBe('GET');

    request.flush(LIST_RESPONSE);
    expect(response).toEqual(LIST_RESPONSE);
  });

  it('adds the vendedorId query param to filter by vendor', () => {
    service.list({ page: 1, limit: 20, vendedorId: 'vendedor-1' }).subscribe();

    const request = httpMock.expectOne(`${LIST_URL}?vendedorId=vendedor-1&page=1&limit=20`);
    expect(request.request.method).toBe('GET');

    request.flush(LIST_RESPONSE);
  });

  it('omits the vendedorId query param when not provided', () => {
    service.list({ page: 1, limit: 20 }).subscribe();

    const request = httpMock.expectOne(`${LIST_URL}?page=1&limit=20`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.has('vendedorId')).toBeFalse();

    request.flush(LIST_RESPONSE);
  });
});
