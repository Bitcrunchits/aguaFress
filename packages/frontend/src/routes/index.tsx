import { VendedorDashboard } from '../features/vendedor/VendedorDashboard';
import { Login } from '../features/auth/Login';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { UserRole } from '@agua/contracts'; // Enums compartidos[cite: 2]

// Componentes temporales (Mocks) para probar que el ruteo funcione
const LoginMock = () => <div><h2>Pantalla de Login</h2><p>Pública para todos.</p></div>;
const RegisterVendorMock = () => <div><h2>Registro de Vendedor</h2><p>Pública.</p></div>;
const SuperAdminDashboard = () => <div><h2>Panel de Super Admin</h2><p>Solo visible para el rol SUPER_ADMIN.</p></div>;
const VendedorDashboard = () => <div><h2>Panel de Vendedor</h2><p>Solo visible para el rol VENDEDOR.</p></div>;
const ConsumidorDashboard = () => <div><h2>Catálogo de Consumidor</h2><p>Solo visible para el rol CLIENTE.</p></div>;
const Unauthorized = () => <div><h2>403 - No Autorizado</h2><p>No tienes permisos para ver esta sección.</p></div>;

export const router = createBrowserRouter([
  // --- RUTAS PÚBLICAS ---
  // --- RUTAS PÚBLICAS ---
  {
    path: '/login',
    element: <Login />, // ¡Ya no es un mock![cite: 1]
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
    element: <ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN]} />, // Solo Super Admin
    children: [
      {
        path: '/admin/dashboard',
        element: <SuperAdminDashboard />,
      },
    ],
  },

  // --- RUTAS PROTEGIDAS PARA VENDEDORES ---
  {
    element: <ProtectedRoute allowedRoles={[UserRole.VENDEDOR]} />, // Solo Vendedores
    children: [
      {
        path: '/vendedor/dashboard',
        element: <VendedorDashboard />, // ¡Ya no es un mock!
      },
    ],
  },

  // --- RUTAS PROTEGIDAS PARA CLIENTES ---
  {
    element: <ProtectedRoute allowedRoles={[UserRole.CLIENTE]} />, // Solo Clientes Consumidores[cite: 1]
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