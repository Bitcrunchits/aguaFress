import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, AuthContext } from '../context/AuthContext';
import { useContext } from 'react';
import {
  setToken,
  setRefreshToken,
  clearSession,
} from '../services/session';

// ─── MSW Server ────────────────────────────────────────────────────

const server = setupServer(
  http.post('/api/v1/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    if (body.email === 'test@aguafress.com' && body.password === 'password123') {
      return HttpResponse.json({
        token: 'jwt-token-123',
        refreshToken: 'refresh-token-456',
        user: {
          id: 'user-1',
          email: 'test@aguafress.com',
          role: 'vendedor',
          nombre: 'Test',
          apellido: 'User',
        },
      });
    }
    return HttpResponse.json(
      { statusCode: 401, message: 'Credenciales inválidas' },
      { status: 401 }
    );
  }),

  http.post('/api/v1/auth/refresh', async ({ request }) => {
    const body = (await request.json()) as { refreshToken: string };
    if (body.refreshToken === 'refresh-token-456') {
      return HttpResponse.json({ token: 'new-jwt-token-789' });
    }
    return HttpResponse.json(
      { statusCode: 401, message: 'Refresh token inválido' },
      { status: 401 }
    );
  }),

  http.post('/api/v1/auth/logout', () => {
    return HttpResponse.json({ message: 'Sesión cerrada' });
  }),

  http.get('/api/v1/users/profile', ({ request }) => {
    const auth = request.headers.get('Authorization');
    if (auth === 'Bearer jwt-token-123') {
      return HttpResponse.json({
        id: 'user-1',
        email: 'test@aguafress.com',
        role: 'vendedor',
        nombre: 'Test',
        apellido: 'User',
        isActive: true,
      });
    }
    return HttpResponse.json(
      { statusCode: 401, message: 'No autorizado' },
      { status: 401 }
    );
  })
);

let queryClient: QueryClient;

function renderWithAuth() {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  function AuthConsumer() {
    const context = useContext(AuthContext);
    if (!context) return null;
    return (
      <div>
        <div data-testid="isLoading">{String(context.isLoading)}</div>
        <div data-testid="isAuthenticated">{String(context.isAuthenticated)}</div>
        <div data-testid="user">
          {context.user ? JSON.stringify(context.user) : 'null'}
        </div>
        <div data-testid="token">{context.token ?? 'null'}</div>
        <button
          data-testid="btn-login"
          onClick={() =>
            context
              .login({ email: 'test@aguafress.com', password: 'password123' })
              .catch(() => {})
          }
        >
          Login Success
        </button>
        <button
          data-testid="btn-login-fail"
          onClick={() =>
            context
              .login({ email: 'wrong@test.com', password: 'wrongpass' })
              .catch(() => {})
          }
        >
          Login Fail
        </button>
        <button data-testid="btn-logout" onClick={() => context.logout()}>
          Logout
        </button>
      </div>
    );
  }

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
  server.resetHandlers();
  clearSession();
  queryClient?.clear();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

describe('AuthContext', () => {
  describe('login', () => {
    it('updates context correctly on successful login', async () => {
      renderWithAuth();

      // Initially loading (restoreSession runs) then not authenticated
      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');

      // Click login
      screen.getByTestId('btn-login').click();

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
      });
      expect(screen.getByTestId('token')).not.toHaveTextContent('null');
    });

    it('does not update context and throws on failed login', async () => {
      renderWithAuth();

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');

      // Try to login with wrong credentials
      const loginPromise = () =>
        screen.getByTestId('btn-login-fail').click();
      loginPromise();

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
      });
    });
  });

  describe('restoreSession', () => {
    it('restores session from existing token successfully', async () => {
      setToken('jwt-token-123');

      renderWithAuth();

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });

      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
      const userText = screen.getByTestId('user').textContent;
      expect(userText).toContain('test@aguafress.com');
      expect(userText).toContain('vendedor');
    });

    it('does not block when no token exists', async () => {
      renderWithAuth();

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });

      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('token')).toHaveTextContent('null');
    });

    it('clears session when token is invalid', async () => {
      setToken('expired-invalid-token');

      renderWithAuth();

      await waitFor(() => {
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
      });

      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('token')).toHaveTextContent('null');
    });
  });

  describe('logout', () => {
    it('clears context and token on logout', async () => {
      // First login
      setToken('jwt-token-123');
      setRefreshToken('refresh-token-456');

      renderWithAuth();

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
      });

      // Now logout
      screen.getByTestId('btn-logout').click();

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
      });
      expect(screen.getByTestId('token')).toHaveTextContent('null');
      expect(screen.getByTestId('user')).toHaveTextContent('null');
    });
  });
});
