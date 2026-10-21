import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  VendedorEstado,
  type SuperAdminVendedorListFilters,
  type SuperAdminVendedorListResponse,
} from '@agua/contracts';
import { AdminVendedoresService } from './admin-vendedores.service';

const LIST_URL = 'https://api-aguafress.eadev.cloud/api/v1/vendedores/list';

const LIST_RESPONSE: SuperAdminVendedorListResponse = {
  data: [
    {
      id: 'vendedor-1',
      nombre: 'Ana',
      apellido: 'Gómez',
      email: 'ana@example.com',
      estado: VendedorEstado.ACTIVO,
      clientesCount: 3,
      fechaRegistro: '2026-01-15T12:00:00.000Z',
    },
  ],
  pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
};

describe('AdminVendedoresService', () => {
  let service: AdminVendedoresService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminVendedoresService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('posts the typed filters as body to the gateway vendedores.list action', () => {
    const filters: SuperAdminVendedorListFilters = { page: 2, limit: 10 };
    let response: SuperAdminVendedorListResponse | undefined;

    service.list(filters).subscribe((value) => (response = value));

    const request = httpMock.expectOne(`${LIST_URL}?page=2&limit=10`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ page: 2, limit: 10 });

    request.flush(LIST_RESPONSE);
    expect(response).toEqual(LIST_RESPONSE);
  });

  it('mirrors estado and search filters into the query string', () => {
    const filters: SuperAdminVendedorListFilters = {
      page: 1,
      limit: 20,
      estado: VendedorEstado.PENDIENTE,
      search: 'ana',
    };

    service.list(filters).subscribe();

    const request = httpMock.expectOne(
      `${LIST_URL}?page=1&limit=20&estado=pendiente&search=ana`,
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(filters);

    request.flush(LIST_RESPONSE);
  });
});
