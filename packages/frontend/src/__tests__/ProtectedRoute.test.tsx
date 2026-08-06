import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserRole } from '@agua/contracts';
import { AuthContext, type AuthContextValue } from '../context/AuthContext';
import ProtectedRoute from '../features/auth/components/ProtectedRoute';

function createAuthValue(overrides: Partial<AuthContextValue>): AuthContextValue {
  return {
    user: null,
    token: null,
    isLoading: false,
    isAuthenticated: false,
    login: vi.fn().mockRejectedValue(new Error('not implemented')),
    logout: vi.fn(),
    ...overrides,
  };
}

interface RenderOptions {
  authValue: AuthContextValue;
  allowedRoles?: UserRole[];
  initialEntries?: string[];
}

function renderProtectedRoute({
  authValue,
  allowedRoles,
  initialEntries = ['/app'],
}: RenderOptions) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path="/login" element={<div data-testid="page-login">Login</div>} />
            <Route path="/dashboard" element={<div data-testid="page-dashboard">Dashboard</div>} />
            <Route path="/admin" element={<div data-testid="page-admin">Admin</div>} />
            <Route path="/catalogo" element={<div data-testid="page-catalogo">Catalogo</div>} />
            <Route
              path="/app"
              element={
                <ProtectedRoute allowedRoles={allowedRoles}>
                  <div data-testid="protected-content">App Content</div>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<div data-testid="page-catchall" />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe('ProtectedRoute', () => {
  it('redirects to /login when user is not authenticated', () => {
    renderProtectedRoute({
      authValue: createAuthValue({ isLoading: false, isAuthenticated: false }),
      allowedRoles: [UserRole.VENDEDOR],
    });

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('page-login')).toBeInTheDocument();
  });

  it('shows loading state without redirect while session restores', () => {
    renderProtectedRoute({
      authValue: createAuthValue({ isLoading: true, isAuthenticated: false }),
      allowedRoles: [UserRole.VENDEDOR],
    });

    // Should NOT redirect to login
    expect(screen.queryByTestId('page-login')).not.toBeInTheDocument();
    // Should NOT render children
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('redirects super_admin to /admin when only VENDEDOR is allowed', () => {
    renderProtectedRoute({
      authValue: createAuthValue({
        isLoading: false,
        isAuthenticated: true,
        user: {
          id: 'user-2',
          email: 'admin@test.com',
          role: UserRole.SUPER_ADMIN,
          nombre: 'Admin',
          isActive: true,
        },
      }),
      allowedRoles: [UserRole.VENDEDOR],
    });

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('page-admin')).toBeInTheDocument();
  });

  it('redirects cliente to /catalogo when only VENDEDOR allowed', () => {
    renderProtectedRoute({
      authValue: createAuthValue({
        isLoading: false,
        isAuthenticated: true,
        user: {
          id: 'user-3',
          email: 'cliente@test.com',
          role: UserRole.CLIENTE,
          nombre: 'Cliente',
          isActive: true,
        },
      }),
      allowedRoles: [UserRole.VENDEDOR],
    });

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('page-catalogo')).toBeInTheDocument();
  });

  it('renders children when user has the correct role', () => {
    renderProtectedRoute({
      authValue: createAuthValue({
        isLoading: false,
        isAuthenticated: true,
        user: {
          id: 'user-1',
          email: 'vendedor@test.com',
          role: UserRole.VENDEDOR,
          nombre: 'Vendedor',
          isActive: true,
        },
      }),
      allowedRoles: [UserRole.VENDEDOR],
    });

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.getByText('App Content')).toBeInTheDocument();
  });
});
