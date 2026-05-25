// ─── usuario-service (módulo auth) ───
// Puertos: 3001 (mismo MS que users)
// Base de datos: PostgreSQL (schema: auth)
//
// IMPORTANTE: userId NUNCA viene del body. Se extrae del token JWT
// en el middleware del Gateway o del propio servicio.

import { UserRole } from '../enums';

// ─── Login ───

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
    role: UserRole;
    name?: string;
  };
}

// ─── Registro de cliente o vendedor desde link público ───

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role: 'vendedor' | 'cliente';
  /** Solo si viene de link público QR */
  qrToken?: string;
}

export interface RegisterResponse {
  user: { id: string; email: string; role: UserRole };
}

// ─── Registro manual de vendedor (admin) ───

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

// ─── Google Auth ─────────────────────────────────────
// @deprecated No implementado en MVP V1. Mantenemos la
// interfaz para cuando se habilite, pero NO CODEEAR.
// ─────────────────────────────────────────────────────

/** @deprecated No implementar en MVP V1 */
export interface GoogleAuthRequest {
  googleToken: string;
}

/** @deprecated No implementar en MVP V1 */
export interface GoogleAuthResponse {
  token: string;
  user: { id: string; email: string; role: UserRole; name?: string };
}

// ─── Refresh / Validate ───

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
  user: { id: string; email: string; role: UserRole } | null;
}
