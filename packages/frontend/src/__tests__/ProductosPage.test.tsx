import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { CreateProductRequest, ProductResponse, UpdateProductRequest } from '@agua/contracts';
import ProductosPage from '../features/productos/pages/ProductosPage';

const baseProduct: ProductResponse = {
  id: 'product-1',
  nombre: 'Bidón 20L',
  descripcion: 'Agua purificada retornable',
  precioSinIva: 1000,
  porcentajeIva: 21,
  porcentajeImpuestos: 0,
  costoIva: 210,
  costoImpuestos: 0,
  precioFinal: 1210,
  stock: 12,
  marca: 'AguaFress',
  categoria: 'Bidones',
  vendedorId: 'vendedor-1',
  activo: true,
  mostrarPrecio: true,
};

let products: ProductResponse[] = [baseProduct];
let createRequestBody: CreateProductRequest | null = null;
let updateRequestBody: UpdateProductRequest | null = null;

const server = setupServer(
  http.get('/api/v1/products/list', () => {
    return HttpResponse.json({
      data: products,
      pagination: { page: 1, limit: 20, total: products.length, totalPages: products.length > 0 ? 1 : 0 },
    });
  }),

  http.get('/api/v1/categories/list', () => {
    return HttpResponse.json([
      { id: '0b7ce8cc-4f3f-46e4-9f09-6f7f34f81eb3', nombre: 'Bidones', orden: 1, vendedorId: 'vendedor-1', activo: true, createdAt: '2026-07-27T00:00:00.000Z', updatedAt: '2026-07-27T00:00:00.000Z' },
    ]);
  }),

  http.get('/api/v1/brands/list', () => {
    return HttpResponse.json([
      { id: '1d21b52f-e313-48ce-a2af-d9ad021e26e4', nombre: 'AguaFress', vendedorId: 'vendedor-1', activo: true, createdAt: '2026-07-27T00:00:00.000Z', updatedAt: '2026-07-27T00:00:00.000Z' },
    ]);
  }),

  http.post('/api/v1/products/create', async ({ request }) => {
    createRequestBody = await request.json() as CreateProductRequest;
    const createdProduct: ProductResponse = {
      ...baseProduct,
      id: 'product-2',
      nombre: createRequestBody.nombre,
      descripcion: createRequestBody.descripcion,
      precioSinIva: createRequestBody.precioSinIva,
      porcentajeIva: createRequestBody.porcentajeIva ?? 21,
      porcentajeImpuestos: createRequestBody.porcentajeImpuestos ?? 0,
      stock: createRequestBody.stock,
      categoria: 'Bidones',
      marca: 'AguaFress',
    };
    products = [...products, createdProduct];

    return HttpResponse.json(createdProduct);
  }),

  http.patch('/api/v1/products/update', async ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (id !== 'product-1') {
      return HttpResponse.json({ statusCode: 404, message: 'No encontrado' }, { status: 404 });
    }

    updateRequestBody = await request.json() as UpdateProductRequest;
    products = products.map((product) => (
      product.id === id
        ? {
          ...product,
          nombre: updateRequestBody?.nombre ?? product.nombre,
          descripcion: updateRequestBody?.descripcion ?? product.descripcion,
          precioSinIva: updateRequestBody?.precioSinIva ?? product.precioSinIva,
          porcentajeIva: updateRequestBody?.porcentajeIva ?? product.porcentajeIva,
          porcentajeImpuestos: updateRequestBody?.porcentajeImpuestos ?? product.porcentajeImpuestos,
          stock: updateRequestBody?.stock ?? product.stock,
          activo: updateRequestBody?.activo ?? product.activo,
          mostrarPrecio: updateRequestBody?.mostrarPrecio ?? product.mostrarPrecio,
          categoria: updateRequestBody?.categoriaId ? 'Bidones' : product.categoria,
          marca: updateRequestBody?.marcaId ? 'AguaFress' : product.marca,
        }
        : product
    ));

    return HttpResponse.json(products.find((product) => product.id === id));
  }),

  http.delete('/api/v1/products/delete', ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (id !== 'product-1') {
      return HttpResponse.json({ statusCode: 404, message: 'No encontrado' }, { status: 404 });
    }

    return HttpResponse.json({ id: 'product-1', deleted: true });
  })
);

let queryClient: QueryClient;

function renderPage() {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ProductosPage />
    </QueryClientProvider>
  );
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  queryClient.clear();
  products = [baseProduct];
  createRequestBody = null;
  updateRequestBody = null;
});
afterAll(() => server.close());

describe('ProductosPage', () => {
  it('shows loading state initially', () => {
    renderPage();

    expect(screen.getByText('Cargando productos...')).toBeInTheDocument();
  });

  it('lists products from the gateway response', async () => {
    renderPage();

    expect(await screen.findByText('Bidón 20L')).toBeInTheDocument();
    expect(screen.getByText('Bidones · AguaFress')).toBeInTheDocument();
    expect(screen.getByText('1 productos · página 1 de 1')).toBeInTheDocument();
    expect(screen.getByText('Activo')).toBeInTheDocument();
  });

  it('toggles product active state through the gateway', async () => {
    const user = userEvent.setup();

    renderPage();

    await screen.findByText('Bidón 20L');
    await user.click(screen.getByRole('button', { name: 'Desactivar' }));

    expect(await screen.findByText('Inactivo')).toBeInTheDocument();
  });

  it('deletes products through the gateway', async () => {
    const user = userEvent.setup();

    renderPage();

    await screen.findByText('Bidón 20L');
    await user.click(screen.getByRole('button', { name: 'Eliminar' }));

    expect(await screen.findByText('Bidón 20L')).toBeInTheDocument();
  });

  it('creates products through the gateway without identity fields in the body', async () => {
    const user = userEvent.setup();

    renderPage();

    await user.type(await screen.findByLabelText('Nombre'), 'Soda 2L');
    await user.selectOptions(screen.getByLabelText('Categoría'), '0b7ce8cc-4f3f-46e4-9f09-6f7f34f81eb3');
    await user.clear(screen.getByLabelText('Precio sin IVA'));
    await user.type(screen.getByLabelText('Precio sin IVA'), '800');
    await user.clear(screen.getByLabelText('Stock'));
    await user.type(screen.getByLabelText('Stock'), '8');
    await user.click(screen.getByRole('button', { name: 'Crear producto' }));

    expect(await screen.findByText('Soda 2L')).toBeInTheDocument();
    expect(createRequestBody).toMatchObject({
      nombre: 'Soda 2L',
      precioSinIva: 800,
      stock: 8,
      categoriaId: '0b7ce8cc-4f3f-46e4-9f09-6f7f34f81eb3',
    });
    expect(createRequestBody).not.toHaveProperty('vendedorId');
    expect(createRequestBody).not.toHaveProperty('userId');
    expect(createRequestBody).not.toHaveProperty('clienteId');
  });

  it('edits products through the gateway update query endpoint', async () => {
    const user = userEvent.setup();

    renderPage();

    await screen.findByText('Bidón 20L');
    await user.click(screen.getByRole('button', { name: 'Editar' }));
    await user.clear(screen.getAllByLabelText('Nombre')[1]);
    await user.type(screen.getAllByLabelText('Nombre')[1], 'Bidón retornable 20L');
    await user.clear(screen.getAllByLabelText('Stock')[1]);
    await user.type(screen.getAllByLabelText('Stock')[1], '20');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByText('Bidón retornable 20L')).toBeInTheDocument();
    expect(updateRequestBody).toMatchObject({ nombre: 'Bidón retornable 20L', stock: 20 });
    expect(updateRequestBody).not.toHaveProperty('vendedorId');
    expect(updateRequestBody).not.toHaveProperty('userId');
    expect(updateRequestBody).not.toHaveProperty('clienteId');
  });

  it('validates required category before creating a product', async () => {
    const user = userEvent.setup();

    renderPage();

    await user.type(await screen.findByLabelText('Nombre'), 'Soda 2L');
    await user.clear(screen.getByLabelText('Precio sin IVA'));
    await user.type(screen.getByLabelText('Precio sin IVA'), '800');
    await user.click(screen.getByRole('button', { name: 'Crear producto' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Seleccioná una categoría para crear el producto.');
    expect(createRequestBody).toBeNull();
  });

  it('shows empty state when the gateway returns no products', async () => {
    server.use(
      http.get('/api/v1/products/list', () => {
        return HttpResponse.json({
          data: [],
          pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        });
      })
    );

    renderPage();

    expect(await screen.findByText('No hay productos para mostrar')).toBeInTheDocument();
  });

  it('shows error state when the gateway fails', async () => {
    server.use(
      http.get('/api/v1/products/list', () => {
        return HttpResponse.json(
          { statusCode: 500, message: 'Error interno' },
          { status: 500 }
        );
      })
    );

    renderPage();

    expect(await screen.findByText(/request failed/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
  });
});
