import { beforeAll, afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MetodoPago, OrderJobStatus } from '@agua/contracts';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import CartPage from '../pages/CartPage';

const server = setupServer();

let createOrderBody: unknown;
let createOrderIdempotencyKey: string | null = null;
let createOrderRequests = 0;
let jobStatusRequests = 0;

function renderCartPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <CartPage />
    </QueryClientProvider>
  );
}

function cartResponse(itemsCount: number) {
  return {
    id: 'cart-1',
    clienteId: 'cliente-user-1',
    vendedorId: 'vendedor-1',
    items: itemsCount > 0
      ? [{ id: 'item-1', productoId: 'product-1', nombre: 'Bidón 20L', cantidad: 2, precioUnitario: 1000, subtotal: 2000 }]
      : [],
    total: itemsCount > 0 ? 2000 : 0,
    expiresAt: '2026-08-07T00:00:00.000Z',
  };
}

function useDefaultHandlers(itemsCount = 1) {
  server.use(
    http.get('/api/v1/clientes/providers', () => HttpResponse.json({
      providers: [{ id: 'vendedor-1', nombre: 'Carlos', empresa: 'Agua Norte', isDefault: true }],
      requiresSelection: false,
    })),
    http.get('/api/v1/cart/get', () => HttpResponse.json(cartResponse(itemsCount))),
    http.post('/api/v1/orders/create', async ({ request }) => {
      createOrderRequests += 1;
      createOrderBody = await request.json();
      createOrderIdempotencyKey = request.headers.get('Idempotency-Key');
      return HttpResponse.json({
        jobId: 'orders.create:cliente-user-1:key-1',
        trackingId: 'tracking-1',
        vendedorId: 'vendedor-1',
        status: OrderJobStatus.PENDING,
        statusUrl: '/api/v1/orders/job-status?id=tracking-1',
        acceptedAt: '2026-08-07T00:00:00.000Z',
      }, { status: 202 });
    })
  );
}

async function fillRequiredCheckoutAddress() {
  await userEvent.type(screen.getByLabelText('Calle'), 'San Martín');
  await userEvent.type(screen.getByLabelText('Número'), '123');
  await userEvent.type(screen.getByLabelText('Ciudad'), 'Mendoza');
  await userEvent.type(screen.getByLabelText('Provincia'), 'Mendoza');
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  createOrderBody = undefined;
  createOrderIdempotencyKey = null;
  createOrderRequests = 0;
  jobStatusRequests = 0;
  vi.useRealTimers();
  server.resetHandlers();
});
afterAll(() => server.close());

describe('CartPage checkout', () => {
  it('blocks checkout when required delivery address fields are missing', async () => {
    useDefaultHandlers();

    renderCartPage();

    await screen.findByText('Bidón 20L');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar pedido' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Completá calle, número, ciudad y provincia.');
    expect(createOrderRequests).toBe(0);
  });

  it('sends CreateOrderV2Request with Idempotency-Key and no editable userId', async () => {
    useDefaultHandlers();
    server.use(
      http.get('/api/v1/orders/job-status', () => HttpResponse.json({
        jobId: 'orders.create:cliente-user-1:key-1',
        trackingId: 'tracking-1',
        clienteId: 'cliente-user-1',
        vendedorId: 'vendedor-1',
        idempotencyKey: 'key-1',
        status: OrderJobStatus.COMPLETED,
        orderId: 'order-1',
        attempts: 1,
        createdAt: '2026-08-07T00:00:00.000Z',
        updatedAt: '2026-08-07T00:00:01.000Z',
      }))
    );

    renderCartPage();

    await screen.findByText('Bidón 20L');
    await fillRequiredCheckoutAddress();
    await userEvent.type(screen.getByLabelText('Observaciones'), 'Dejar en recepción');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar pedido' }));

    await waitFor(() => expect(createOrderRequests).toBe(1));
    expect(createOrderBody).toEqual({
      vendedorId: 'vendedor-1',
      metodoPago: MetodoPago.CONTRA_ENTREGA,
      direccion: { calle: 'San Martín', numero: '123', ciudad: 'Mendoza', provincia: 'Mendoza' },
      observaciones: 'Dejar en recepción',
    });
    expect(JSON.stringify(createOrderBody)).not.toContain('userId');
    expect(createOrderIdempotencyKey).toEqual(expect.stringMatching(/\S+/));
  });

  it('blocks checkout when the provider-scoped cart is empty', async () => {
    useDefaultHandlers(0);

    renderCartPage();

    expect(await screen.findByText('Tu carrito está vacío')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirmar pedido' })).not.toBeInTheDocument();
    expect(createOrderRequests).toBe(0);
  });

  it('polls the accepted order job until completed and then stops', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    useDefaultHandlers();
    server.use(
      http.get('/api/v1/orders/job-status', () => {
        jobStatusRequests += 1;
        return HttpResponse.json({
          jobId: 'orders.create:cliente-user-1:key-1',
          trackingId: 'tracking-1',
          clienteId: 'cliente-user-1',
          vendedorId: 'vendedor-1',
          idempotencyKey: 'key-1',
          status: jobStatusRequests === 1 ? OrderJobStatus.PROCESSING : OrderJobStatus.COMPLETED,
          orderId: jobStatusRequests === 1 ? undefined : 'order-1',
          attempts: jobStatusRequests,
          createdAt: '2026-08-07T00:00:00.000Z',
          updatedAt: '2026-08-07T00:00:01.000Z',
        });
      })
    );

    renderCartPage();

    await screen.findByText('Bidón 20L');
    await fillRequiredCheckoutAddress();
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar pedido' }));

    expect(await screen.findByText(/tracking-1/)).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_100);
    });
    expect(await screen.findByText('Pedido creado: order-1')).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_500);
    });
    expect(jobStatusRequests).toBe(2);
  });

  it('shows terminal order job failure state', async () => {
    useDefaultHandlers();
    server.use(
      http.get('/api/v1/orders/job-status', () => HttpResponse.json({
        jobId: 'orders.create:cliente-user-1:key-1',
        trackingId: 'tracking-1',
        clienteId: 'cliente-user-1',
        vendedorId: 'vendedor-1',
        idempotencyKey: 'key-1',
        status: OrderJobStatus.FAILED,
        errorCode: 'PRODUCT_UNAVAILABLE',
        errorMessage: 'Producto sin stock',
        attempts: 3,
        createdAt: '2026-08-07T00:00:00.000Z',
        updatedAt: '2026-08-07T00:00:03.000Z',
      }))
    );

    renderCartPage();

    await screen.findByText('Bidón 20L');
    await fillRequiredCheckoutAddress();
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar pedido' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Producto sin stock');
  });
});
