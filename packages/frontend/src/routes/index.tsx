import { createBrowserRouter, Navigate } from 'react-router-dom';
import { UserRole } from '@agua/contracts';
import { ProtectedRoute } from './ProtectedRoute';
import { Login } from '../features/auth/Login';
import { VendedorDashboard } from '../features/vendedor/VendedorDashboard';

// Mocks temporales para roles sin interfaz aún desarrollada
const RegisterVendorMock = () => <div><h2>Registro de Vendedor</h2><p>Pública.</p></div>;
const SuperAdminDashboard = () => <div><h2>Panel de Super Admin</h2><p>Solo visible para el rol SUPER_ADMIN.</p></div>;
const ConsumidorDashboard = () => <div><h2>Catálogo de Consumidor</h2><p>Solo visible para el rol CLIENTE.</p></div>;
const Unauthorized = () => <div><h2>403 - No Autorizado</h2><p>No tienes permisos para ver esta sección.</p></div>;

export const router = createBrowserRouter([
  // --- RUTAS PÚBLICAS ---
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register-vendedor',
    element: <RegisterVendorMock />,
  },
  {
    path: '/unauthorized',
    element: <Unauthorized />,
  },

  // --- RUTAS PROTEGIDAS PARA SUPER ADMIN ---
  {
    element: <ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN]} />,
    children: [
      {
        path: '/admin/dashboard',
        element: <SuperAdminDashboard />,
      },
    ],
  },

  // --- RUTAS PROTEGIDAS PARA VENDEDORES ---
  {
    element: <ProtectedRoute allowedRoles={[UserRole.VENDEDOR]} />,
    children: [
      {
        path: '/vendedor/dashboard',
        element: <VendedorDashboard />, // Ahora sí renderiza el dashboard real importado
      },
    ],
  },

  // --- RUTAS PROTEGIDAS PARA CLIENTES ---
  {
    element: <ProtectedRoute allowedRoles={[UserRole.CLIENTE]} />,
    children: [
      {
        path: '/consumidor/dashboard',
        element: <ConsumidorDashboard />,
      },
    ],
  },

  // Redirección por defecto si la ruta no existe
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
]);