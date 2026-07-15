import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../config/api';
import { UserRole } from '@agua/contracts'; // Enums compartidos de tu monorepo[cite: 2]

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
      // 1. Pegarle al API Gateway (puerto 3000)
      const response = await api.post('/auth/login', { email, password });[cite: 3]
      
      // Desestructuramos el token y los datos del usuario devueltos por el backend[cite: 3]
      const { token, user } = response.data;[cite: 3]

      // 2. Guardar en el Contexto (y por ende en LocalStorage)
      login(token, user);[cite: 1]

      // 3. Redirección inteligente según el rol del usuario logueado[cite: 1]
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
    } catch (err: any) {
      // Capturar errores del servidor (ej: 401 Credenciales Inválidas)[cite: 3]
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Error de conexión con el servidor. Inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>AguaFress</h2>
        <p style={styles.subtitle}>Inicia sesión para continuar</p>

        {error && <div style={styles.errorAlert}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Correo Electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="ejemplo@aguafress.com"
              style={styles.input}
              disabled={loading}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={styles.input}
              disabled={loading}
            />
          </div>

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
};

// Estilos rápidos en línea (puedes reemplazarlos con Tailwind CSS más tarde)
const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f3f4f6',
    fontFamily: 'sans-serif',
  },
  card: {
    backgroundColor: '#ffffff',
    padding: '40px',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    width: '100%',
    maxWidth: '400px',
  },
  title: {
    textAlign: 'center' as const,
    margin: '0 0 10px 0',
    color: '#2563eb',
    fontSize: '28px',
  },
  subtitle: {
    textAlign: 'center' as const,
    color: '#6b7280',
    margin: '0 0 24px 0',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#374151',
  },
  input: {
    padding: '10px 12px',
    borderRadius: '4px',
    border: '1px solid #d1d5db',
    fontSize: '16px',
  },
  button: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    padding: '12px',
    borderRadius: '4px',
    border: 'none',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '10px',
  },
  errorAlert: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid #fee2e2',
    fontSize: '14px',
    marginBottom: '16px',
    textAlign: 'center' as const,
  },
};