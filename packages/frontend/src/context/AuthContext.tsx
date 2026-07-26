import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { LoginRequest, LoginResponse, UserProfile } from '@agua/contracts';
import * as authService from '../services/auth.service';
import {
  setToken,
  setRefreshToken,
  clearSession,
  getToken,
} from '../services/session';

export interface AuthContextValue {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginRequest) => Promise<LoginResponse>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setTokenState] = useState<string | null>(getToken());
  const [isLoading, setIsLoading] = useState(true);

  const restoreSession = useCallback(async () => {
    const storedToken = getToken();
    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    try {
      const profile = await authService.getProfile();
      setUser(profile);
      setTokenState(storedToken);
    } catch {
      clearSession();
      setUser(null);
      setTokenState(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const login = useCallback(async (data: LoginRequest) => {
    const response = await authService.login(data);
    setToken(response.token);
    setRefreshToken(response.refreshToken);
    setTokenState(response.token);
    setUser({
      id: response.user.id,
      email: response.user.email,
      role: response.user.role,
      nombre: response.user.nombre,
      apellido: response.user.apellido,
      isActive: true,
    } as UserProfile);
    return response;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Ignorar errores de logout (server down, etc.)
    } finally {
      clearSession();
      setUser(null);
      setTokenState(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: !!user,
      login,
      logout,
    }),
    [user, token, isLoading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
