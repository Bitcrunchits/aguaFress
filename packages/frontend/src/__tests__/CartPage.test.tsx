import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import CartPage from '../features/cart/pages/CartPage';

let updatedQuantity = 0;

const server = setupServer(
  http.get('/api/v1/clientes/providers', () => HttpResponse.json({
    providers: [{ id: 'vendedor-1', nombre: 'Carlos', empresa: 'Agua Norte', isDefault: true }],
    requiresSelection: false,
  })),
  http.get('/api/v1/cart/get', () => HttpResponse.json({
    id: 'cart-1',
    clienteId: 'cliente-user-1',
    vendedorId: 'vendedor-1',
    items: [{ id: 'item-1', productoId: 'product-1', nombre: 'Bidón 20L', cantidad: 2, precioUnitario: 1000, subtotal: 2000 }],
    total: 2000,
    expiresAt: '2026-07-28T00:00:00.000Z',
  })),
  http.patch('/api/v1/cart/items/update', async ({ request }) => {
    const body = await request.json() as { cantidad: number };
    updatedQuantity = body.cantidad;
    return HttpResponse.json({
      id: 'cart-1',
      clienteId: 'cliente-user-1',
      vendedorId: 'vendedor-1',
      items: [],
      total: 0,
      expiresAt: '2026-07-28T00:00:00.000Z',
    });
  })
);

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CartPage />
    </QueryClientProvider>
  );
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  updatedQuantity = 0;
  server.resetHandlers();
});
afterAll(() => server.close());

describe('CartPage', () => {
  it('renders cart data and updates item quantity through the gateway', async () => {
    renderPage();

    expect(await screen.findByText('Bidón 20L')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '+' }));

    expect(updatedQuantity).toBe(3);
  });
});
