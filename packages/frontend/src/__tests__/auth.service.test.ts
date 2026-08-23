import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { login, refresh, logout, getProfile } from '../services/auth.service';
import type { LoginRequest } from '@agua/contracts';
import { setToken, clearSession } from '../services/session';

const API_BASE = '/api/v1';

const handlers = [
  http.post(`${API_BASE}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as LoginRequest;
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

  http.post(`${API_BASE}/auth/refresh`, async ({ request }) => {
    const body = (await request.json()) as { refreshToken: string };
    if (body.refreshToken === 'refresh-token-456') {
      return HttpResponse.json({ token: 'new-jwt-token-789' });
    }
    return HttpResponse.json(
      { statusCode: 401, message: 'Refresh token inválido' },
      { status: 401 }
    );
  }),

  http.post(`${API_BASE}/auth/logout`, () => {
    return HttpResponse.json({ message: 'Sesión cerrada' });
  }),

  http.get(`${API_BASE}/users/profile`, ({ request }) => {
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
  }),
];

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
  server.resetHandlers();
  clearSession();
});
afterAll(() => server.close());

describe('auth.service', () => {
  describe('login', () => {
    it('returns LoginResponse with token and user on valid credentials', async () => {
      const result = await login({
        email: 'test@aguafress.com',
        password: 'password123',
      });

      expect(result.token).toBe('jwt-token-123');
      expect(result.refreshToken).toBe('refresh-token-456');
      expect(result.user.email).toBe('test@aguafress.com');
      expect(result.user.role).toBe('vendedor');
    });

    it('throws an error on invalid credentials', async () => {
      await expect(
        login({ email: 'wrong@email.com', password: 'wrongpass' })
      ).rejects.toThrow();
    });
  });

  describe('refresh', () => {
    it('returns a new token when refresh token is valid', async () => {
      const result = await refresh('refresh-token-456');
      expect(result.token).toBe('new-jwt-token-789');
    });

    it('throws when refresh token is invalid', async () => {
      await expect(refresh('invalid-refresh')).rejects.toThrow();
    });
  });

  describe('logout', () => {
    it('completes successfully without throwing', async () => {
      await expect(logout()).resolves.toBeUndefined();
    });
  });

  describe('getProfile', () => {
    it('returns the user profile when authenticated', async () => {
      setToken('jwt-token-123');
      const profile = await getProfile();

      expect(profile.email).toBe('test@aguafress.com');
      expect(profile.role).toBe('vendedor');
      expect(profile.isActive).toBe(true);
    });

    it('throws when not authenticated', async () => {
      await expect(getProfile()).rejects.toThrow();
    });
  });
});
