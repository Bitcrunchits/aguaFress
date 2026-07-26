import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRole, type LoginRequest } from '@agua/contracts';
import { useAuth } from '../hooks/useAuth';
import LoginForm from '../components/LoginForm';

const ROLE_REDIRECT: Record<string, string> = {
  [UserRole.VENDEDOR]: '/dashboard',
  [UserRole.SUPER_ADMIN]: '/admin',
  [UserRole.CLIENTE]: '/orders',
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
    <div className="flex min-h-screen items-center justify-center bg-surface-muted px-4">
      <div className="w-full max-w-md rounded-lg bg-surface p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-text-primary">AguaFress</h1>
          <p className="mt-1 text-sm text-text-secondary">Iniciar sesión</p>
        </div>
        <LoginForm onSubmit={handleSubmit} serverError={serverError} />
      </div>
    </div>
  );
}
