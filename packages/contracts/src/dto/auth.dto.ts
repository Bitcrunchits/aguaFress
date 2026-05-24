// ─── Auth Service ───
// Puerto 3001 · PostgreSQL

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: string;
    name?: string;
  };
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role: 'vendedor' | 'cliente';
  /** Solo si viene de link público QR */
  qrToken?: string;
}

export interface RegisterResponse {
  user: { id: string; email: string; role: string };
}

export interface RegisterVendedorRequest {
  email: string;
  password: string;
  name: string;
  phone: string;
}

export interface RegisterVendedorResponse {
  status: 'pendiente';
  vendedorId: string;
}

export interface GoogleAuthRequest {
  googleToken: string;
}

export interface GoogleAuthResponse {
  token: string;
  user: { id: string; email: string; role: string; name?: string };
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  token: string;
}

export interface ValidateTokenRequest {
  token: string;
}

export interface ValidateTokenResponse {
  valid: boolean;
  user: { id: string; email: string; role: string } | null;
}
