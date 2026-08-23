import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { MemoryRouter } from 'react-router-dom';
import { UserRole } from '@agua/contracts';
import { AuthContext, type AuthContextValue } from '../context/AuthContext';
import ClientesPage from '../features/clientes/pages/ClientesPage';

const server = setupServer(
  http.get('/api/v1/clientes/cartera', () => HttpResponse.json({
    data: [{ id: 'cliente-1', nombre: 'Ana', apellido: 'Gómez', telefono: '123' }],
    pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
  }))
);

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const authValue: AuthContextValue = {
    user: { id: 'vendedor-user-1', email: 'vendedor@test.com', role: UserRole.VENDEDOR, isActive: true },
    token: 'token',
    isLoading: false,
    isAuthenticated: true,
    login: vi.fn().mockRejectedValue(new Error('not implemented')),
    logout: vi.fn(),
  };

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <MemoryRouter>
          <ClientesPage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('ClientesPage', () => {
  it('renders loading and success states from gateway data', async () => {
    renderPage();

    expect(await screen.findByText('Ana Gómez')).toBeInTheDocument();
    expect(screen.getByText('Clientes')).toBeInTheDocument();
    expect(screen.getByText('1 clientes · página 1 de 1')).toBeInTheDocument();
  });

  it('renders empty state', async () => {
    server.use(
      http.get('/api/v1/clientes/cartera', () => HttpResponse.json({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      }))
    );

    renderPage();

    expect(await screen.findByText('No hay clientes para mostrar')).toBeInTheDocument();
  });
});
