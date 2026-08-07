import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import { useClienteProviderSelection } from '../hooks/useClienteProviderSelection';

const server = setupServer();
let selectedProviderBody: unknown;

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

  return function HookWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  selectedProviderBody = undefined;
  server.resetHandlers();
});
afterAll(() => server.close());

describe('useClienteProviderSelection', () => {
  it('requires explicit provider selection when no default provider is active', async () => {
    server.use(
      http.get('/api/v1/clientes/providers', () => HttpResponse.json({
        providers: [
          { id: 'vendedor-1', nombre: 'Carlos', empresa: 'Agua Norte', isDefault: false },
          { id: 'vendedor-2', nombre: 'Ana', empresa: 'Soda Sur', isDefault: false },
        ],
        requiresSelection: true,
      }))
    );

    const { result } = renderHook(() => useClienteProviderSelection(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.providers).toHaveLength(2);
    expect(result.current.selectedProvider).toBeUndefined();
    expect(result.current.selectedVendedorId).toBeUndefined();
    expect(result.current.isProviderSelectionRequired).toBe(true);
  });

  it('selects a provider with only the domain vendedorId body', async () => {
    server.use(
      http.get('/api/v1/clientes/providers', () => HttpResponse.json({
        providers: [
          { id: 'vendedor-1', nombre: 'Carlos', empresa: 'Agua Norte', isDefault: false },
          { id: 'vendedor-2', nombre: 'Ana', empresa: 'Soda Sur', isDefault: false },
        ],
        requiresSelection: true,
      })),
      http.post('/api/v1/clientes/providers/select', async ({ request }) => {
        selectedProviderBody = await request.json();
        return HttpResponse.json({
          selectedProvider: { id: 'vendedor-2', nombre: 'Ana', empresa: 'Soda Sur', isDefault: true },
        });
      })
    );

    const { result } = renderHook(() => useClienteProviderSelection(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isProviderSelectionRequired).toBe(true));
    await act(async () => {
      await result.current.selectProvider({ vendedorId: 'vendedor-2' });
    });

    expect(selectedProviderBody).toEqual({ vendedorId: 'vendedor-2' });
    expect(JSON.stringify(selectedProviderBody)).not.toContain('userId');
    await waitFor(() => expect(result.current.selectedVendedorId).toBe('vendedor-2'));
    expect(result.current.isProviderSelectionRequired).toBe(false);
  });

  it('surfaces provider loading errors without falling back to empty catalog state', async () => {
    server.use(
      http.get('/api/v1/clientes/providers', () => HttpResponse.json({ message: 'Provider service unavailable' }, { status: 503 }))
    );

    const { result } = renderHook(() => useClienteProviderSelection(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.errorMessage).toBe('Provider service unavailable');
    expect(result.current.providers).toEqual([]);
  });
});
