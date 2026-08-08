import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ReactNode } from 'react';
import {
  getOwnClientById,
  listVendedorClientPortfolio,
  registerClientByVendor,
  updateOwnClient,
} from '../services/clientes.service';
import {
  useRegisterClientByVendor,
  useVendedorClientDetail,
  useVendedorClientPortfolio,
} from '../hooks/useVendedorClients';

const server = setupServer();

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return function HookWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('vendedor client data layer', () => {
  it('requests the vendedor portfolio through the own cartera endpoint', async () => {
    let requestedUrl: URL | undefined;
    server.use(
      http.get('/api/v1/clientes/cartera', ({ request }) => {
        requestedUrl = new URL(request.url);
        return HttpResponse.json({
          data: [{ id: 'cliente-1', nombre: 'Laura', apellido: 'Diaz', telefono: '1111' }],
          pagination: { page: 2, limit: 5, total: 1, totalPages: 1 },
        });
      })
    );

    const response = await listVendedorClientPortfolio({ page: 2, limit: 5 });

    expect(requestedUrl?.pathname).toBe('/api/v1/clientes/cartera');
    expect(requestedUrl?.searchParams.get('page')).toBe('2');
    expect(requestedUrl?.searchParams.get('limit')).toBe('5');
    expect(response.data[0]?.id).toBe('cliente-1');
  });

  it('loads and updates own client detail through vendedor-owned endpoints', async () => {
    let updateBody: unknown;
    server.use(
      http.get('/api/v1/clientes/own/get-by-id/cliente-2', () => HttpResponse.json({
        id: 'cliente-2',
        nombre: 'Mario',
        apellido: 'Rios',
        telefono: '2222',
      })),
      http.patch('/api/v1/clientes/own/update/cliente-2', async ({ request }) => {
        updateBody = await request.json();
        return HttpResponse.json({ id: 'cliente-2', nombre: 'Mario', apellido: 'Rios', telefono: '3333' });
      })
    );

    const detail = await getOwnClientById('cliente-2');
    const updated = await updateOwnClient('cliente-2', { nombre: 'Mario', apellido: 'Rios', telefono: '3333' });

    expect(detail.id).toBe('cliente-2');
    expect(updateBody).toEqual({ nombre: 'Mario', apellido: 'Rios', telefono: '3333' });
    expect(JSON.stringify(updateBody)).not.toContain('userId');
    expect(JSON.stringify(updateBody)).not.toContain('actorUserId');
    expect(updated.telefono).toBe('3333');
  });

  it('registers a client by vendor without vendedorId or userId in the body', async () => {
    let registerBody: unknown;
    server.use(
      http.post('/api/v1/auth/register-client/by-vendor', async ({ request }) => {
        registerBody = await request.json();
        return HttpResponse.json({ token: 'client-token', refreshToken: 'refresh-token', clienteId: 'cliente-3' });
      })
    );

    const response = await registerClientByVendor({
      nombre: 'Ana',
      apellido: 'Lopez',
      email: 'ana@test.com',
      emailConfirmation: 'ana@test.com',
      password: 'S3cret123',
      telefono: '4444',
      dni: '12345678',
      direccionEntrega: { calle: 'San Martin', numero: '123' },
    });

    expect(registerBody).toEqual({
      nombre: 'Ana',
      apellido: 'Lopez',
      email: 'ana@test.com',
      emailConfirmation: 'ana@test.com',
      password: 'S3cret123',
      telefono: '4444',
      dni: '12345678',
      direccionEntrega: { calle: 'San Martin', numero: '123' },
    });
    expect(JSON.stringify(registerBody)).not.toContain('vendedorId');
    expect(JSON.stringify(registerBody)).not.toContain('userId');
    expect(response.clienteId).toBe('cliente-3');
  });

  it('exposes portfolio loading and success states from the hook', async () => {
    server.use(
      http.get('/api/v1/clientes/cartera', () => HttpResponse.json({
        data: [{ id: 'cliente-4', nombre: 'Sol', apellido: 'Norte' }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      }))
    );

    const { result } = renderHook(() => useVendedorClientPortfolio(), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.clients[0]?.nombre).toBe('Sol');
    expect(result.current.isError).toBe(false);
  });

  it('exposes own client detail update errors without replacing client state', async () => {
    server.use(
      http.get('/api/v1/clientes/own/get-by-id/cliente-5', () => HttpResponse.json({
        id: 'cliente-5',
        nombre: 'Eva',
        telefono: '5555',
      })),
      http.patch('/api/v1/clientes/own/update/cliente-5', () => (
        HttpResponse.json({ message: 'DNI inválido' }, { status: 400 })
      ))
    );

    const { result } = renderHook(() => useVendedorClientDetail('cliente-5'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.client?.id).toBe('cliente-5'));
    await expect(result.current.updateClient({ nombre: 'Eva', telefono: '5555', dni: 'x' })).rejects.toThrow();

    expect(result.current.client?.telefono).toBe('5555');
  });

  it('exposes direct registration success and backend errors from the hook', async () => {
    server.use(
      http.post('/api/v1/auth/register-client/by-vendor', () => (
        HttpResponse.json({ message: 'Email duplicado' }, { status: 409 })
      ))
    );

    const { result } = renderHook(() => useRegisterClientByVendor(), { wrapper: createWrapper() });

    await act(async () => {
      await expect(result.current.registerClient({
        nombre: 'Ana',
        email: 'ana@test.com',
        emailConfirmation: 'ana@test.com',
        password: 'S3cret123',
        telefono: '4444',
        dni: '12345678',
        direccionEntrega: { calle: 'San Martin', numero: '123' },
      })).rejects.toThrow();
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.errorMessage).toBe('Email duplicado');
  });
});
