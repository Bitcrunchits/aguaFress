import { beforeAll, afterAll, afterEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { TipoFactura, VendedorEstado } from '@agua/contracts';
import AdminClientsPage from '../pages/AdminClientsPage';
import AdminClientDetailPage from '../pages/AdminClientDetailPage';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderAdminClientRoute(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/admin/clients" element={<AdminClientsPage />} />
          <Route path="/admin/clients/:clienteId" element={<AdminClientDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('admin client pages', () => {
  it('renders paginated client list from the gateway', async () => {
    server.use(
      http.get('/api/v1/clientes/list', () => HttpResponse.json({
        data: [
          {
            id: 'cliente-1',
            nombre: 'Laura',
            apellido: 'Perez',
            email: 'laura@test.com',
            telefono: '1111',
            totalPedidos: 3,
            fechaAsignacion: '2026-08-06T00:00:00.000Z',
          },
        ],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      }))
    );

    renderAdminClientRoute('/admin/clients');

    expect(await screen.findByRole('heading', { name: 'Clientes' })).toBeInTheDocument();
    expect(screen.getByText('Laura Perez')).toBeInTheDocument();
    expect(screen.getByText('laura@test.com')).toBeInTheDocument();
    expect(screen.getByText('1 clientes · página 1 de 1')).toBeInTheDocument();
  });

  it('shows empty and backend error states distinctly', async () => {
    server.use(
      http.get('/api/v1/clientes/list', () => HttpResponse.json({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      }))
    );

    renderAdminClientRoute('/admin/clients');

    expect(await screen.findByText('No hay clientes para mostrar')).toBeInTheDocument();

    server.use(
      http.get('/api/v1/clientes/list', () => HttpResponse.json({ message: 'Clientes no disponibles' }, { status: 500 }))
    );

    renderAdminClientRoute('/admin/clients');

    expect(await screen.findByText('Clientes no disponibles')).toBeInTheDocument();
  });

  it('loads client detail with provider relationships as read-only information', async () => {
    server.use(
      http.get('/api/v1/clientes/get-by-id/cliente-1', () => HttpResponse.json({
        id: 'cliente-1',
        nombre: 'Laura',
        apellido: 'Perez',
        email: 'laura@test.com',
        telefono: '1111',
        dni: '30111222',
        providers: [
          {
            id: 'vendedor-1',
            nombre: 'Agua Centro',
            apellido: 'SRL',
            email: 'centro@test.com',
            isDefault: true,
          },
        ],
      })),
      http.get('/api/v1/vendedores/list', () => HttpResponse.json({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      }))
    );

    renderAdminClientRoute('/admin/clients/cliente-1');

    expect(await screen.findByRole('heading', { name: 'Laura Perez' })).toBeInTheDocument();
    expect(screen.getByText('laura@test.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('30111222')).toBeInTheDocument();
    expect(screen.getByText('Agua Centro SRL')).toBeInTheDocument();
    expect(screen.getAllByText('Proveedor principal')).toHaveLength(2);
  });

  it('updates client detail and shows success feedback', async () => {
    let capturedBody: unknown;
    server.use(
      http.get('/api/v1/clientes/get-by-id/cliente-1', () => HttpResponse.json({
        id: 'cliente-1',
        nombre: 'Laura',
        apellido: 'Perez',
        email: 'laura@test.com',
        telefono: '1111',
        dni: '30111222',
        tipoFactura: TipoFactura.B,
        direccionFacturacion: 'Av. Siempre Viva 742',
        providers: [],
      })),
      http.get('/api/v1/vendedores/list', () => HttpResponse.json({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      })),
      http.patch('/api/v1/clientes/update/cliente-1', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({
          id: 'cliente-1',
          nombre: 'Laura',
          apellido: 'Gomez',
          email: 'laura@test.com',
          telefono: '2222',
          dni: '30111222',
          tipoFactura: TipoFactura.C,
          direccionFacturacion: 'Nueva dirección 123',
          providers: [],
        });
      })
    );

    renderAdminClientRoute('/admin/clients/cliente-1');

    await userEvent.clear(await screen.findByLabelText('Apellido'));
    await userEvent.type(screen.getByLabelText('Apellido'), 'Gomez');
    await userEvent.clear(screen.getByLabelText('Teléfono'));
    await userEvent.type(screen.getByLabelText('Teléfono'), '2222');
    await userEvent.selectOptions(screen.getByLabelText('Tipo de factura'), TipoFactura.C);
    await userEvent.clear(screen.getByLabelText('Dirección de facturación'));
    await userEvent.type(screen.getByLabelText('Dirección de facturación'), 'Nueva dirección 123');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cliente' }));

    await waitFor(() => expect(capturedBody).toEqual({
      nombre: 'Laura',
      apellido: 'Gomez',
      telefono: '2222',
      dni: '30111222',
      tipoFactura: TipoFactura.C,
      direccionFacturacion: 'Nueva dirección 123',
    }));
    expect(await screen.findByText('Cliente actualizado correctamente')).toBeInTheDocument();
  });

  it('shows backend update errors distinctly', async () => {
    server.use(
      http.get('/api/v1/clientes/get-by-id/cliente-1', () => HttpResponse.json({
        id: 'cliente-1',
        nombre: 'Laura',
        apellido: 'Perez',
        email: 'laura@test.com',
        telefono: '1111',
        providers: [],
      })),
      http.get('/api/v1/vendedores/list', () => HttpResponse.json({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      })),
      http.patch('/api/v1/clientes/update/cliente-1', () => HttpResponse.json({ message: 'DNI inválido' }, { status: 400 }))
    );

    renderAdminClientRoute('/admin/clients/cliente-1');

    await userEvent.clear(await screen.findByLabelText('DNI'));
    await userEvent.type(screen.getByLabelText('DNI'), 'mal');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cliente' }));

    expect(await screen.findByText('DNI inválido')).toBeInTheDocument();
    expect(screen.queryByText('No hay información del cliente')).not.toBeInTheDocument();
  });

  it('reassigns a client without userId or actorUserId in the body', async () => {
    let capturedBody: unknown;
    server.use(
      http.get('/api/v1/clientes/get-by-id/cliente-1', () => HttpResponse.json({
        id: 'cliente-1',
        nombre: 'Laura',
        apellido: 'Perez',
        email: 'laura@test.com',
        providers: [],
      })),
      http.get('/api/v1/vendedores/list', () => HttpResponse.json({
        data: [
          {
            id: 'vendedor-2',
            nombre: 'Agua Norte',
            email: 'norte@test.com',
            estado: VendedorEstado.ACTIVO,
            clientesCount: 1,
            fechaRegistro: '2026-08-06T00:00:00.000Z',
          },
        ],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      })),
      http.patch('/api/v1/clientes/reassign/cliente-1', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ clienteId: 'cliente-1', vendedorId: 'vendedor-2', updated: true });
      })
    );

    renderAdminClientRoute('/admin/clients/cliente-1');

    await userEvent.selectOptions(await screen.findByLabelText('Proveedor principal'), 'vendedor-2');
    await userEvent.click(screen.getByRole('button', { name: 'Reasignar cliente' }));

    await waitFor(() => expect(capturedBody).toEqual({ vendedorId: 'vendedor-2' }));
    expect(capturedBody).not.toHaveProperty('userId');
    expect(capturedBody).not.toHaveProperty('actorUserId');
    expect(await screen.findByText('Cliente reasignado correctamente')).toBeInTheDocument();
  });

  it('adds a provider relation without identity leakage and disables actions without vendors', async () => {
    let capturedBody: unknown;
    server.use(
      http.get('/api/v1/clientes/get-by-id/cliente-1', () => HttpResponse.json({
        id: 'cliente-1',
        nombre: 'Laura',
        apellido: 'Perez',
        email: 'laura@test.com',
        providers: [],
      })),
      http.get('/api/v1/vendedores/list', () => HttpResponse.json({
        data: [
          {
            id: 'vendedor-3',
            nombre: 'Agua Sur',
            email: 'sur@test.com',
            estado: VendedorEstado.ACTIVO,
            clientesCount: 0,
            fechaRegistro: '2026-08-06T00:00:00.000Z',
          },
        ],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      })),
      http.post('/api/v1/clientes/providers/add/cliente-1', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ clienteId: 'cliente-1', vendedorId: 'vendedor-3', active: true });
      })
    );

    renderAdminClientRoute('/admin/clients/cliente-1');

    await userEvent.selectOptions(await screen.findByLabelText('Proveedor adicional'), 'vendedor-3');
    await userEvent.click(screen.getByRole('button', { name: 'Agregar proveedor' }));

    await waitFor(() => expect(capturedBody).toEqual({ vendedorId: 'vendedor-3' }));
    expect(capturedBody).not.toHaveProperty('userId');
    expect(capturedBody).not.toHaveProperty('actorUserId');
    expect(await screen.findByText('Proveedor agregado correctamente')).toBeInTheDocument();
  });

  it('shows a disabled provider action state when no eligible vendors exist', async () => {
    server.use(
      http.get('/api/v1/clientes/get-by-id/cliente-1', () => HttpResponse.json({
        id: 'cliente-1',
        nombre: 'Laura',
        apellido: 'Perez',
        email: 'laura@test.com',
        providers: [],
      })),
      http.get('/api/v1/vendedores/list', () => HttpResponse.json({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      }))
    );

    renderAdminClientRoute('/admin/clients/cliente-1');

    expect(await screen.findByText('No hay vendedores elegibles para asignar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reasignar cliente' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Agregar proveedor' })).toBeDisabled();
  });
});
