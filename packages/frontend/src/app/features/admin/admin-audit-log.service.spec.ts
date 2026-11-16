import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  AuditAction,
  UserRole,
  type AuditLogListFilters,
  type AuditLogListResponse,
} from '@agua/contracts';
import { AdminAuditLogService } from './admin-audit-log.service';

const AUDIT_LOG_URL = 'https://api-aguafress.eadev.cloud/api/v1/super-admin/audit-log';

// The gateway returns the actor's identity under the legacy wire names
// `usuarioId`/`usuarioEmail`/`usuarioRole`; the service renames them to the
// domain names `actorUserId`/`email`/`role` in the contract shape.
const WIRE_RESPONSE = {
  data: [
    {
      id: 'log-1',
      accion: AuditAction.USER_LOGIN,
      usuarioId: 'auth-user-1',
      usuarioEmail: 'admin@example.com',
      usuarioRole: UserRole.SUPER_ADMIN,
      targetId: null,
      detalle: null,
      ip: '1.2.3.4',
      createdAt: '2026-01-15T12:00:00.000Z',
    },
  ],
  pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
};

const LIST_RESPONSE: AuditLogListResponse = {
  data: [
    {
      id: 'log-1',
      accion: AuditAction.USER_LOGIN,
      actorUserId: 'auth-user-1',
      email: 'admin@example.com',
      role: UserRole.SUPER_ADMIN,
      targetId: null,
      detalle: null,
      ip: '1.2.3.4',
      createdAt: '2026-01-15T12:00:00.000Z',
    },
  ],
  pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
};

describe('AdminAuditLogService', () => {
  let service: AdminAuditLogService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminAuditLogService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('gets the paginated audit log and renames the wire identity fields', () => {
    const filters: AuditLogListFilters = { page: 1, limit: 20 };
    let response: AuditLogListResponse | undefined;

    service.list(filters).subscribe((value) => (response = value));

    const request = httpMock.expectOne(`${AUDIT_LOG_URL}?page=1&limit=20`);
    expect(request.request.method).toBe('GET');

    request.flush(WIRE_RESPONSE);
    expect(response).toEqual(LIST_RESPONSE);
  });

  it('mirrors the audit-log filters into the query string using the legacy wire name', () => {
    const filters: AuditLogListFilters = {
      page: 1,
      limit: 20,
      actorUserId: 'auth-user-1',
      accion: AuditAction.USER_LOGIN,
      targetId: 'target-1',
      from: '2026-01-01',
      to: '2026-01-31',
    };

    service.list(filters).subscribe();

    const request = httpMock.expectOne(
      `${AUDIT_LOG_URL}?page=1&limit=20&usuarioId=auth-user-1&accion=USER_LOGIN&targetId=target-1&from=2026-01-01&to=2026-01-31`,
    );
    expect(request.request.method).toBe('GET');

    request.flush(WIRE_RESPONSE);
  });
});
