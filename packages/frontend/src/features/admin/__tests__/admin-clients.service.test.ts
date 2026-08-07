import { beforeAll, afterAll, afterEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import {
  addAdminClientProvider,
  getAdminClientById,
  listAdminClients,
  reassignAdminClient,
  updateAdminClient,
} from '../services/admin-clients.service';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('admin client service', () => {
  it('requests client list with search, page, and limit filters', async () => {
    let capturedUrl: URL | undefined;
    server.use(
      http.get('/api/v1/clientes/list', ({ request }) => {
        capturedUrl = new URL(request.url);
        return HttpResponse.json({
          data: [
            {
              id: 'cliente-1',
              nombre: 'Laura',
              apellido: 'Perez',
              email: 'laura@test.com',
              telefono: '1111',
              fechaAsignacion: '2026-08-06T00:00:00.000Z',
            },
          ],
          pagination: { page: 2, limit: 10, total: 1, totalPages: 1 },
        });
      })
    );

    const response = await listAdminClients({ search: 'Laura', page: 2, limit: 10 });

    expect(capturedUrl?.searchParams.get('search')).toBe('Laura');
    expect(capturedUrl?.searchParams.get('page')).toBe('2');
    expect(capturedUrl?.searchParams.get('limit')).toBe('10');
    expect(response.data[0]?.id).toBe('cliente-1');
  });

  it('loads client detail by domain clienteId', async () => {
    let requestedPath = '';
    server.use(
      http.get('/api/v1/clientes/get-by-id/cliente-42', ({ request }) => {
        requestedPath = new URL(request.url).pathname;
        return HttpResponse.json({
          id: 'cliente-42',
          nombre: 'Mario',
          apellido: 'Gomez',
          email: 'mario@test.com',
          telefono: '2222',
          providers: [],
        });
      })
    );

    const client = await getAdminClientById('cliente-42');

    expect(requestedPath).toBe('/api/v1/clientes/get-by-id/cliente-42');
    expect(client.id).toBe('cliente-42');
  });

  it('updates client profile without sending auth identities', async () => {
    let capturedBody: unknown;
    server.use(
      http.patch('/api/v1/clientes/update/cliente-1', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({
          id: 'cliente-1',
          nombre: 'Laura',
          apellido: 'Perez',
          telefono: '3333',
        });
      })
    );

    const response = await updateAdminClient('cliente-1', {
      nombre: 'Laura',
      apellido: 'Perez',
      telefono: '3333',
    });

    expect(capturedBody).toEqual({
      nombre: 'Laura',
      apellido: 'Perez',
      telefono: '3333',
    });
    expect(JSON.stringify(capturedBody)).not.toContain('userId');
    expect(JSON.stringify(capturedBody)).not.toContain('actorUserId');
    expect(response.id).toBe('cliente-1');
  });

  it('reassigns a client with only domain vendedorId in the body', async () => {
    let capturedBody: unknown;
    server.use(
      http.patch('/api/v1/clientes/reassign/cliente-1', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ clienteId: 'cliente-1', vendedorId: 'vendedor-2', updated: true });
      })
    );

    const response = await reassignAdminClient('cliente-1', { vendedorId: 'vendedor-2' });

    expect(capturedBody).toEqual({ vendedorId: 'vendedor-2' });
    expect(JSON.stringify(capturedBody)).not.toContain('userId');
    expect(JSON.stringify(capturedBody)).not.toContain('actorUserId');
    expect(response.updated).toBe(true);
  });

  it('adds an active provider with only domain vendedorId in the body', async () => {
    let capturedBody: unknown;
    server.use(
      http.post('/api/v1/clientes/providers/add/cliente-1', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ clienteId: 'cliente-1', vendedorId: 'vendedor-3', active: true });
      })
    );

    const response = await addAdminClientProvider('cliente-1', { vendedorId: 'vendedor-3' });

    expect(capturedBody).toEqual({ vendedorId: 'vendedor-3' });
    expect(JSON.stringify(capturedBody)).not.toContain('userId');
    expect(JSON.stringify(capturedBody)).not.toContain('actorUserId');
    expect(response.active).toBe(true);
  });
});
