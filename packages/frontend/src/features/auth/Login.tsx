import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../config/api';
import { UserRole } from '@agua/contracts';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  // Estados del Formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Pegarle al API Gateway
      const response = await api.post('/auth/login', { email, password });
      
      // Desestructuramos el token y el usuario
      const { token, user } = response.data;

      // 2. Guardar en Contexto / LocalStorage
      login(token, user);

      // 3. Redirección inteligente según el rol
      switch (user.role) {
        case UserRole.SUPER_ADMIN:
          navigate('/admin/dashboard', { replace: true });
          break;
        case UserRole.VENDEDOR:
          navigate('/vendedor/dashboard', { replace: true });
          break;
        case UserRole.CLIENTE:
          navigate('/consumidor/dashboard', { replace: true });
          break;
        default:
          navigate('/unauthorized', { replace: true });
      }
    } catch (err: unknown) {
      // Manejo seguro de errores con AxiosError (Type Safe)
      if (err instanceof AxiosError) {
        setError(err.response?.data?.message ?? 'Credenciales inválidas o error de autenticación');
      } else {
        setError('Error de conexión con el servidor. Inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">AguaFress</h2>
        <p className="login-subtitle">Inicia sesión para continuar</p>

        {error && <div className="login-error-alert">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label className="login-label">Correo Electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="ejemplo@aguafress.com"
              className="login-input"
              disabled={loading}
            />
          </div>

          <div className="input-group">
            <label className="login-label">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="login-input"
              disabled={loading}
            />
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
};