import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { AuthContext, type AuthContextValue } from '../../../context/AuthContext';
import { UserRole } from '@agua/contracts';
import AdminDashboardPage from '../pages/AdminDashboardPage';

const server = setupServer(
  http.get('/api/v1/super-admin/dashboard', () => HttpResponse.json({
    totalVendedores: 2,
    vendedoresActivos: 1,
    vendedoresPendientes: 1,
    totalClientes: 3,
    clientesConVendedor: 2,
    totalSuperAdmins: 1,
  })),
  http.get('/api/v1/vendedores/list', () => HttpResponse.json({
    data: [
      {
        id: 'vendedor-1',
        nombre: 'Carlos',
        email: 'carlos@test.com',
        estado: 'activo',
        clientesCount: 2,
        fechaRegistro: '2026-07-27T00:00:00.000Z',
      },
    ],
    pagination: { page: 1, limit: 5, total: 1, totalPages: 1 },
  })),
  http.get('/api/v1/clientes/list', () => HttpResponse.json({
    data: [
      {
        id: 'cliente-1',
        nombre: 'Ana',
        email: 'ana@test.com',
        fechaAsignacion: '2026-07-27T00:00:00.000Z',
      },
    ],
    pagination: { page: 1, limit: 5, total: 1, totalPages: 1 },
  })),
  http.get('/api/v1/activity-logs/list', () => HttpResponse.json({
    data: [
      {
        id: 'log-1',
        createdAt: '2026-07-27T00:00:00.000Z',
        source: 'gateway',
        action: 'USER_LOGIN',
        actor: {},
        entity: {},
        result: 'success',
        summary: 'Login correcto',
      },
    ],
    meta: { page: 1, limit: 5, total: 1, totalPages: 1 },
  })),
  http.get('/api/v1/super-admin/qr-codes', () => HttpResponse.json({
    data: [],
    pagination: { page: 1, limit: 5, total: 0, totalPages: 0 },
  })),
  http.get('/api/v1/super-admin/link-invitacion', () => HttpResponse.json({
    data: [],
    pagination: { page: 1, limit: 5, total: 0, totalPages: 0 },
  }))
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function createAuthValue(overrides?: Partial<AuthContextValue>): AuthContextValue {
  return {
    user: {
      id: 'admin-1',
      email: 'admin@test.com',
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
    token: 'test-token',
    isLoading: false,
    isAuthenticated: true,
    login: vi.fn().mockRejectedValue(new Error('not implemented')),
    logout: vi.fn(),
    ...overrides,
  };
}

function renderPage(authValue?: AuthContextValue) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue ?? createAuthValue()}>
        <MemoryRouter>
          <AdminDashboardPage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe('AdminDashboardPage', () => {
  it('renders real admin stats from the gateway', async () => {
    renderPage();
    expect(await screen.findByText('Panel de Administración')).toBeInTheDocument();
    expect(screen.getByText('Vendedores')).toBeInTheDocument();
    expect(screen.getByText('Clientes')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Carlos')).toBeInTheDocument();
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('Login correcto')).toBeInTheDocument();
  });

  it('shows error state when a required gateway read fails', async () => {
    server.use(
      http.get('/api/v1/super-admin/dashboard', () => HttpResponse.json({ message: 'Panel no disponible' }, { status: 500 }))
    );

    renderPage();

    expect(await screen.findByText('Panel no disponible')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
  });

  it('does not request vendor-scoped QR data from the overview without a selected vendor', async () => {
    let qrRequestCount = 0;
    let linkRequestCount = 0;
    server.use(
      http.get('/api/v1/super-admin/qr-codes', () => {
        qrRequestCount += 1;
        return HttpResponse.json({ message: 'vendedorId requerido' }, { status: 400 });
      }),
      http.get('/api/v1/super-admin/link-invitacion', () => {
        linkRequestCount += 1;
        return HttpResponse.json({ message: 'vendedorId requerido' }, { status: 400 });
      })
    );

    renderPage();

    expect(await screen.findByText('Panel de Administración')).toBeInTheDocument();
    expect(qrRequestCount).toBe(0);
    expect(linkRequestCount).toBe(0);
  });
});
