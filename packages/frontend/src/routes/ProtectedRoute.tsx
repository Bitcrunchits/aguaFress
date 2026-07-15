import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '@agua/contracts'; // Importado desde los contratos compilados[cite: 2]

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, token, loading } = useAuth();

  // Esperar a que el contexto verifique si hay un token en el localStorage
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <h3>Cargando sesión...</h3>
      </div>
    );
  }

  // Si no hay token ni usuario, mandar al login
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // Si se especificaron roles permitidos y el rol del usuario no está en la lista
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirigir según el rol real que tenga para que no quede atrapado
    if (user.role === UserRole.VENDEDOR) {
      return <Navigate to="/vendedor/dashboard" replace />;
    }
    if (user.role === UserRole.CLIENTE) {
      return <Navigate to="/consumidor/dashboard" replace />;
    }
    return <Navigate to="/unauthorized" replace />;
  }

  // Si pasa todas las validaciones, renderiza la ruta hija
  return <Outlet />;
};