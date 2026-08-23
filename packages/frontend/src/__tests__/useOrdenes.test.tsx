import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MetodoPago, OrderJobStatus, type CreateOrderV2Request } from '@agua/contracts';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import { useOrdenes } from '../features/ordenes/hooks/useOrdenes';

const idempotencyKeys: string[] = [];

const orderRequest: CreateOrderV2Request = {
  vendedorId: '550e8400-e29b-41d4-a716-446655440001',
  metodoPago: MetodoPago.CONTRA_ENTREGA,
  direccion: { calle: 'San Martín', numero: '123' },
};

const server = setupServer(
  http.get('/api/v1/orders/list', () => HttpResponse.json([])),
  http.post('/api/v1/orders/create', ({ request }) => {
    idempotencyKeys.push(request.headers.get('Idempotency-Key') ?? '');
    return HttpResponse.json({
      jobId: 'job-1',
      trackingId: 'tracking-1',
      vendedorId: orderRequest.vendedorId,
      status: OrderJobStatus.PENDING,
      statusUrl: '/api/v1/orders/job-status?id=tracking-1',
      acceptedAt: '2026-07-27T00:00:00.000Z',
    }, { status: 202 });
  }),
  http.get('/api/v1/orders/job-status', () => HttpResponse.json({
    jobId: 'job-1',
    trackingId: 'tracking-1',
    clienteId: 'cliente-user-1',
    vendedorId: orderRequest.vendedorId,
    idempotencyKey: idempotencyKeys[0] ?? '',
    status: OrderJobStatus.PENDING,
    attempts: 1,
    createdAt: '2026-07-27T00:00:00.000Z',
    updatedAt: '2026-07-27T00:00:00.000Z',
  }))
);

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

  return function HookWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  idempotencyKeys.length = 0;
  server.resetHandlers();
});
afterAll(() => server.close());

describe('useOrdenes', () => {
  it('reuses the idempotency key while an order command is still pending', async () => {
    const { result } = renderHook(() => useOrdenes(), { wrapper: createWrapper() });

    result.current.createOrder(orderRequest);
    await waitFor(() => expect(idempotencyKeys).toHaveLength(1));

    result.current.createOrder(orderRequest);
    await waitFor(() => expect(idempotencyKeys).toHaveLength(2));

    expect(idempotencyKeys[0]).toBe(idempotencyKeys[1]);
  });
});
