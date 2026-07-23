import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole } from '@agua/contracts';

interface User {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
  vendedor_id?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('aguaFress_token');
    const storedUser = localStorage.getItem('aguaFress_user');
    
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Error al parsear el usuario del localStorage', error);
        localStorage.removeItem('aguaFress_token');
        localStorage.removeItem('aguaFress_user');
      }
    }
    setLoading(false);
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('aguaFress_token', newToken);
    localStorage.setItem('aguaFress_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('aguaFress_token');
    localStorage.removeItem('aguaFress_user');
    setToken(null);
    setUser(null);
  };

  // Solución P2 (#8): Mostrar un indicador explícito mientras carga
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f3f4f6',
        fontFamily: 'sans-serif',
        color: '#2563eb',
        fontSize: '18px',
        fontWeight: 'bold'
      }}>
        Cargando sesión...
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe ser usado dentro de AuthProvider');
  return context;
};