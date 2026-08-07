import { beforeAll, afterAll, afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import AdminClientsPage from '../pages/AdminClientsPage';
import AdminClientDetailPage from '../pages/AdminClientDetailPage';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderAdminClientRoute(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/admin/clients" element={<AdminClientsPage />} />
          <Route path="/admin/clients/:clienteId" element={<AdminClientDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('admin client pages', () => {
  it('renders paginated client list from the gateway', async () => {
    server.use(
      http.get('/api/v1/clientes/list', () => HttpResponse.json({
        data: [
          {
            id: 'cliente-1',
            nombre: 'Laura',
            apellido: 'Perez',
            email: 'laura@test.com',
            telefono: '1111',
            totalPedidos: 3,
            fechaAsignacion: '2026-08-06T00:00:00.000Z',
          },
        ],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      }))
    );

    renderAdminClientRoute('/admin/clients');

    expect(await screen.findByRole('heading', { name: 'Clientes' })).toBeInTheDocument();
    expect(screen.getByText('Laura Perez')).toBeInTheDocument();
    expect(screen.getByText('laura@test.com')).toBeInTheDocument();
    expect(screen.getByText('1 clientes · página 1 de 1')).toBeInTheDocument();
  });

  it('shows empty and backend error states distinctly', async () => {
    server.use(
      http.get('/api/v1/clientes/list', () => HttpResponse.json({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      }))
    );

    renderAdminClientRoute('/admin/clients');

    expect(await screen.findByText('No hay clientes para mostrar')).toBeInTheDocument();

    server.use(
      http.get('/api/v1/clientes/list', () => HttpResponse.json({ message: 'Clientes no disponibles' }, { status: 500 }))
    );

    renderAdminClientRoute('/admin/clients');

    expect(await screen.findByText('Clientes no disponibles')).toBeInTheDocument();
  });

  it('loads client detail with provider relationships as read-only information', async () => {
    server.use(
      http.get('/api/v1/clientes/get-by-id/cliente-1', () => HttpResponse.json({
        id: 'cliente-1',
        nombre: 'Laura',
        apellido: 'Perez',
        email: 'laura@test.com',
        telefono: '1111',
        dni: '30111222',
        providers: [
          {
            id: 'vendedor-1',
            nombre: 'Agua Centro',
            apellido: 'SRL',
            email: 'centro@test.com',
            isDefault: true,
          },
        ],
      }))
    );

    renderAdminClientRoute('/admin/clients/cliente-1');

    expect(await screen.findByRole('heading', { name: 'Laura Perez' })).toBeInTheDocument();
    expect(screen.getByText('laura@test.com')).toBeInTheDocument();
    expect(screen.getByText('30111222')).toBeInTheDocument();
    expect(screen.getByText('Agua Centro SRL')).toBeInTheDocument();
    expect(screen.getByText('Proveedor principal')).toBeInTheDocument();
  });
});
