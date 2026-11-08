import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type {
  CategoriaResponse,
  CreateProductRequest,
  PaginatedResponse,
  ProductResponse,
} from '@agua/contracts';
import { VendedorProductosService } from './vendedor-productos.service';

const BASE = 'https://api-aguafress.eadev.cloud/api/v1';

const PRODUCTO: ProductResponse = {
  id: 'prod-1',
  nombre: 'Bidón 20 L',
  precioSinIva: 1000,
  porcentajeIva: 21,
  porcentajeImpuestos: 0,
  costoIva: 210,
  costoImpuestos: 0,
  precioFinal: 1210,
  stock: 5,
  categoria: 'Agua',
  vendedorId: 'vendedor-1',
  activo: true,
};

const CREATE_REQUEST: CreateProductRequest = {
  nombre: 'Bidón 20 L',
  precioSinIva: 1000,
  porcentajeIva: 21,
  stock: 5,
  categoriaId: 'cat-1',
  mostrarPrecio: true,
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

  it('lists own products scoped by the JWT, without vendedorId', () => {
    const body: PaginatedResponse<ProductResponse> = {
      data: [PRODUCTO],
      pagination: { page: 2, limit: 10, total: 11, totalPages: 2 },
    };
    let response: PaginatedResponse<ProductResponse> | undefined;

    service.list(2, 10).subscribe((value) => (response = value));

    const request = httpMock.expectOne(`${BASE}/products/list?page=2&limit=10`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.has('vendedorId')).toBeFalse();
    request.flush(body);
    expect(response).toEqual(body);
  });

  it('gets a product by id through the id query param', () => {
    let response: ProductResponse | undefined;

    service.get('prod-1').subscribe((value) => (response = value));

    const request = httpMock.expectOne(`${BASE}/products/get?id=prod-1`);
    expect(request.request.method).toBe('GET');
    request.flush(PRODUCTO);
    expect(response).toEqual(PRODUCTO);
  });

  it('creates a product with the typed body and no identity fields', () => {
    service.create(CREATE_REQUEST).subscribe();

    const request = httpMock.expectOne(`${BASE}/products/create`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(CREATE_REQUEST);
    const sentKeys = Object.keys(request.request.body as object);
    expect(sentKeys).not.toContain('vendedorId');
    expect(sentKeys).not.toContain('userId');
    request.flush(PRODUCTO);
  });

  it('updates a product with PATCH and the id as query param', () => {
    service.update('prod-1', { nombre: 'Bidón 12 L' }).subscribe();

    const request = httpMock.expectOne(`${BASE}/products/update?id=prod-1`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ nombre: 'Bidón 12 L' });
    request.flush({ ...PRODUCTO, nombre: 'Bidón 12 L' });
  });

  it('deactivates a product with DELETE and completes without a body', () => {
    let completed = false;

    service.deactivate('prod-1').subscribe({ complete: () => (completed = true) });

    const request = httpMock.expectOne(`${BASE}/products/delete?id=prod-1`);
    expect(request.request.method).toBe('DELETE');
    request.flush({ deleted: true });
    expect(completed).toBeTrue();
  });

  it('lists the vendedor active categories without vendedorId', () => {
    const categorias: CategoriaResponse[] = [
      {
        id: 'cat-1',
        nombre: 'Agua',
        orden: 1,
        vendedorId: 'vendedor-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    let response: CategoriaResponse[] | undefined;

    service.listCategorias().subscribe((value) => (response = value));

    const request = httpMock.expectOne(`${BASE}/categories/list`);
    expect(request.request.method).toBe('GET');
    request.flush(categorias);
    expect(response).toEqual(categorias);
  });
});
