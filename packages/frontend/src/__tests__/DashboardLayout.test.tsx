import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext, type AuthContextValue } from '../context/AuthContext';
import DashboardLayout from '../shared/Layout/DashboardLayout';

function createAuthValue(overrides: Partial<AuthContextValue>): AuthContextValue {
  return {
    user: null,
    token: null,
    isLoading: false,
    isAuthenticated: true,
    login: vi.fn().mockRejectedValue(new Error('not implemented')),
    logout: vi.fn(),
    ...overrides,
  };
}

function renderLayout(authValue: AuthContextValue) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <DashboardLayout />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe('DashboardLayout', () => {
  it('renders the app name in the sidebar', () => {
    renderLayout(createAuthValue({}));

    expect(screen.getByText('AguaFress')).toBeInTheDocument();
  });

  it('renders navigation links for VENDEDOR role', () => {
    renderLayout(
      createAuthValue({
        user: {
          id: 'user-1',
          email: 'vendedor@aguafress.com',
          role: 'vendedor' as const,
          nombre: 'Vendedor',
          apellido: 'Test',
          isActive: true,
        },
      })
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Clientes')).toBeInTheDocument();
    expect(screen.getByText('Productos')).toBeInTheDocument();
    expect(screen.getByText('Órdenes')).toBeInTheDocument();
    expect(screen.getByText('QR')).toBeInTheDocument();
  });

  it('renders navigation links for CLIENTE role', () => {
    renderLayout(
      createAuthValue({
        user: {
          id: 'cliente-1',
          email: 'cliente@aguafress.com',
          role: 'cliente' as const,
          nombre: 'Cliente',
          isActive: true,
        },
      })
    );

    expect(screen.getByText('Catálogo')).toBeInTheDocument();
    expect(screen.getByText('Carrito')).toBeInTheDocument();
    expect(screen.getByText('Pedidos')).toBeInTheDocument();
    expect(screen.getByText('Perfil')).toBeInTheDocument();
    expect(screen.queryByText('Productos')).not.toBeInTheDocument();
  });

  it('does not expose vendedor navigation links to SUPER_ADMIN', () => {
    renderLayout(
      createAuthValue({
        user: {
          id: 'admin-1',
          email: 'admin@aguafress.com',
          role: 'super_admin' as const,
          nombre: 'Admin',
          isActive: true,
        },
      })
    );

    expect(screen.getByRole('link', { name: /admin/i })).toBeInTheDocument();
    expect(screen.queryByText('Clientes')).not.toBeInTheDocument();
    expect(screen.queryByText('Productos')).not.toBeInTheDocument();
    expect(screen.queryByText('Órdenes')).not.toBeInTheDocument();
    expect(screen.queryByText('Entregas')).not.toBeInTheDocument();
    expect(screen.queryByText('QR')).not.toBeInTheDocument();
  });

  it('displays user name and email in sidebar', () => {
    renderLayout(
      createAuthValue({
        user: {
          id: 'user-1',
          email: 'carlos@aguafress.com',
          role: 'vendedor' as const,
          nombre: 'Carlos',
          apellido: 'López',
          isActive: true,
        },
      })
    );

    expect(screen.getByText('Carlos López')).toBeInTheDocument();
    expect(screen.getByText('carlos@aguafress.com')).toBeInTheDocument();
  });

  it('shows first letter of name as avatar', () => {
    renderLayout(
      createAuthValue({
        user: {
          id: 'user-1',
          email: 'ana@test.com',
          role: 'vendedor' as const,
          nombre: 'Ana',
          isActive: true,
        },
      })
    );

    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('shows "Usuario" when user has no name', () => {
    renderLayout(
      createAuthValue({
        user: {
          id: 'user-1',
          email: 'user@test.com',
          role: 'vendedor' as const,
          isActive: true,
        },
      })
    );

    expect(screen.getByText('Usuario')).toBeInTheDocument();
  });

  it('renders a logout button in the header', () => {
    renderLayout(createAuthValue({}));

    expect(
      screen.getByRole('button', { name: /cerrar sesión/i })
    ).toBeInTheDocument();
  });

  it('renders mobile hamburger button with aria-label', () => {
    renderLayout(createAuthValue({}));

    expect(
      screen.getByRole('button', { name: /abrir menú/i })
    ).toBeInTheDocument();
  });

  it('renders sidebar as an aside element with navigation', () => {
    const { container } = renderLayout(createAuthValue({}));

    const sidebar = container.querySelector('aside');
    expect(sidebar).toBeInTheDocument();
    // Nav links should be inside the sidebar
    expect(sidebar?.querySelector('nav')).toBeInTheDocument();
    expect(sidebar?.textContent).toContain('AguaFress');
  });
});
