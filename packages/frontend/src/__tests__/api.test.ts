import { describe, it, expect, vi, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import api, { __resetApiState } from '../services/api';
import * as session from '../services/session';

// ─── Mock session module ───────────────────────────────────────────

vi.mock('../services/session', () => ({
  getToken: vi.fn(),
  setToken: vi.fn(),
  getRefreshToken: vi.fn(),
  clearSession: vi.fn(),
  setRefreshToken: vi.fn(),
}));

// ─── MSW Server ────────────────────────────────────────────────────

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});
afterAll(() => server.close());

describe('api interceptors', () => {
  describe('request interceptor', () => {
    it('adds Authorization header when token exists', async () => {
      vi.mocked(session.getToken).mockReturnValue('test-jwt-token');

      let capturedAuth: string | null = null;
      server.use(
        http.get('/api/v1/test', ({ request }) => {
          capturedAuth = request.headers.get('Authorization');
          return HttpResponse.json({ ok: true });
        })
      );

      await api.get('/test');

      expect(capturedAuth).toBe('Bearer test-jwt-token');
    });

    it('does not add Authorization header when token is null', async () => {
      vi.mocked(session.getToken).mockReturnValue(null);

      let capturedAuth: string | null = 'not-set';
      server.use(
        http.get('/api/v1/test', ({ request }) => {
          capturedAuth = request.headers.get('Authorization');
          return HttpResponse.json({ ok: true });
        })
      );

      await api.get('/test');

      expect(capturedAuth).toBeNull();
    });

    it('does not add Authorization header when token is empty string', async () => {
      vi.mocked(session.getToken).mockReturnValue('');

      let capturedAuth: string | null = null;
      server.use(
        http.get('/api/v1/test', ({ request }) => {
          capturedAuth = request.headers.get('Authorization');
          return HttpResponse.json({ ok: true });
        })
      );

      await api.get('/test');

      expect(capturedAuth).toBeNull();
    });
  });

  describe('response interceptor — 401 handling', () => {
    beforeEach(() => __resetApiState());

    it('attempts token refresh on 401 and retries the request', async () => {
      vi.mocked(session.getToken).mockReturnValue('expired-token');
      vi.mocked(session.getRefreshToken).mockReturnValue('valid-refresh-token');

      let callCount = 0;
      server.use(
        http.get('/api/v1/test', () => {
          callCount++;
          if (callCount === 1) {
            return HttpResponse.json(
              { statusCode: 401, message: 'Token expirado' },
              { status: 401 }
            );
          }
          return HttpResponse.json({ ok: true });
        }),
        http.post('/api/v1/auth/refresh', () => {
          return HttpResponse.json({ token: 'new-jwt-token' });
        })
      );

      const response = await api.get('/test');

      expect(callCount).toBe(2);
      expect(response.data).toEqual({ ok: true });
      expect(session.setToken).toHaveBeenCalledWith('new-jwt-token');
    });

    it('does NOT attempt refresh on /auth/login 401', async () => {
      vi.mocked(session.getRefreshToken).mockReturnValue('valid-refresh');

      let refreshCalled = false;
      server.use(
        http.post('/api/v1/auth/login', () => {
          return HttpResponse.json(
            { statusCode: 401, message: 'Credenciales inválidas' },
            { status: 401 }
          );
        }),
        http.post('/api/v1/auth/refresh', () => {
          refreshCalled = true;
          return HttpResponse.json({ token: 'new' });
        })
      );

      await expect(api.post('/auth/login', { email: 'a', password: 'b' })).rejects.toThrow();
      expect(refreshCalled).toBe(false);
    });

    it('does NOT attempt refresh on /auth/refresh 401', async () => {
      vi.mocked(session.getRefreshToken).mockReturnValue('valid-refresh');

      let refreshCallCount = 0;
      server.use(
        http.post('/api/v1/auth/refresh', () => {
          refreshCallCount++;
          return HttpResponse.json(
            { statusCode: 401, message: 'Refresh inválido' },
            { status: 401 }
          );
        })
      );

      await expect(
        api.post('/auth/refresh', { refreshToken: 'bad' })
      ).rejects.toThrow();
      expect(refreshCallCount).toBe(1);
    });

    it('calls clearSession and redirects when no refresh token available', async () => {
      vi.mocked(session.getToken).mockReturnValue('expired-token');
      vi.mocked(session.getRefreshToken).mockReturnValue(null);

      server.use(
        http.get('/api/v1/test', () => {
          return HttpResponse.json(
            { statusCode: 401, message: 'Token expirado' },
            { status: 401 }
          );
        })
      );

      await expect(api.get('/test')).rejects.toThrow();
      expect(session.clearSession).toHaveBeenCalled();
    });

    it('calls clearSession when refresh fails', async () => {
      vi.mocked(session.getToken).mockReturnValue('expired-token');
      vi.mocked(session.getRefreshToken).mockReturnValue('invalid-refresh');

      server.use(
        http.get('/api/v1/test', () => {
          return HttpResponse.json(
            { statusCode: 401, message: 'Token expirado' },
            { status: 401 }
          );
        }),
        http.post('/api/v1/auth/refresh', () => {
          return HttpResponse.json(
            { statusCode: 401, message: 'Refresh inválido' },
            { status: 401 }
          );
        })
      );

      await expect(api.get('/test')).rejects.toThrow();
      expect(session.clearSession).toHaveBeenCalled();
    });
  });
});
