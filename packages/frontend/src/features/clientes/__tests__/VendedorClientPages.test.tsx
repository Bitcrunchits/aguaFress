import { beforeAll, afterAll, afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ClientesPage from '../pages/ClientesPage';
import VendedorClientDetailPage from '../pages/VendedorClientDetailPage';
import VendedorClientRegistrationPage from '../pages/VendedorClientRegistrationPage';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderClientRoute(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/clientes" element={<ClientesPage />} />
          <Route path="/clientes/nuevo" element={<VendedorClientRegistrationPage />} />
          <Route path="/clientes/:clienteId" element={<VendedorClientDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

async function fillRegistrationForm() {
  await userEvent.type(screen.getByLabelText('Nombre'), 'Ana');
  await userEvent.type(screen.getByLabelText('Apellido'), 'Lopez');
  await userEvent.type(screen.getByLabelText('Email'), 'ana@test.com');
  await userEvent.type(screen.getByLabelText('Confirmar email'), 'ana@test.com');
  await userEvent.type(screen.getByLabelText('Contraseña'), 'S3cret123');
  await userEvent.type(screen.getByLabelText('Teléfono'), '4444');
  await userEvent.type(screen.getByLabelText('DNI'), '12345678');
  await userEvent.type(screen.getByLabelText('Calle de entrega'), 'San Martin');
  await userEvent.type(screen.getByLabelText('Número de entrega'), '123');
}

describe('vendedor client pages', () => {
  it('renders portfolio loading, empty, error and success states from /clientes/cartera', async () => {
    server.use(
      http.get('/api/v1/clientes/cartera', () => HttpResponse.json({
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      }))
    );

    renderClientRoute('/clientes');

    expect(await screen.findByText('No hay clientes para mostrar')).toBeInTheDocument();
    cleanup();

    server.use(
      http.get('/api/v1/clientes/cartera', () => HttpResponse.json({ message: 'Cartera no disponible' }, { status: 500 }))
    );

    renderClientRoute('/clientes');

    expect(await screen.findByText('Cartera no disponible')).toBeInTheDocument();
    cleanup();

    server.use(
      http.get('/api/v1/clientes/cartera', () => HttpResponse.json({
        data: [{ id: 'cliente-1', nombre: 'Laura', apellido: 'Diaz', email: 'laura@test.com', telefono: '1111' }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      }))
    );

    renderClientRoute('/clientes');

    expect(await screen.findByText('Laura Diaz')).toBeInTheDocument();
    expect(screen.getByText('1 clientes · página 1 de 1')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Nuevo cliente' })).toHaveAttribute('href', '/clientes/nuevo');
    expect(screen.getByRole('link', { name: 'Ver Laura Diaz' })).toHaveAttribute('href', '/clientes/cliente-1');
  });

  it('loads and updates own client detail without losing loaded data on update errors', async () => {
    let capturedBody: unknown;
    server.use(
      http.get('/api/v1/clientes/own/get-by-id/cliente-1', () => HttpResponse.json({
        id: 'cliente-1',
        nombre: 'Laura',
        apellido: 'Diaz',
        email: 'laura@test.com',
        telefono: '1111',
        dni: '30111222',
        direccionFacturacion: 'Ruta 1',
      })),
      http.patch('/api/v1/clientes/own/update/cliente-1', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ message: 'DNI inválido' }, { status: 400 });
      })
    );

    renderClientRoute('/clientes/cliente-1');

    expect(await screen.findByRole('heading', { name: 'Laura Diaz' })).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('Teléfono'));
    await userEvent.type(screen.getByLabelText('Teléfono'), '2222');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cliente' }));

    await waitFor(() => expect(capturedBody).toEqual({
      nombre: 'Laura',
      apellido: 'Diaz',
      telefono: '2222',
      dni: '30111222',
      direccionFacturacion: 'Ruta 1',
    }));
    expect(JSON.stringify(capturedBody)).not.toContain('userId');
    expect(JSON.stringify(capturedBody)).not.toContain('actorUserId');
    expect(JSON.stringify(capturedBody)).not.toContain('vendedorId');
    expect(await screen.findByText('DNI inválido')).toBeInTheDocument();
    expect(screen.getByText('laura@test.com')).toBeInTheDocument();
  });

  it('registers a client directly, validates email confirmation and clears password on backend errors', async () => {
    let capturedBody: unknown;
    server.use(
      http.post('/api/v1/auth/register-client/by-vendor', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ message: 'Email duplicado' }, { status: 409 });
      })
    );

    renderClientRoute('/clientes/nuevo');
    await userEvent.type(screen.getByLabelText('Email'), 'ana@test.com');
    await userEvent.type(screen.getByLabelText('Confirmar email'), 'otra@test.com');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar cliente' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Los emails no coinciden.');
    expect(capturedBody).toBeUndefined();

    await userEvent.clear(screen.getByLabelText('Email'));
    await userEvent.clear(screen.getByLabelText('Confirmar email'));
    await fillRegistrationForm();
    await userEvent.click(screen.getByRole('button', { name: 'Registrar cliente' }));

    await waitFor(() => expect(capturedBody).toEqual({
      nombre: 'Ana',
      apellido: 'Lopez',
      email: 'ana@test.com',
      emailConfirmation: 'ana@test.com',
      password: 'S3cret123',
      telefono: '4444',
      dni: '12345678',
      direccionEntrega: { calle: 'San Martin', numero: '123' },
    }));
    expect(JSON.stringify(capturedBody)).not.toContain('vendedorId');
    expect(JSON.stringify(capturedBody)).not.toContain('userId');
    expect(await screen.findByRole('alert')).toHaveTextContent('Email duplicado');
    expect(screen.getByLabelText('Contraseña')).toHaveValue('');
  });

  it('shows success feedback after direct client registration', async () => {
    server.use(
      http.post('/api/v1/auth/register-client/by-vendor', () => HttpResponse.json({ clienteId: 'cliente-2' }))
    );

    renderClientRoute('/clientes/nuevo');
    await fillRegistrationForm();
    await userEvent.click(screen.getByRole('button', { name: 'Registrar cliente' }));

    expect(await screen.findByText('Cliente registrado correctamente.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver a clientes' })).toHaveAttribute('href', '/clientes');
  });
});
