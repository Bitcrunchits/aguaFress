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
    nombre?: string;
    apellido?: string;
  };
}

// ─── Registro de cliente o vendedor desde link público ───

export interface RegisterRequest {
  email: string;
  password: string;
  /** Nombre completo (NO se separa en nombre+apellido) */
  nombre: string;
  role: UserRole.VENDEDOR | UserRole.CLIENTE;
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
  /** Nombre completo (se almacena como nombre; apellido se completa después) */
  nombre: string;
  telefono: string;
  /** Ciudad/localidad de entrega (texto libre — MVP no tiene tabla CIUDAD) */
  ciudad?: string;
  /** Zona/sector de entrega (texto libre — ej: 'Villa Crespo', 'Zona Norte') */
  zonaEntrega?: string;
}

export interface RegisterVendedorResponse {
  status: 'pendiente';
  vendedorId: string;
}

// ─── Logout ───

export interface LogoutResponse {
  message: string;
}

// ─── Google OAuth (DEPRECATED — No implementar en MVP V1) ───

/** @deprecated No implementar en MVP V1. Mantenido para documentación futura. */
export interface GoogleLoginRequest {
  token: string;
}

/** @deprecated No implementar en MVP V1. */
export interface GoogleLoginResponse {
  token: string;
  refreshToken: string;
  user: { id: string; email: string; role: UserRole };
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
