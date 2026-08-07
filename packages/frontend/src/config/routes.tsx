import { lazy, type ReactNode } from 'react';
import { UserRole } from '@agua/contracts';
import ProtectedRoute from '../features/auth/components/ProtectedRoute';
import DashboardLayout from '../shared/Layout/DashboardLayout';

const LoginPage = lazy(() => import('../features/auth/pages/LoginPage'));
const ForgotPasswordPage = lazy(() => import('../features/auth/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('../features/auth/pages/ResetPasswordPage'));
const VendedorDashboardPage = lazy(() => import('../features/vendedor/pages/VendedorDashboardPage'));
const AdminDashboardPage = lazy(() => import('../features/admin/pages/AdminDashboardPage'));
const AdminVendorsPage = lazy(() => import('../features/admin/pages/AdminVendorsPage'));
const AdminPendingVendorsPage = lazy(() => import('../features/admin/pages/AdminPendingVendorsPage'));
const AdminVendorDetailPage = lazy(() => import('../features/admin/pages/AdminVendorDetailPage'));
const AdminVendorRegistrationPage = lazy(() => import('../features/admin/pages/AdminVendorRegistrationPage'));
const AdminClientsPage = lazy(() => import('../features/admin/pages/AdminClientsPage'));
const AdminClientDetailPage = lazy(() => import('../features/admin/pages/AdminClientDetailPage'));
const AdminAuditPage = lazy(() => import('../features/admin/pages/AdminAuditPage'));
const AdminAuditDetailPage = lazy(() => import('../features/admin/pages/AdminAuditDetailPage'));
const AdminQrLinksPage = lazy(() => import('../features/admin/pages/AdminQrLinksPage'));
const AdminProfilePage = lazy(() => import('../features/admin/pages/AdminProfilePage'));
const ClientesPage = lazy(() => import('../features/clientes/pages/ClientesPage'));
const CatalogoPage = lazy(() => import('../features/catalogo/pages/CatalogoPage'));
const CartPage = lazy(() => import('../features/cart/pages/CartPage'));
const ProductosPage = lazy(() => import('../features/productos/pages/ProductosPage'));
const OrdenesPage = lazy(() => import('../features/ordenes/pages/OrdenesPage'));
const QRPage = lazy(() => import('../features/qr/pages/QRPage'));
const DeliveriesPage = lazy(() => import('../features/deliveries/pages/DeliveriesPage'));
const PerfilPage = lazy(() => import('../features/perfil/pages/PerfilPage'));

export interface RouteConfig {
  path?: string;
  index?: boolean;
  element?: ReactNode;
  protected?: boolean;
  allowedRoles?: UserRole[];
  children?: RouteConfig[];
}

/**
 * Estructura espejando la mobile:
 * - VENDEDOR → /dashboard, /clientes, /productos, /ordenes, /qr
 * - SUPER_ADMIN → /admin
 * - CLIENTE → /catalogo (próximamente: /carrito, /perfil, /pedidos)
 *
 * ProtectedRoute con allowedRoles = guard por rol.
 * Sidebar (DashboardLayout) filtra por rol.
 */
const routes: RouteConfig[] = [
  // ─── Público ───
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />,
  },

  // ─── VENDEDOR ───
  {
    path: '/dashboard',
    protected: true,
    allowedRoles: [UserRole.VENDEDOR],
    element: <ProtectedRoute allowedRoles={[UserRole.VENDEDOR]} />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { index: true, element: <VendedorDashboardPage /> },
        ],
      },
    ],
  },

  // ─── SUPER_ADMIN ───
  {
    path: '/admin',
    protected: true,
    allowedRoles: [UserRole.SUPER_ADMIN],
    element: <ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN]} />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { index: true, element: <AdminDashboardPage /> },
          { path: 'vendors', element: <AdminVendorsPage /> },
          { path: 'vendors/pending', element: <AdminPendingVendorsPage /> },
          { path: 'vendors/new', element: <AdminVendorRegistrationPage /> },
          { path: 'vendors/:vendedorId', element: <AdminVendorDetailPage /> },
          { path: 'clients', element: <AdminClientsPage /> },
          { path: 'clients/:clienteId', element: <AdminClientDetailPage /> },
          { path: 'audit', element: <AdminAuditPage /> },
          { path: 'audit/:auditId', element: <AdminAuditDetailPage /> },
          { path: 'qr-codes', element: <AdminQrLinksPage kind="qr" /> },
          { path: 'invitation-links', element: <AdminQrLinksPage kind="links" /> },
          { path: 'profile', element: <AdminProfilePage /> },
        ],
      },
    ],
  },

  // ─── VENDEDOR ───
  {
    path: '/clientes',
    protected: true,
    allowedRoles: [UserRole.VENDEDOR],
    element: <ProtectedRoute allowedRoles={[UserRole.VENDEDOR]} />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { index: true, element: <ClientesPage /> },
        ],
      },
    ],
  },
  {
    path: '/productos',
    protected: true,
    allowedRoles: [UserRole.VENDEDOR],
    element: <ProtectedRoute allowedRoles={[UserRole.VENDEDOR]} />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { index: true, element: <ProductosPage /> },
        ],
      },
    ],
  },
  {
    path: '/ordenes',
    protected: true,
    allowedRoles: [UserRole.VENDEDOR],
    element: <ProtectedRoute allowedRoles={[UserRole.VENDEDOR]} />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { index: true, element: <OrdenesPage /> },
        ],
      },
    ],
  },
  {
    path: '/qr',
    protected: true,
    allowedRoles: [UserRole.VENDEDOR],
    element: <ProtectedRoute allowedRoles={[UserRole.VENDEDOR]} />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { index: true, element: <QRPage /> },
        ],
      },
    ],
  },
  {
    path: '/deliveries',
    protected: true,
    allowedRoles: [UserRole.VENDEDOR],
    element: <ProtectedRoute allowedRoles={[UserRole.VENDEDOR]} />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { index: true, element: <DeliveriesPage /> },
        ],
      },
    ],
  },

  // ─── CLIENTE ───
  {
    path: '/catalogo',
    protected: true,
    allowedRoles: [UserRole.CLIENTE],
    element: <ProtectedRoute allowedRoles={[UserRole.CLIENTE]} />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { index: true, element: <CatalogoPage /> },
        ],
      },
    ],
  },
  {
    path: '/carrito',
    protected: true,
    allowedRoles: [UserRole.CLIENTE],
    element: <ProtectedRoute allowedRoles={[UserRole.CLIENTE]} />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { index: true, element: <CartPage /> },
        ],
      },
    ],
  },
  {
    path: '/pedidos',
    protected: true,
    allowedRoles: [UserRole.CLIENTE],
    element: <ProtectedRoute allowedRoles={[UserRole.CLIENTE]} />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { index: true, element: <OrdenesPage /> },
        ],
      },
    ],
  },
  {
    path: '/perfil',
    protected: true,
    allowedRoles: [UserRole.CLIENTE],
    element: <ProtectedRoute allowedRoles={[UserRole.CLIENTE]} />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { index: true, element: <PerfilPage /> },
        ],
      },
    ],
  },

];

export default routes;
