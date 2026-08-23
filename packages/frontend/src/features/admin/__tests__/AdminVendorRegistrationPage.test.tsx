import { beforeAll, afterAll, afterEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { UserRole } from '@agua/contracts';
import AdminVendorRegistrationPage from '../pages/AdminVendorRegistrationPage';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderRegistrationPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/vendors/new']}>
        <Routes>
          <Route path="/admin/vendors/new" element={<AdminVendorRegistrationPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

async function fillValidForm() {
  await userEvent.type(screen.getByLabelText('Nombre completo'), 'Nueva Vendedora');
  await userEvent.type(screen.getByLabelText('Email'), 'nueva@test.com');
  await userEvent.type(screen.getByLabelText('Contraseña provisoria'), 'Seguro123!');
}

describe('admin vendor registration page', () => {
  it('registers a vendor with forced VENDEDOR role and shows pending-approval copy', async () => {
    let capturedBody: unknown;
    server.use(
      http.post('/api/v1/auth/register', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({
          user: { id: 'auth-user-1', email: 'nueva@test.com', role: UserRole.VENDEDOR },
        });
      })
    );

    renderRegistrationPage();
    await fillValidForm();
    await userEvent.click(screen.getByRole('button', { name: 'Registrar vendedor' }));

    expect(await screen.findByText(/Queda en estado/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver pendientes' })).toHaveAttribute('href', '/admin/vendors/pending');
    expect(capturedBody).toEqual({
      nombre: 'Nueva Vendedora',
      email: 'nueva@test.com',
      password: 'Seguro123!',
      role: UserRole.VENDEDOR,
    });
    expect(JSON.stringify(capturedBody)).not.toContain('userId');
    expect(JSON.stringify(capturedBody)).not.toContain('actorUserId');
  });

  it('blocks submit with frontend validation and never calls the API', async () => {
    let requestCount = 0;
    server.use(
      http.post('/api/v1/auth/register', () => {
        requestCount += 1;
        return HttpResponse.json({});
      })
    );

    renderRegistrationPage();
    await userEvent.click(screen.getByRole('button', { name: 'Registrar vendedor' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Completá nombre, email y contraseña.');
    expect(requestCount).toBe(0);
  });

  it('shows backend duplicate errors and preserves non-sensitive values', async () => {
    server.use(
      http.post('/api/v1/auth/register', () =>
        HttpResponse.json({ message: 'El email ya está registrado' }, { status: 409 })
      )
    );

    renderRegistrationPage();
    await fillValidForm();
    await userEvent.click(screen.getByRole('button', { name: 'Registrar vendedor' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('El email ya está registrado');

    await waitFor(() => {
      expect(screen.getByLabelText('Nombre completo')).toHaveValue('Nueva Vendedora');
      expect(screen.getByLabelText('Email')).toHaveValue('nueva@test.com');
      expect(screen.getByLabelText('Contraseña provisoria')).toHaveValue('');
    });
  });
});
