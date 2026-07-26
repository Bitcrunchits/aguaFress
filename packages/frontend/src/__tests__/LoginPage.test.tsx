import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../context/AuthContext';
import { clearSession } from '../services/session';
import LoginPage from '../features/auth/pages/LoginPage';

const navigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

const server = setupServer(
  http.post('/api/v1/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    if (
      body.email === 'vendedor@test.com' &&
      body.password === 'password123'
    ) {
      return HttpResponse.json({
        token: 'jwt-vendedor',
        refreshToken: 'refresh-vendedor',
        user: {
          id: 'user-1',
          email: 'vendedor@test.com',
          role: 'vendedor',
          nombre: 'Carlos',
          apellido: 'López',
        },
      });
    }
    if (
      body.email === 'admin@test.com' &&
      body.password === 'password123'
    ) {
      return HttpResponse.json({
        token: 'jwt-admin',
        refreshToken: 'refresh-admin',
        user: {
          id: 'user-2',
          email: 'admin@test.com',
          role: 'super_admin',
          nombre: 'Admin',
        },
      });
    }
    return HttpResponse.json(
      { statusCode: 401, message: 'Credenciales inválidas' },
      { status: 401 }
    );
  }),

  http.post('/api/v1/auth/logout', () => {
    return HttpResponse.json({ message: 'Sesión cerrada' });
  })
);

let queryClient: QueryClient;

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
  server.resetHandlers();
  clearSession();
  queryClient.clear();
  navigate.mockClear();
});
afterAll(() => server.close());

function renderLoginPage() {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('LoginPage', () => {
  it('renders the login form with email and password fields', () => {
    renderLoginPage();

    expect(screen.getByRole('heading', { name: /aguaFress/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /iniciar sesión/i })
    ).toBeInTheDocument();
  });

  it('shows validation errors when submitting empty form', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect(screen.getByText('El email es requerido')).toBeInTheDocument();
      expect(
        screen.getByText('La contraseña debe tener al menos 8 caracteres')
      ).toBeInTheDocument();
    });
  });

  it('shows loading text on button while submitting', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText(/email/i), 'vendedor@test.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'password123');

    user.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /ingresando/i })
      ).toBeDisabled();
    });
  });

  it('redirects vendedor to /dashboard on successful login', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText(/email/i), 'vendedor@test.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'password123');
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  it('redirects super_admin to /admin on successful login', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText(/email/i), 'admin@test.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'password123');
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/admin', { replace: true });
    });
  });

  it('shows error message on invalid credentials', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText(/email/i), 'wrong@test.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/credenciales inválidas/i)
      ).toBeInTheDocument();
    });
  });

  it('shows error message when server is unavailable', async () => {
    server.use(
      http.post('/api/v1/auth/login', () => {
        return HttpResponse.json(
          { statusCode: 500, message: 'Error del servidor' },
          { status: 500 }
        );
      })
    );

    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText(/email/i), 'vendedor@test.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'password123');
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect(screen.getByText(/error del servidor/i)).toBeInTheDocument();
    });
  });
});
