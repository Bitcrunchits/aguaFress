import { beforeAll, afterAll, afterEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { VendedorEstado } from '@agua/contracts';
import AdminQrLinksPage from '../pages/AdminQrLinksPage';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderAdminQrLinksPage(kind: 'qr' | 'links') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={queryClient}>
      <AdminQrLinksPage kind={kind} />
    </QueryClientProvider>
  );
}

describe('AdminQrLinksPage', () => {
  it('shows vendor prerequisite state and does not query QR codes before selection', async () => {
    let qrRequestCount = 0;
    server.use(
      http.get('/api/v1/vendedores/list', () => HttpResponse.json({
        data: [{ id: 'vendedor-1', nombre: 'Agua Norte', email: 'norte@test.com', estado: VendedorEstado.ACTIVO }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      })),
      http.get('/api/v1/super-admin/qr-codes', () => {
        qrRequestCount += 1;
        return HttpResponse.json({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
      })
    );

    renderAdminQrLinksPage('qr');

    expect(await screen.findByText('Seleccioná un vendedor para cargar QR codes')).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: 'Agua Norte' })).toBeInTheDocument();
    expect(qrRequestCount).toBe(0);
  });

  it('loads QR codes scoped to the selected vendor', async () => {
    let capturedUrl: URL | undefined;
    server.use(
      http.get('/api/v1/vendedores/list', () => HttpResponse.json({
        data: [{ id: 'vendedor-1', nombre: 'Agua Norte', email: 'norte@test.com', estado: VendedorEstado.ACTIVO }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      })),
      http.get('/api/v1/super-admin/qr-codes', ({ request }) => {
        capturedUrl = new URL(request.url);
        return HttpResponse.json({
          data: [{ id: 'qr-1', codigo: 'QR-NORTE-001', activo: true, expires_at: '2026-08-07T12:00:00.000Z', created_at: '2026-08-06T12:00:00.000Z' }],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        });
      })
    );

    renderAdminQrLinksPage('qr');

    await screen.findByRole('option', { name: 'Agua Norte' });
    await userEvent.selectOptions(await screen.findByLabelText('Vendedor'), 'vendedor-1');

    await waitFor(() => expect(capturedUrl?.searchParams.get('vendedorId')).toBe('vendedor-1'));
    expect(await screen.findByText('Código: QR-NORTE-001')).toBeInTheDocument();
    expect(screen.getByText('Expira: 2026-08-07T12:00:00.000Z · Creado: 2026-08-06T12:00:00.000Z')).toBeInTheDocument();
  });

  it('deactivates a QR code and refreshes the selected vendor QR list', async () => {
    let listRequestCount = 0;
    let deactivateRequest: { method: string; pathname: string } | undefined;
    server.use(
      http.get('/api/v1/vendedores/list', () => HttpResponse.json({
        data: [{ id: 'vendedor-1', nombre: 'Agua Norte', email: 'norte@test.com', estado: VendedorEstado.ACTIVO }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      })),
      http.get('/api/v1/super-admin/qr-codes', ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('vendedorId')).toBe('vendedor-1');
        listRequestCount += 1;

        return HttpResponse.json({
          data: listRequestCount === 1
            ? [{ id: 'qr-1', codigo: 'QR-NORTE-001', activo: true, expires_at: '2026-08-07T12:00:00.000Z', created_at: '2026-08-06T12:00:00.000Z' }]
            : [],
          pagination: { page: 1, limit: 20, total: listRequestCount === 1 ? 1 : 0, totalPages: listRequestCount === 1 ? 1 : 0 },
        });
      }),
      http.patch('/api/v1/qr/admin/deactivate/:id', ({ request, params }) => {
        deactivateRequest = { method: request.method, pathname: new URL(request.url).pathname };
        expect(params.id).toBe('qr-1');
        return new HttpResponse(null, { status: 204 });
      })
    );

    renderAdminQrLinksPage('qr');

    await screen.findByRole('option', { name: 'Agua Norte' });
    await userEvent.selectOptions(await screen.findByLabelText('Vendedor'), 'vendedor-1');
    expect(await screen.findByText('Código: QR-NORTE-001')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Desactivar' }));

    await waitFor(() => expect(deactivateRequest).toEqual({ method: 'PATCH', pathname: '/api/v1/qr/admin/deactivate/qr-1' }));
    await waitFor(() => expect(listRequestCount).toBe(2));
    expect(await screen.findByText('No hay qr codes activos para este vendedor')).toBeInTheDocument();
  });

  it('loads invitation links scoped to the selected vendor', async () => {
    let capturedUrl: URL | undefined;
    server.use(
      http.get('/api/v1/vendedores/list', () => HttpResponse.json({
        data: [{ id: 'vendedor-2', nombre: 'Agua Sur', email: 'sur@test.com', estado: VendedorEstado.ACTIVO }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      })),
      http.get('/api/v1/super-admin/link-invitacion', ({ request }) => {
        capturedUrl = new URL(request.url);
        return HttpResponse.json({
          data: [{ id: 'link-1', token: 'invite-sur-001', activo: true, expires_at: '2026-08-07T12:00:00.000Z', created_at: '2026-08-06T12:00:00.000Z' }],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        });
      })
    );

    renderAdminQrLinksPage('links');

    await screen.findByRole('option', { name: 'Agua Sur' });
    await userEvent.selectOptions(await screen.findByLabelText('Vendedor'), 'vendedor-2');

    await waitFor(() => expect(capturedUrl?.searchParams.get('vendedorId')).toBe('vendedor-2'));
    expect(await screen.findByText('Token: invite-sur-001')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Invitation Links' })).toBeInTheDocument();
  });

  it('deactivates an invitation link and refreshes the selected vendor link list', async () => {
    let listRequestCount = 0;
    let deactivateRequest: { method: string; pathname: string } | undefined;
    server.use(
      http.get('/api/v1/vendedores/list', () => HttpResponse.json({
        data: [{ id: 'vendedor-2', nombre: 'Agua Sur', email: 'sur@test.com', estado: VendedorEstado.ACTIVO }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      })),
      http.get('/api/v1/super-admin/link-invitacion', ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('vendedorId')).toBe('vendedor-2');
        listRequestCount += 1;

        return HttpResponse.json({
          data: listRequestCount === 1
            ? [{ id: 'link-1', token: 'invite-sur-001', activo: true, expires_at: '2026-08-07T12:00:00.000Z', created_at: '2026-08-06T12:00:00.000Z' }]
            : [],
          pagination: { page: 1, limit: 20, total: listRequestCount === 1 ? 1 : 0, totalPages: listRequestCount === 1 ? 1 : 0 },
        });
      }),
      http.patch('/api/v1/link-invitacion/admin/deactivate/:id', ({ request, params }) => {
        deactivateRequest = { method: request.method, pathname: new URL(request.url).pathname };
        expect(params.id).toBe('link-1');
        return new HttpResponse(null, { status: 204 });
      })
    );

    renderAdminQrLinksPage('links');

    await screen.findByRole('option', { name: 'Agua Sur' });
    await userEvent.selectOptions(await screen.findByLabelText('Vendedor'), 'vendedor-2');
    expect(await screen.findByText('Token: invite-sur-001')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Desactivar' }));

    await waitFor(() => expect(deactivateRequest).toEqual({ method: 'PATCH', pathname: '/api/v1/link-invitacion/admin/deactivate/link-1' }));
    await waitFor(() => expect(listRequestCount).toBe(2));
    expect(await screen.findByText('No hay invitation links activos para este vendedor')).toBeInTheDocument();
  });

  it('renders an error state when the selected vendor QR list fails validation', async () => {
    server.use(
      http.get('/api/v1/vendedores/list', () => HttpResponse.json({
        data: [{ id: 'vendedor-1', nombre: 'Agua Norte', email: 'norte@test.com', estado: VendedorEstado.ACTIVO }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      })),
      http.get('/api/v1/super-admin/qr-codes', () => HttpResponse.json(
        { statusCode: 400, message: 'vendedorId is required', error: 'Bad Request' },
        { status: 400 }
      ))
    );

    renderAdminQrLinksPage('qr');

    await screen.findByRole('option', { name: 'Agua Norte' });
    await userEvent.selectOptions(await screen.findByLabelText('Vendedor'), 'vendedor-1');

    expect(await screen.findByText('vendedorId is required')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
    expect(screen.queryByText('No hay qr codes activos para este vendedor')).not.toBeInTheDocument();
  });

  it('paginates and searches active vendors through the backend selector', async () => {
    const capturedVendorUrls: URL[] = [];
    server.use(
      http.get('/api/v1/vendedores/list', ({ request }) => {
        const url = new URL(request.url);
        capturedVendorUrls.push(url);

        if (url.searchParams.get('page') === '2') {
          return HttpResponse.json({
            data: [{ id: 'vendedor-2', nombre: 'Agua Sur', email: 'sur@test.com', estado: VendedorEstado.ACTIVO }],
            pagination: { page: 2, limit: 20, total: 40, totalPages: 2 },
          });
        }

        return HttpResponse.json({
          data: [{ id: 'vendedor-1', nombre: 'Agua Norte', email: 'norte@test.com', estado: VendedorEstado.ACTIVO }],
          pagination: { page: 1, limit: 20, total: 40, totalPages: 2 },
        });
      })
    );

    renderAdminQrLinksPage('qr');

    await screen.findByRole('option', { name: 'Agua Norte' });
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    await screen.findByRole('option', { name: 'Agua Sur' });
    await userEvent.type(screen.getByLabelText('Buscar vendedores activos'), 'sur');

    await waitFor(() => {
      const lastVendorUrl = capturedVendorUrls.at(-1);
      expect(lastVendorUrl?.searchParams.get('page')).toBe('1');
      expect(lastVendorUrl?.searchParams.get('limit')).toBe('20');
      expect(lastVendorUrl?.searchParams.get('estado')).toBe(VendedorEstado.ACTIVO);
      expect(lastVendorUrl?.searchParams.get('search')).toBe('sur');
    });
  });
});
