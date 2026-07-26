import { Navigate, useLocation } from 'react-router-dom';
import { UserRole } from '@agua/contracts';
import { useAuth } from '../hooks/useAuth';
import PageSkeleton from '../../../shared/components/PageSkeleton';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

const ROLE_REDIRECT: Record<string, string> = {
  [UserRole.VENDEDOR]: '/dashboard',
  [UserRole.SUPER_ADMIN]: '/admin',
  [UserRole.CLIENTE]: '/orders',
};

export default function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    const redirectPath = ROLE_REDIRECT[user.role] ?? '/login';
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
}
