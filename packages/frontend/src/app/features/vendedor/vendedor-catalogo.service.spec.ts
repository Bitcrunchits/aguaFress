import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { CategoriaResponse, CreateCategoriaRequest, MarcaResponse } from '@agua/contracts';
import { VendedorCatalogoService } from './vendedor-catalogo.service';

const BASE = 'https://api-aguafress.eadev.cloud';

const CATEGORIAS: CategoriaResponse[] = [
  {
    id: 'categoria-1',
    nombre: 'Agua',
    orden: 1,
    vendedorId: 'vendedor-1',
    activo: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

const MARCAS: MarcaResponse[] = [
  {
    id: 'marca-1',
    nombre: 'Manantial',
    vendedorId: 'vendedor-1',
    activo: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

describe('VendedorCatalogoService', () => {
  let service: VendedorCatalogoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(VendedorCatalogoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lists the vendedor categories as a plain array (no vendedorId)', () => {
    let response: CategoriaResponse[] | undefined;

    service.listCategorias().subscribe((value) => (response = value));

    const request = httpMock.expectOne((candidate) =>
      candidate.url === `${BASE}/api/v1/categories/list` &&
      candidate.params.get('vendedorId') === null
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.body).toBeNull();

    request.flush(CATEGORIAS);
    expect(response).toEqual(CATEGORIAS);
  });

  it('lists the vendedor brands as a plain array (no vendedorId)', () => {
    let response: MarcaResponse[] | undefined;

    service.listMarcas().subscribe((value) => (response = value));

    const request = httpMock.expectOne((candidate) =>
      candidate.url === `${BASE}/api/v1/brands/list` &&
      candidate.params.get('vendedorId') === null
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.body).toBeNull();

    request.flush(MARCAS);
    expect(response).toEqual(MARCAS);
  });

  it('creates a categoria sending only { nombre } (no vendedorId)', () => {
    const body: CreateCategoriaRequest = { nombre: 'Agua' };
    let response: CategoriaResponse | undefined;

    service.createCategoria(body).subscribe((value) => (response = value));

    const request = httpMock.expectOne(`${BASE}/api/v1/categories/create`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ nombre: 'Agua' });

    request.flush(CATEGORIAS[0]);
    expect(response).toEqual(CATEGORIAS[0]);
  });
});
