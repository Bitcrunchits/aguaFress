import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { UserRole } from '@agua/contracts';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { Button } from '../components/Button';

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const NAV_ITEMS_BY_ROLE: Record<string, NavItem[]> = {
  [UserRole.VENDEDOR]: [
    { to: '/dashboard', label: 'Dashboard', icon: '📊' },
    { to: '/clientes', label: 'Clientes', icon: '👥' },
    { to: '/productos', label: 'Productos', icon: '📦' },
    { to: '/ordenes', label: 'Órdenes', icon: '📋' },
    { to: '/deliveries', label: 'Entregas', icon: '🚚' },
    { to: '/qr', label: 'QR', icon: '🔗' },
  ],
  [UserRole.SUPER_ADMIN]: [
    { to: '/admin', label: 'Admin', icon: '⚙️' },
  ],
  [UserRole.CLIENTE]: [
    { to: '/catalogo', label: 'Catálogo', icon: '🏠' },
    { to: '/carrito', label: 'Carrito', icon: '🛒' },
    { to: '/pedidos', label: 'Pedidos', icon: '📋' },
    { to: '/perfil', label: 'Perfil', icon: '👤' },
  ],
};

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = user?.role ? NAV_ITEMS_BY_ROLE[user.role] ?? [] : [];

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const fullName = [user?.nombre, user?.apellido].filter(Boolean).join(' ') || 'Usuario';

  return (
    <div className="flex min-h-screen bg-surface-muted">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-brand-teal text-white transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 px-6">
          <span className="text-2xl font-bold">AguaFress</span>
        </div>

        {/* Navigation — filtrado por rol como los tabs de la mobile */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User info at bottom */}
        <div className="border-t border-white/20 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm font-semibold">
              {fullName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{fullName}</p>
              <p className="truncate text-xs text-white/60">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="flex h-16 items-center gap-4 border-b border-gray-200 bg-surface px-4 lg:px-6">
          {/* Hamburger */}
          <button
            className="rounded-md p-2 text-text-secondary hover:bg-surface-hover lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          {/* Breadcrumb placeholder */}
          <div className="flex-1" />

          {/* Logout */}
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Cerrar sesión
          </Button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
