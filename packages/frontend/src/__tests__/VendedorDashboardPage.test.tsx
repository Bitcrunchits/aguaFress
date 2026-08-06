import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import VendedorDashboardPage from '../features/vendedor/pages/VendedorDashboardPage';

vi.mock('../../features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', nombre: 'Carlos', apellido: 'López', email: 'carlos@test.com', role: 'vendedor' },
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    token: 'fake-token',
  }),
}));

const server = setupServer(
  http.get('/api/v1/clientes/list', () => {
    return HttpResponse.json([
      {
        id: 'cliente-1',
        nombre: 'Juan',
        apellido: 'Pérez',
        telefono: '123456789',
        address: 'Calle Falsa 123',
        tipoFactura: 'B',
      },
      {
        id: 'cliente-2',
        nombre: 'María',
        apellido: 'García',
        telefono: '987654321',
        address: 'Av. Siempre Viva 456',
        tipoFactura: 'C',
      },
    ]);
  }),

  http.get('/api/v1/vendedores/profile', () => {
    return HttpResponse.json({
      id: 'vendedor-1',
      nombre: 'Carlos',
      apellido: 'López',
      empresa: 'Agua Fress SRL',
      email: 'carlos@aguafress.com',
      telefono: '555-0123',
      ciudad: 'Buenos Aires',
      estado: 'activo',
    });
  }),

  http.get('/api/v1/orders/list', () => {
    return HttpResponse.json([
      {
        id: 'order-1',
        pedidoNumero: '1001',
        estado: 'pendiente',
        total: 2400,
        clienteNombre: 'Juan',
        clienteApellido: 'Pérez',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'order-2',
        pedidoNumero: '1002',
        estado: 'entregado',
        total: 1200,
        clienteNombre: 'María',
        clienteApellido: 'García',
        createdAt: new Date().toISOString(),
      },
    ]);
  }),

  http.get('/api/v1/qr/vendor/list', () => {
    return HttpResponse.json({
      data: [
        { id: 'qr-1', qrCode: 'base64', url: 'https://agua.app/qr-1', expiresAt: '2026-07-29T00:00:00.000Z', activo: true },
        { id: 'qr-2', qrCode: 'base64', url: 'https://agua.app/qr-2', expiresAt: '2026-07-29T00:00:00.000Z', activo: false },
      ],
      pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
    });
  })
);

let queryClient: QueryClient;

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
  server.resetHandlers();
  queryClient.clear();
});
afterAll(() => server.close());

function renderPage() {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <VendedorDashboardPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('VendedorDashboardPage', () => {
  it('shows loading skeleton initially', () => {
    renderPage();
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });

  it('shows dashboard with clientes on success', async () => {
    renderPage();

    const juanElements = await screen.findAllByText(/Juan Pérez/);
    expect(juanElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/María García/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Carlos/)).toBeInTheDocument();
    expect(screen.getByText('Total Clientes')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('#1001 — Juan Pérez')).toBeInTheDocument();
    expect(screen.getByText('Órdenes Pendientes')).toBeInTheDocument();
    expect(screen.getByText('QR Activos')).toBeInTheDocument();
  });

  it('shows error state when API fails', async () => {
    server.use(
      http.get('/api/v1/clientes/list', () => {
        return HttpResponse.json(
          { statusCode: 500, message: 'Error del servidor' },
          { status: 500 }
        );
      })
    );

    renderPage();

    expect(await screen.findByText(/request failed/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
  });
});
