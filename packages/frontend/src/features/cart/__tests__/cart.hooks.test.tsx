import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import { useCart } from '../hooks/useCart';

const server = setupServer();
let cartGetVendedorIds: string[] = [];
let addCartBody: unknown;

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

  return function HookWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function cartResponse(total: number) {
  return {
    id: 'cart-1',
    clienteId: 'cliente-user-1',
    vendedorId: 'vendedor-1',
    items: total > 0
      ? [{ id: 'item-1', productoId: 'product-1', nombre: 'Bidón 20L', cantidad: 1, precioUnitario: total, subtotal: total }]
      : [],
    total,
    expiresAt: '2026-08-07T00:00:00.000Z',
  };
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cartGetVendedorIds = [];
  addCartBody = undefined;
  server.resetHandlers();
});
afterAll(() => server.close());

describe('useCart', () => {
  it('adds a product with the selected provider and refetches that provider-scoped cart', async () => {
    server.use(
      http.get('/api/v1/clientes/providers', () => HttpResponse.json({
        providers: [{ id: 'vendedor-1', nombre: 'Carlos', empresa: 'Agua Norte', isDefault: true }],
        requiresSelection: false,
      })),
      http.get('/api/v1/cart/get', ({ request }) => {
        const vendedorId = new URL(request.url).searchParams.get('vendedorId') ?? '';
        cartGetVendedorIds.push(vendedorId);
        return HttpResponse.json(cartResponse(cartGetVendedorIds.length === 1 ? 0 : 1210));
      }),
      http.post('/api/v1/cart/items/add', async ({ request }) => {
        addCartBody = await request.json();
        return HttpResponse.json(cartResponse(1210));
      })
    );

    const { result } = renderHook(() => useCart(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.selectedProvider?.id).toBe('vendedor-1'));
    await result.current.addProductToCart({ productoId: 'product-1', cantidad: 1 });

    expect(addCartBody).toEqual({ productoId: 'product-1', cantidad: 1, vendedorId: 'vendedor-1' });
    expect(JSON.stringify(addCartBody)).not.toContain('userId');
    await waitFor(() => expect(cartGetVendedorIds).toEqual(['vendedor-1', 'vendedor-1']));
    expect(result.current.cart?.total).toBe(1210);
  });

  it('keeps add-to-cart errors visible when the cart mutation fails', async () => {
    server.use(
      http.get('/api/v1/clientes/providers', () => HttpResponse.json({
        providers: [{ id: 'vendedor-1', nombre: 'Carlos', empresa: 'Agua Norte', isDefault: true }],
        requiresSelection: false,
      })),
      http.get('/api/v1/cart/get', () => HttpResponse.json(cartResponse(0))),
      http.post('/api/v1/cart/items/add', () => HttpResponse.json({ message: 'Product unavailable' }, { status: 409 }))
    );

    const { result } = renderHook(() => useCart(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.selectedProvider?.id).toBe('vendedor-1'));
    await expect(result.current.addProductToCart({ productoId: 'product-1', cantidad: 1 })).rejects.toThrow();

    await waitFor(() => expect(result.current.mutationErrorMessage).toBe('Product unavailable'));
  });
});
