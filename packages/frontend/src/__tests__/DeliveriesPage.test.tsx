import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DeliveryEstado, DeliveryJobStatus } from '@agua/contracts';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import DeliveriesPage from '../features/deliveries/pages/DeliveriesPage';

let idempotencyKey: string | null = null;

const server = setupServer(
  http.get('/api/v1/deliveries/list', () => HttpResponse.json({
    data: [{
      id: 'delivery-1',
      orderId: 'order-1',
      vendedorId: 'vendedor-1',
      clienteId: 'cliente-1',
      estado: DeliveryEstado.PENDIENTE,
      cliente: { nombre: 'Ana' },
      direccion: { calle: 'San Martín', numero: '123' },
      fechaAsignacion: '2026-07-27T00:00:00.000Z',
    }],
    pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
  })),
  http.patch('/api/v1/deliveries/update-status', ({ request }) => {
    idempotencyKey = request.headers.get('Idempotency-Key');
    return HttpResponse.json({
      jobId: 'job-1',
      trackingId: 'tracking-1',
      status: DeliveryJobStatus.PENDING,
      statusUrl: '/api/v1/deliveries/job-status?id=tracking-1',
      acceptedAt: '2026-07-27T00:00:00.000Z',
    }, { status: 202 });
  }),
  http.get('/api/v1/deliveries/job-status', () => HttpResponse.json({
    trackingId: 'tracking-1',
    deliveryId: 'delivery-1',
    status: DeliveryJobStatus.COMPLETED,
    attempts: 1,
    createdAt: '2026-07-27T00:00:00.000Z',
    updatedAt: '2026-07-27T00:00:01.000Z',
  }))
);

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <DeliveriesPage />
    </QueryClientProvider>
  );
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  idempotencyKey = null;
  server.resetHandlers();
});
afterAll(() => server.close());

describe('DeliveriesPage', () => {
  it('sends idempotency key and renders accepted tracking state', async () => {
    renderPage();

    expect(await screen.findByText('Entrega delivery-1')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'En camino' }));

    expect(idempotencyKey).toBeTruthy();
    expect(await screen.findByText(/Tracking: tracking-1/)).toBeInTheDocument();
  });
});
