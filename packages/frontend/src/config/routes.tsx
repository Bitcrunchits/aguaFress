import { lazy } from 'react';
import { UserRole } from '@agua/contracts';
import ProtectedRoute from '../features/auth/components/ProtectedRoute';

const LoginPage = lazy(() => import('../features/auth/pages/LoginPage'));

const DashboardPlaceholder = lazy(() => import('../shared/components/EmptyState'));

export interface RouteConfig {
  path: string;
  element: React.ReactNode;
  protected?: boolean;
  allowedRoles?: UserRole[];
}

const routes: RouteConfig[] = [
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/dashboard',
    protected: true,
    allowedRoles: [UserRole.VENDEDOR],
    element: (
      <ProtectedRoute allowedRoles={[UserRole.VENDEDOR]}>
        <DashboardPlaceholder message="Dashboard de Vendedor" description="Bienvenido a tu panel de ventas" />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin',
    protected: true,
    allowedRoles: [UserRole.SUPER_ADMIN],
    element: (
      <ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN]}>
        <DashboardPlaceholder message="Panel de Administración" description="Gestión general del sistema" />
      </ProtectedRoute>
    ),
  },
  {
    path: '/orders',
    protected: true,
    allowedRoles: [UserRole.CLIENTE, UserRole.VENDEDOR, UserRole.SUPER_ADMIN],
    element: (
      <ProtectedRoute allowedRoles={[UserRole.CLIENTE, UserRole.VENDEDOR, UserRole.SUPER_ADMIN]}>
        <DashboardPlaceholder message="Mis Pedidos" description="Consultá tus pedidos activos" />
      </ProtectedRoute>
    ),
  },
];

export default routes;
