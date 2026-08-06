import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRole, type LoginRequest } from '@agua/contracts';
import { useAuth } from '../hooks/useAuth';
import LoginForm from '../components/LoginForm';
import AuthLayout from '../../../shared/Layout/AuthLayout';

const ROLE_REDIRECT: Record<UserRole, string> = {
  [UserRole.VENDEDOR]: '/dashboard',
  [UserRole.SUPER_ADMIN]: '/admin',
  [UserRole.CLIENTE]: '/catalogo',
};

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  const handleSubmit = async (data: LoginRequest) => {
    setServerError(null);
    try {
      const response = await login(data);
      const redirectPath = ROLE_REDIRECT[response.user.role] ?? '/login';
      navigate(redirectPath, { replace: true });
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? 'Error del servidor. Intentalo de nuevo.';
      setServerError(message);
    }
  };

  return (
    <AuthLayout title="AguaFress" subtitle="Iniciar sesión">
      <LoginForm onSubmit={handleSubmit} serverError={serverError} />
    </AuthLayout>
  );
}
