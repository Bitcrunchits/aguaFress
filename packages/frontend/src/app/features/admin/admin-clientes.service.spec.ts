import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { SuperAdminClientesResponseV2 } from '@agua/contracts';
import { AdminClientesService } from './admin-clientes.service';

const CLIENTES_LIST_URL = 'https://api-aguafress.eadev.cloud/api/v1/clientes/list';

const LIST_RESPONSE: SuperAdminClientesResponseV2 = {
  data: [
    {
      id: 'cliente-1',
      nombre: 'Juan',
      apellido: 'Pérez',
      telefono: '1122334455',
      dni: '30123456',
      vendedor: { nombre: 'Ana', apellido: 'Gómez', empresa: 'Aguas del Sur' },
      createdAt: '2026-01-15T12:00:00.000Z',
    },
  ],
  pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
};

describe('AdminClientesService', () => {
  let service: AdminClientesService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminClientesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('gets the paginated clientes list with only page and limit by default', () => {
    let response: SuperAdminClientesResponseV2 | undefined;

    service.list({ page: 1, limit: 20 }).subscribe((value) => (response = value));

    const request = httpMock.expectOne(`${CLIENTES_LIST_URL}?page=1&limit=20`);
    expect(request.request.method).toBe('GET');

    request.flush(LIST_RESPONSE);
    expect(response).toEqual(LIST_RESPONSE);
  });

  it('mirrors search and vendedorId filters into the query string', () => {
    service
      .list({ page: 1, limit: 20, search: 'juan', vendedorId: 'vendedor-1' })
      .subscribe();

    const request = httpMock.expectOne(
      `${CLIENTES_LIST_URL}?page=1&limit=20&vendedorId=vendedor-1&search=juan`,
    );
    expect(request.request.method).toBe('GET');

    request.flush(LIST_RESPONSE);
  });
});
