import type {
  LoginRequest,
  LoginResponse,
  RefreshTokenResponse,
  UserProfile,
} from '@agua/contracts';
import api from './api';

export async function login(data: LoginRequest): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/auth/login', data);
  return response.data;
}

export async function refresh(
  refreshToken: string
): Promise<RefreshTokenResponse> {
  const response = await api.post<RefreshTokenResponse>('/auth/refresh', {
    refreshToken,
  });
  return response.data;
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

export async function getProfile(): Promise<UserProfile> {
  const response = await api.get<UserProfile>('/users/profile');
  return response.data;
}
