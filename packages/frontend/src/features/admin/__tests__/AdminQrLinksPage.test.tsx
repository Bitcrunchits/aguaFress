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
          data: [{ id: 'qr-1', url: 'https://qr.test/agua-norte', vendedorId: 'vendedor-1', activo: true }],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        });
      })
    );

    renderAdminQrLinksPage('qr');

    await userEvent.selectOptions(await screen.findByLabelText('Vendedor'), 'vendedor-1');

    await waitFor(() => expect(capturedUrl?.searchParams.get('vendedorId')).toBe('vendedor-1'));
    expect(await screen.findByText('https://qr.test/agua-norte')).toBeInTheDocument();
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
          data: [{ id: 'link-1', linkUrl: 'https://link.test/agua-sur', vendedorId: 'vendedor-2', activo: true }],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        });
      })
    );

    renderAdminQrLinksPage('links');

    await userEvent.selectOptions(await screen.findByLabelText('Vendedor'), 'vendedor-2');

    await waitFor(() => expect(capturedUrl?.searchParams.get('vendedorId')).toBe('vendedor-2'));
    expect(await screen.findByText('https://link.test/agua-sur')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Invitation Links' })).toBeInTheDocument();
  });
});
