import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import CatalogoPage from '../features/catalogo/pages/CatalogoPage';

const server = setupServer(
  http.get('/api/v1/clientes/providers', () => HttpResponse.json({
    providers: [{ id: 'vendedor-1', nombre: 'Carlos', empresa: 'Agua Norte', isDefault: true }],
    requiresSelection: false,
  })),
  http.get('/api/v1/products/list', () => HttpResponse.json({
    data: [{
      id: 'product-1',
      nombre: 'Bidón 20L',
      precioSinIva: 1000,
      porcentajeIva: 21,
      porcentajeImpuestos: 0,
      costoIva: 210,
      costoImpuestos: 0,
      precioFinal: 1210,
      stock: 5,
      vendedorId: 'vendedor-1',
      activo: true,
    }],
    pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
  })),
  http.get('/api/v1/categories/list', () => HttpResponse.json([{ id: 'cat-1', nombre: 'Bidones', orden: 1, vendedorId: 'vendedor-1', createdAt: '2026-07-27T00:00:00.000Z', updatedAt: '2026-07-27T00:00:00.000Z' }])),
  http.get('/api/v1/brands/list', () => HttpResponse.json([{ id: 'brand-1', nombre: 'AguaFress', vendedorId: 'vendedor-1', createdAt: '2026-07-27T00:00:00.000Z', updatedAt: '2026-07-27T00:00:00.000Z' }])),
  http.get('/api/v1/cart/get', () => HttpResponse.json({
    id: 'cart-1',
    clienteId: 'cliente-user-1',
    vendedorId: 'vendedor-1',
    items: [],
    total: 0,
    expiresAt: '2026-07-28T00:00:00.000Z',
  }))
);

let addCartBody: unknown;
let productRequestCount = 0;

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CatalogoPage />
    </QueryClientProvider>
  );
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  addCartBody = undefined;
  productRequestCount = 0;
  server.resetHandlers();
});
afterAll(() => server.close());

describe('CatalogoPage', () => {
  it('renders provider catalog success state', async () => {
    renderPage();

    expect(await screen.findByText('Bidón 20L')).toBeInTheDocument();
    expect(screen.getByText(/Agua Norte/)).toBeInTheDocument();
    expect(screen.getByText('1 categorías · 1 marcas')).toBeInTheDocument();
  });

  it('renders provider empty state', async () => {
    server.use(
      http.get('/api/v1/clientes/providers', () => HttpResponse.json({ providers: [], requiresSelection: false }))
    );

    renderPage();

    expect(await screen.findByText('Todavía no tenés proveedores activos')).toBeInTheDocument();
  });

  it('renders provider selection UI and does not auto-load catalog when selection is required', async () => {
    server.use(
      http.get('/api/v1/clientes/providers', () => HttpResponse.json({
        providers: [
          { id: 'vendedor-1', nombre: 'Carlos', empresa: 'Agua Norte', isDefault: true },
          { id: 'vendedor-2', nombre: 'Ana', empresa: 'Soda Sur', isDefault: false },
        ],
        defaultVendedorId: 'vendedor-1',
        requiresSelection: true,
      })),
      http.get('/api/v1/products/list', () => {
        productRequestCount += 1;
        return HttpResponse.json({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
      })
    );

    renderPage();

    expect(await screen.findByRole('button', { name: 'Seleccionar Agua Norte' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Seleccionar Soda Sur' })).toBeInTheDocument();
    expect(screen.queryByText('Bidón 20L')).not.toBeInTheDocument();
    expect(productRequestCount).toBe(0);
  });

  it('selects a required provider and adds a catalog product with that vendor', async () => {
    server.use(
      http.get('/api/v1/clientes/providers', () => HttpResponse.json({
        providers: [{ id: 'vendedor-1', nombre: 'Carlos', empresa: 'Agua Norte', isDefault: false }],
        requiresSelection: true,
      })),
      http.post('/api/v1/clientes/providers/select', async () => HttpResponse.json({
        selectedProvider: { id: 'vendedor-1', nombre: 'Carlos', empresa: 'Agua Norte', isDefault: true },
      })),
      http.get('/api/v1/cart/get', () => HttpResponse.json({
        id: 'cart-1',
        clienteId: 'cliente-user-1',
        vendedorId: 'vendedor-1',
        items: [],
        total: 0,
        expiresAt: '2026-07-28T00:00:00.000Z',
      })),
      http.post('/api/v1/cart/items/add', async ({ request }) => {
        addCartBody = await request.json();
        return HttpResponse.json({
          id: 'cart-1',
          clienteId: 'cliente-user-1',
          vendedorId: 'vendedor-1',
          items: [],
          total: 1210,
          expiresAt: '2026-07-28T00:00:00.000Z',
        });
      })
    );

    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Seleccionar Agua Norte' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Agregar al carrito' }));

    await waitFor(() => expect(addCartBody).toEqual({ productoId: 'product-1', cantidad: 1, vendedorId: 'vendedor-1' }));
  });
});
