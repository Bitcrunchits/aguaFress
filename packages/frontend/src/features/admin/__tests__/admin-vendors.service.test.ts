import { beforeAll, afterAll, afterEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { UserRole, VendedorEstado } from '@agua/contracts';
import {
  changeAdminVendorEstado,
  getAdminVendorById,
  listAdminVendors,
  registerAdminVendor,
} from '../services/admin-vendors.service';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('admin vendor service', () => {
  it('requests vendor list with estado, search, page, and limit filters', async () => {
    let capturedUrl: URL | undefined;
    server.use(
      http.get('/api/v1/vendedores/list', ({ request }) => {
        capturedUrl = new URL(request.url);
        return HttpResponse.json({
          data: [
            {
              id: 'vendedor-1',
              nombre: 'Carlos',
              email: 'carlos@test.com',
              estado: VendedorEstado.PENDIENTE,
              clientesCount: 0,
              fechaRegistro: '2026-08-06T00:00:00.000Z',
            },
          ],
          pagination: { page: 2, limit: 10, total: 1, totalPages: 1 },
        });
      })
    );

    const response = await listAdminVendors({
      estado: VendedorEstado.PENDIENTE,
      search: 'Carlos',
      page: 2,
      limit: 10,
    });

    expect(capturedUrl?.searchParams.get('estado')).toBe(VendedorEstado.PENDIENTE);
    expect(capturedUrl?.searchParams.get('search')).toBe('Carlos');
    expect(capturedUrl?.searchParams.get('page')).toBe('2');
    expect(capturedUrl?.searchParams.get('limit')).toBe('10');
    expect(response.data[0]?.estado).toBe(VendedorEstado.PENDIENTE);
  });

  it('loads vendor detail by domain vendedorId', async () => {
    let requestedPath = '';
    server.use(
      http.get('/api/v1/vendedores/get-by-id/vendedor-42', ({ request }) => {
        requestedPath = new URL(request.url).pathname;
        return HttpResponse.json({
          id: 'vendedor-42',
          nombre: 'Ana',
          email: 'ana@test.com',
          estado: VendedorEstado.ACTIVO,
          clientesCount: 3,
          fechaRegistro: '2026-08-06T00:00:00.000Z',
        });
      })
    );

    const vendor = await getAdminVendorById('vendedor-42');

    expect(requestedPath).toBe('/api/v1/vendedores/get-by-id/vendedor-42');
    expect(vendor.id).toBe('vendedor-42');
  });

  it('changes vendor estado with typed VendedorEstado only', async () => {
    let capturedBody: unknown;
    server.use(
      http.patch('/api/v1/vendedores/change-estado/vendedor-1', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({
          vendedorId: 'vendedor-1',
          estadoAnterior: VendedorEstado.PENDIENTE,
          estadoNuevo: VendedorEstado.ACTIVO,
          updated: true,
        });
      })
    );

    const response = await changeAdminVendorEstado('vendedor-1', VendedorEstado.ACTIVO);

    expect(capturedBody).toEqual({ estado: VendedorEstado.ACTIVO });
    expect(response.estadoNuevo).toBe(VendedorEstado.ACTIVO);
  });

  it('registers a vendor through public auth registration without editable identities', async () => {
    let capturedBody: unknown;
    server.use(
      http.post('/api/v1/auth/register', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({
          user: { id: 'auth-user-1', email: 'new-vendor@test.com', role: UserRole.VENDEDOR },
        });
      })
    );

    const response = await registerAdminVendor({
      email: 'new-vendor@test.com',
      password: 'Seguro123!',
      nombre: 'Nueva Vendedora',
    });

    expect(capturedBody).toEqual({
      email: 'new-vendor@test.com',
      password: 'Seguro123!',
      nombre: 'Nueva Vendedora',
      role: UserRole.VENDEDOR,
    });
    expect(JSON.stringify(capturedBody)).not.toContain('userId');
    expect(JSON.stringify(capturedBody)).not.toContain('actorUserId');
    expect(response.user.role).toBe(UserRole.VENDEDOR);
  });
});
