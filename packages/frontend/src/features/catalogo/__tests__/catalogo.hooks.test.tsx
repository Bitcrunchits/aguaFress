import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import { useCatalogo } from '../hooks/useCatalogo';

const server = setupServer();
let productRequestCount = 0;

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

  return function HookWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  productRequestCount = 0;
  server.resetHandlers();
});
afterAll(() => server.close());

describe('useCatalogo', () => {
  it('gates provider-scoped catalog queries until a provider is selected', async () => {
    server.use(
      http.get('/api/v1/clientes/providers', () => HttpResponse.json({
        providers: [{ id: 'vendedor-1', nombre: 'Carlos', empresa: 'Agua Norte', isDefault: false }],
        requiresSelection: true,
      })),
      http.get('/api/v1/products/list', () => {
        productRequestCount += 1;
        return HttpResponse.json({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
      })
    );

    const { result } = renderHook(() => useCatalogo(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isProviderSelectionRequired).toBe(true);
    expect(result.current.selectedProvider).toBeUndefined();
    expect(result.current.products).toEqual([]);
    expect(productRequestCount).toBe(0);
  });
});
