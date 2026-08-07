import { beforeAll, afterAll, afterEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { listAdminLinks, listAdminQrCodes } from '../services/admin.service';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('admin QR and invitation link service', () => {
  it('requests QR codes with required domain vendedorId and pagination', async () => {
    let capturedUrl: URL | undefined;
    server.use(
      http.get('/api/v1/super-admin/qr-codes', ({ request }) => {
        capturedUrl = new URL(request.url);
        return HttpResponse.json({
          data: [{ id: 'qr-1', url: 'https://qr.test/1', vendedorId: 'vendedor-1', activo: true }],
          pagination: { page: 2, limit: 10, total: 1, totalPages: 1 },
        });
      })
    );

    const response = await listAdminQrCodes({ vendedorId: 'vendedor-1', page: 2, limit: 10 });

    expect(capturedUrl?.searchParams.get('vendedorId')).toBe('vendedor-1');
    expect(capturedUrl?.searchParams.get('page')).toBe('2');
    expect(capturedUrl?.searchParams.get('limit')).toBe('10');
    expect(response.data[0]?.id).toBe('qr-1');
  });

  it('requests invitation links with required domain vendedorId and pagination', async () => {
    let capturedUrl: URL | undefined;
    server.use(
      http.get('/api/v1/super-admin/link-invitacion', ({ request }) => {
        capturedUrl = new URL(request.url);
        return HttpResponse.json({
          data: [{ id: 'link-1', linkUrl: 'https://link.test/1', vendedorId: 'vendedor-2', activo: true }],
          pagination: { page: 3, limit: 5, total: 1, totalPages: 1 },
        });
      })
    );

    const response = await listAdminLinks({ vendedorId: 'vendedor-2', page: 3, limit: 5 });

    expect(capturedUrl?.searchParams.get('vendedorId')).toBe('vendedor-2');
    expect(capturedUrl?.searchParams.get('page')).toBe('3');
    expect(capturedUrl?.searchParams.get('limit')).toBe('5');
    expect(response.data[0]?.id).toBe('link-1');
  });

  it('rejects missing vendor selection before making QR or link calls', async () => {
    let requestCount = 0;
    server.use(
      http.get('/api/v1/super-admin/qr-codes', () => {
        requestCount += 1;
        return HttpResponse.json({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
      }),
      http.get('/api/v1/super-admin/link-invitacion', () => {
        requestCount += 1;
        return HttpResponse.json({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
      })
    );

    await expect(listAdminQrCodes({ vendedorId: '' })).rejects.toThrow('Debe seleccionar un vendedor');
    await expect(listAdminLinks({ vendedorId: '' })).rejects.toThrow('Debe seleccionar un vendedor');
    expect(requestCount).toBe(0);
  });
});
