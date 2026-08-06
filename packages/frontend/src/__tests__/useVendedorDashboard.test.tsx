import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { useVendedorDashboard } from '../features/vendedor/hooks/useVendedorDashboard';

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
    ]);
  }),

  http.get('/api/v1/qr/vendor/list', () => {
    return HttpResponse.json({
      data: [
        { id: 'qr-1', qrCode: 'base64', url: 'https://agua.app/qr-1', expiresAt: '2026-07-29T00:00:00.000Z', activo: true },
      ],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
  })
);

let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
  server.resetHandlers();
  queryClient.clear();
});
afterAll(() => server.close());

describe('useVendedorDashboard', () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  it('returns clientes and vendedor data on success', async () => {
    const { result } = renderHook(() => useVendedorDashboard(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isError).toBe(false);
    expect(result.current.clientes).toHaveLength(2);
    expect(result.current.clientes[0].nombre).toBe('Juan');
    expect(result.current.clientes[1].nombre).toBe('María');
    expect(result.current.vendedor?.nombre).toBe('Carlos');
    expect(result.current.vendedor?.empresa).toBe('Agua Fress SRL');
    expect(result.current.recentOrders).toHaveLength(1);
    expect(result.current.metrics.pendingOrders).toBe('1');
    expect(result.current.metrics.activeQr).toBe('1');
  });

  it('returns error when fetch fails', async () => {
    server.use(
      http.get('/api/v1/clientes/list', () => {
        return HttpResponse.json(
          { statusCode: 500, message: 'Error interno' },
          { status: 500 }
        );
      }),
      http.get('/api/v1/vendedores/profile', () => {
        return HttpResponse.json(
          { statusCode: 500, message: 'Error interno' },
          { status: 500 }
        );
      }),
      http.get('/api/v1/orders/list', () => {
        return HttpResponse.json(
          { statusCode: 500, message: 'Error interno' },
          { status: 500 }
        );
      }),
      http.get('/api/v1/qr/vendor/list', () => {
        return HttpResponse.json(
          { statusCode: 500, message: 'Error interno' },
          { status: 500 }
        );
      })
    );

    const { result } = renderHook(() => useVendedorDashboard(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isError).toBe(true);
  });
});
