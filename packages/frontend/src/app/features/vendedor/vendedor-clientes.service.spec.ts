import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { PaginatedResponse, VendedorClienteItem } from '@agua/contracts';
import { VendedorClientesService, VendedorClientesFilters } from './vendedor-clientes.service';

const CARTERA_URL = 'https://api-aguafress.eadev.cloud/api/v1/clientes/cartera';

const CARTERA_RESPONSE: PaginatedResponse<VendedorClienteItem> = {
  data: [
    { id: 'cliente-1', nombre: 'María', apellido: 'López', telefono: '3515551234' },
    { id: 'cliente-2', nombre: 'Juan' },
  ],
  pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
};

describe('VendedorClientesService', () => {
  let service: VendedorClientesService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(VendedorClientesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('gets the cartera with page and limit as query params', () => {
    const filters: VendedorClientesFilters = { page: 2, limit: 10 };
    let response: PaginatedResponse<VendedorClienteItem> | undefined;

    service.listCartera(filters).subscribe((value) => (response = value));

    const request = httpMock.expectOne(`${CARTERA_URL}?page=2&limit=10`);
    expect(request.request.method).toBe('GET');
    expect(request.request.body).toBeNull();

    request.flush(CARTERA_RESPONSE);
    expect(response).toEqual(CARTERA_RESPONSE);
  });

  it('adds the search param only when present', () => {
    const filters: VendedorClientesFilters = { page: 1, limit: 10, search: 'maria' };

    service.listCartera(filters).subscribe();

    const request = httpMock.expectOne(`${CARTERA_URL}?page=1&limit=10&search=maria`);
    expect(request.request.method).toBe('GET');

    request.flush(CARTERA_RESPONSE);
  });

  it('omits undefined params instead of sending empty values', () => {
    service.listCartera({}).subscribe();

    const request = httpMock.expectOne(CARTERA_URL);
    expect(request.request.params.keys().length).toBe(0);

    request.flush(CARTERA_RESPONSE);
  });
});
