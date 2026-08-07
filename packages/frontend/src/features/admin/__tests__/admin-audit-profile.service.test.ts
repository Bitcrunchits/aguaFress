import { beforeAll, afterAll, afterEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { UserRole } from '@agua/contracts';
import {
  getAdminAuditById,
  getAdminProfile,
  listAdminAuditEntries,
  updateAdminProfile,
} from '../services/admin.service';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('admin audit and profile service', () => {
  it('requests audit entries through the live activity-log list endpoint', async () => {
    let capturedUrl: URL | undefined;
    server.use(
      http.get('/api/v1/activity-logs/list', ({ request }) => {
        capturedUrl = new URL(request.url);
        return HttpResponse.json({
          data: [
            {
              id: 'audit-1',
              createdAt: '2026-08-06T12:00:00.000Z',
              source: 'usuario-service',
              action: 'VENDEDOR_STATUS_CHANGED',
              actor: { email: 'admin@test.com', role: UserRole.SUPER_ADMIN },
              entity: { type: 'vendedor', id: 'vendedor-1' },
              result: 'success',
              summary: 'Vendor enabled',
            },
          ],
          meta: { page: 2, limit: 10, total: 1, totalPages: 1 },
        });
      })
    );

    const response = await listAdminAuditEntries({ page: 2, limit: 10 });

    expect(capturedUrl?.searchParams.get('page')).toBe('2');
    expect(capturedUrl?.searchParams.get('limit')).toBe('10');
    expect(response.data[0]?.id).toBe('audit-1');
  });

  it('loads audit detail by id through the live detail endpoint', async () => {
    let requestedPath = '';
    server.use(
      http.get('/api/v1/activity-logs/get-by-id/audit-42', ({ request }) => {
        requestedPath = new URL(request.url).pathname;
        return HttpResponse.json({
          data: {
            id: 'audit-42',
            createdAt: '2026-08-06T12:30:00.000Z',
            source: 'gateway',
            action: 'USER_LOGIN',
            actor: { email: 'admin@test.com', role: UserRole.SUPER_ADMIN },
            entity: { type: 'auth_user', id: 'auth-1' },
            result: 'success',
            summary: 'Admin login',
            metadata: { ip: '127.0.0.1' },
            requestId: 'req-1',
          },
        });
      })
    );

    const response = await getAdminAuditById('audit-42');

    expect(requestedPath).toBe('/api/v1/activity-logs/get-by-id/audit-42');
    expect(response.data.id).toBe('audit-42');
  });

  it('updates the admin profile without sending auth identity fields', async () => {
    let capturedBody: unknown;
    server.use(
      http.patch('/api/v1/super-admin/profile/update', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ id: 'admin-1', nombre: 'Ada', apellido: 'Lovelace' });
      })
    );

    const response = await updateAdminProfile({ nombre: 'Ada', apellido: 'Lovelace' });

    expect(capturedBody).toEqual({ nombre: 'Ada', apellido: 'Lovelace' });
    expect(capturedBody).not.toHaveProperty('userId');
    expect(capturedBody).not.toHaveProperty('actorUserId');
    expect(response.nombre).toBe('Ada');
  });

  it('loads the admin profile from the super-admin endpoint', async () => {
    server.use(
      http.get('/api/v1/super-admin/profile', () => HttpResponse.json({
        id: 'admin-1',
        email: 'admin@test.com',
        nombre: 'Ada',
        apellido: 'Lovelace',
        role: UserRole.SUPER_ADMIN,
      }))
    );

    const profile = await getAdminProfile();

    expect(profile.email).toBe('admin@test.com');
    expect(profile.role).toBe(UserRole.SUPER_ADMIN);
  });
});
