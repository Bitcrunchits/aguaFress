import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
  http.get('/api/v1/brands/list', () => HttpResponse.json([{ id: 'brand-1', nombre: 'AguaFress', vendedorId: 'vendedor-1', createdAt: '2026-07-27T00:00:00.000Z', updatedAt: '2026-07-27T00:00:00.000Z' }]))
);

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CatalogoPage />
    </QueryClientProvider>
  );
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
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
});
