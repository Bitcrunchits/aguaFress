import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { CreateProductRequest, PaginatedResponse, ProductResponse } from '@agua/contracts';
import { VendedorProductosService } from './vendedor-productos.service';

const BASE = 'https://api-aguafress.eadev.cloud';

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
  categoria: 'Agua',
  marca: 'Manantial',
  vendedorId: 'vendedor-1',
  activo: true,
  mostrarPrecio: true,
};

const PRODUCTS_RESPONSE: PaginatedResponse<ProductResponse> = {
  data: [PRODUCT],
  pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
};

describe('VendedorProductosService', () => {
  let service: VendedorProductosService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(VendedorProductosService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lists the vendedor products with page and limit only (no vendedorId)', () => {
    let response: PaginatedResponse<ProductResponse> | undefined;

    service.list(2, 10).subscribe((value) => (response = value));

    const request = httpMock.expectOne(
      (candidate) =>
        candidate.url === `${BASE}/api/v1/products/list` &&
        candidate.params.get('page') === '2' &&
        candidate.params.get('limit') === '10' &&
        candidate.params.get('vendedorId') === null,
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.body).toBeNull();

    request.flush(PRODUCTS_RESPONSE);
    expect(response).toEqual(PRODUCTS_RESPONSE);
  });

  it('gets a single product by id in the query string', () => {
    let response: ProductResponse | undefined;

    service.get('producto-1').subscribe((value) => (response = value));

    const request = httpMock.expectOne(
      (candidate) =>
        candidate.url === `${BASE}/api/v1/products/get` &&
        candidate.params.get('id') === 'producto-1',
    );
    expect(request.request.method).toBe('GET');

    request.flush(PRODUCT);
    expect(response).toEqual(PRODUCT);
  });

  it('creates a product posting the typed body without vendedorId', () => {
    const body: CreateProductRequest = {
      nombre: 'Agua mineral 500 ml',
      precioSinIva: 1000,
      categoriaId: 'categoria-1',
      stock: 12,
      mostrarPrecio: true,
    };
    let response: { id: string; created: boolean } | undefined;

    service.create(body).subscribe((value) => (response = value));

    const request = httpMock.expectOne(`${BASE}/api/v1/products/create`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    expect(request.request.body.vendedorId).toBeUndefined();

    request.flush({ id: 'producto-1', created: true });
    expect(response).toEqual({ id: 'producto-1', created: true });
  });

  it('updates a product with the id in the query string and body', () => {
    const body = { stock: 5 };
    let response: { id: string; updated: boolean } | undefined;

    service.update('producto-1', body).subscribe((value) => (response = value));

    const request = httpMock.expectOne(
      (candidate) =>
        candidate.url === `${BASE}/api/v1/products/update` &&
        candidate.params.get('id') === 'producto-1',
    );
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual(body);

    request.flush({ id: 'producto-1', updated: true });
    expect(response).toEqual({ id: 'producto-1', updated: true });
  });

  it('soft-deletes a product by id in the query string', () => {
    let response: { deleted: boolean } | undefined;

    service.delete('producto-1').subscribe((value) => (response = value));

    const request = httpMock.expectOne(
      (candidate) =>
        candidate.url === `${BASE}/api/v1/products/delete` &&
        candidate.params.get('id') === 'producto-1',
    );
    expect(request.request.method).toBe('DELETE');
    expect(request.request.body).toBeNull();

    request.flush({ deleted: true });
    expect(response).toEqual({ deleted: true });
  });

  it('uploads a product image as multipart and maps the response to /uploads', () => {
    const file = new File(['contenido'], 'producto.webp', { type: 'image/webp' });
    let url: string | undefined;

    service.uploadImage(file).subscribe((value) => (url = value));

    const request = httpMock.expectOne(`${BASE}/api/v1/upload/product-image`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeInstanceOf(FormData);

    const body = request.request.body as FormData;
    expect(body.get('file')).toBe(file);

    request.flush({ imageId: 'products/producto.webp' });
    expect(url).toBe('/uploads/products/producto.webp');
  });
});
