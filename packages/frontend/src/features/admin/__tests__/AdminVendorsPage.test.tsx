import { beforeAll, afterAll, afterEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { VendedorEstado } from '@agua/contracts';
import AdminVendorsPage from '../pages/AdminVendorsPage';
import AdminPendingVendorsPage from '../pages/AdminPendingVendorsPage';
import AdminVendorDetailPage from '../pages/AdminVendorDetailPage';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderAdminRoute(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/admin/vendors" element={<AdminVendorsPage />} />
          <Route path="/admin/vendors/pending" element={<AdminPendingVendorsPage />} />
          <Route path="/admin/vendors/:vendedorId" element={<AdminVendorDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('admin vendor pages', () => {
  it('renders paginated vendor list and sends search filters', async () => {
    let capturedSearch = '';
    server.use(
      http.get('/api/v1/vendedores/list', ({ request }) => {
        const url = new URL(request.url);
        capturedSearch = url.searchParams.get('search') ?? '';
        return HttpResponse.json({
          data: [
            {
              id: 'vendedor-1',
              nombre: capturedSearch ? 'Ana' : 'Carlos',
              email: capturedSearch ? 'ana@test.com' : 'carlos@test.com',
              estado: VendedorEstado.ACTIVO,
              clientesCount: 4,
              fechaRegistro: '2026-08-06T00:00:00.000Z',
            },
          ],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        });
      })
    );

    renderAdminRoute('/admin/vendors');

    expect(await screen.findByRole('heading', { name: 'Vendedores' })).toBeInTheDocument();
    expect(screen.getByText('Carlos')).toBeInTheDocument();
    expect(screen.getByText('1 vendedores · página 1 de 1')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Buscar vendedores'), 'Ana');
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    await waitFor(() => expect(capturedSearch).toBe('Ana'));
    expect(await screen.findByText('Ana')).toBeInTheDocument();
  });

  it('requests pending vendors and explains the empty state', async () => {
    let capturedEstado: string | null = null;
    server.use(
      http.get('/api/v1/vendedores/list', ({ request }) => {
        capturedEstado = new URL(request.url).searchParams.get('estado');
        return HttpResponse.json({
          data: [],
          pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        });
      })
    );

    renderAdminRoute('/admin/vendors/pending');

    expect(await screen.findByText('No hay vendedores pendientes para aprobar')).toBeInTheDocument();
    expect(capturedEstado).toBe(VendedorEstado.PENDIENTE);
  });

  it('loads vendor detail and changes estado without collecting actor identity', async () => {
    let capturedBody: unknown;
    server.use(
      http.get('/api/v1/vendedores/get-by-id/vendedor-1', () => HttpResponse.json({
        id: 'vendedor-1',
        nombre: 'Carlos',
        email: 'carlos@test.com',
        estado: VendedorEstado.PENDIENTE,
        clientesCount: 0,
        fechaRegistro: '2026-08-06T00:00:00.000Z',
      })),
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

    renderAdminRoute('/admin/vendors/vendedor-1');

    expect(await screen.findByRole('heading', { name: 'Carlos' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Habilitar vendedor' }));

    await waitFor(() => expect(capturedBody).toEqual({ estado: VendedorEstado.ACTIVO }));
  });

  it('preserves backend status errors instead of showing empty detail', async () => {
    server.use(
      http.get('/api/v1/vendedores/get-by-id/vendedor-1', () => HttpResponse.json({
        id: 'vendedor-1',
        nombre: 'Carlos',
        email: 'carlos@test.com',
        estado: VendedorEstado.ACTIVO,
        clientesCount: 2,
        fechaRegistro: '2026-08-06T00:00:00.000Z',
      })),
      http.patch('/api/v1/vendedores/change-estado/vendedor-1', () => HttpResponse.json({ message: 'Transición inválida' }, { status: 400 }))
    );

    renderAdminRoute('/admin/vendors/vendedor-1');

    expect(await screen.findByText('activo')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Deshabilitar vendedor' }));

    expect(await screen.findByText('Transición inválida')).toBeInTheDocument();
    expect(screen.queryByText('No hay información del vendedor')).not.toBeInTheDocument();
  });
});
