import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole } from '@agua/contracts'; // Importado de los contratos compartidos[cite: 2]

interface User {
  id: string;
  email: string;
  role: UserRole; // SUPER ADMIN, VENDEDOR, CLIENTE
  name?: string;
  vendedor_id?: string; // Esencial para el aislamiento de cartera
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
    const storedToken = localStorage.getItem('aguaFress_token');[cite: 1]
    const storedUser = localStorage.getItem('aguaFress_user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('aguaFress_token', newToken);[cite: 1]
    localStorage.setItem('aguaFress_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('aguaFress_token');[cite: 1]
    localStorage.removeItem('aguaFress_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe ser usado dentro de AuthProvider');
  return context;
};