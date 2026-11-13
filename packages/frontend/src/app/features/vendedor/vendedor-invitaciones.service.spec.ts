import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { GenerarLinkResponse, LinkInvitacionItem } from '@agua/contracts';
import { VendedorInvitacionesService } from './vendedor-invitaciones.service';

const BASE = 'https://api-aguafress.eadev.cloud';
const LIST_URL = `${BASE}/api/v1/link-invitacion/vendor/list`;
const CREATE_URL = `${BASE}/api/v1/link-invitacion/vendor/create`;
const DEACTIVATE_URL = `${BASE}/api/v1/link-invitacion/vendor/deactivate`;

const LIST_RAW = {
  data: [
    {
      id: 'link-1',
      token: 'TOKEN-1',
      activo: true,
      expires_at: '2099-01-01T00:00:00.000Z',
      created_at: '2026-10-24T00:00:00.000Z',
    },
    {
      id: 'link-2',
      token: 'TOKEN-2',
      activo: false,
      expires_at: '2026-10-26T00:00:00.000Z',
      created_at: '2026-10-25T00:00:00.000Z',
    },
  ],
  pagination: { page: 1, limit: 100, total: 2, totalPages: 1 },
};

describe('VendedorInvitacionesService', () => {
  let service: VendedorInvitacionesService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(VendedorInvitacionesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lists invitations with a high limit and maps snake_case to camelCase', () => {
    let response: LinkInvitacionItem[] | undefined;

    service.list().subscribe((value) => (response = value));

    const request = httpMock.expectOne(`${LIST_URL}?limit=100`);
    expect(request.request.method).toBe('GET');
    expect(request.request.body).toBeNull();
    expect(request.request.params.get('vendedorId')).toBeNull();
    expect(request.request.params.get('userId')).toBeNull();

    request.flush(LIST_RAW);
    expect(response).toEqual([
      {
        id: 'link-1',
        token: 'TOKEN-1',
        activo: true,
        expiresAt: '2099-01-01T00:00:00.000Z',
        createdAt: '2026-10-24T00:00:00.000Z',
      },
      {
        id: 'link-2',
        token: 'TOKEN-2',
        activo: false,
        expiresAt: '2026-10-26T00:00:00.000Z',
        createdAt: '2026-10-25T00:00:00.000Z',
      },
    ]);
  });

  it('creates an invitation with no identity in the body', () => {
    const created: GenerarLinkResponse = {
      linkUrl: 'https://agua.app/invitar/TOKEN-1',
      token: 'TOKEN-1',
      expiresAt: '2099-01-01T00:00:00.000Z',
    };
    let response: GenerarLinkResponse | undefined;

    service.create().subscribe((value) => (response = value));

    const request = httpMock.expectOne(CREATE_URL);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeNull();

    request.flush(created);
    expect(response).toEqual(created);
  });

  it('deactivates an invitation by row id (not token) in the path', () => {
    service.deactivate('link-1').subscribe();

    const request = httpMock.expectOne(`${DEACTIVATE_URL}/link-1`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toBeNull();

    request.flush(null);
  });
});
