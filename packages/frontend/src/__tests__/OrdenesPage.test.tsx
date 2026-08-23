import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MetodoPago, OrderEstado, UserRole } from '@agua/contracts';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { AuthContext, type AuthContextValue } from '../context/AuthContext';
import OrdenesPage from '../features/ordenes/pages/OrdenesPage';

const server = setupServer(
  http.get('/api/v1/orders/list', () => HttpResponse.json([{
    id: 'order-1',
    pedidoNumero: 'AF-001',
    estado: OrderEstado.PENDIENTE,
    total: 2400,
    clienteNombre: 'Ana',
    createdAt: '2026-07-27T00:00:00.000Z',
  }])),
  http.get('/api/v1/orders/get-by-id/order-1', () => HttpResponse.json({
    id: 'order-1',
    pedidoNumero: 'AF-001',
    clienteId: 'cliente-user-1',
    vendedorId: 'vendedor-1',
    items: [{ productId: 'product-1', nombre: 'Bidón 20L', cantidad: 2, precioUnitario: 1200 }],
    totalSinIva: 2400,
    iva: 0,
    total: 2400,
    estado: OrderEstado.PENDIENTE,
    metodoPago: MetodoPago.CONTRA_ENTREGA,
    direccion: { calle: 'San Martín', numero: '123' },
    createdAt: '2026-07-27T00:00:00.000Z',
    updatedAt: '2026-07-27T00:00:00.000Z',
  }))
);

function createAuthValue(): AuthContextValue {
  return {
    user: { id: 'vendedor-user-1', email: 'vendedor@test.com', role: UserRole.VENDEDOR, isActive: true },
    token: 'token',
    isLoading: false,
    isAuthenticated: true,
    login: vi.fn().mockRejectedValue(new Error('not implemented')),
    logout: vi.fn(),
  };
}

function renderPage(authValue: AuthContextValue = createAuthValue()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <OrdenesPage />
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('OrdenesPage', () => {
  it('renders order list success state from the gateway', async () => {
    renderPage();

    expect(await screen.findByText('Pedido AF-001')).toBeInTheDocument();
    expect(screen.getByText(/Ana/)).toBeInTheDocument();
  });

  it('loads order detail and exposes role-scoped actions', async () => {
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Ver detalle' }));

    expect(await screen.findByText('Detalle pedido AF-001')).toBeInTheDocument();
    expect(screen.getByText(/Bidón 20L/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar pedido' })).toBeInTheDocument();
  });
});
