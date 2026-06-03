// ─── usuario-service (módulo users) ───
// Puertos: 3001 (mismo MS que auth)
// Base de datos: PostgreSQL (schema: users)
//
// Este módulo maneja: perfil, cartera de clientes, QR de invitación.

import { TipoFactura, UserRole, VendedorEstado } from '../enums';
import type { ProductResponse } from './products.dto';

// ─── Listado de usuarios (admin) ───

import type { PaginatedResponse, PaginationRequest } from './common.dto';

export interface UserListFilters extends PaginationRequest {
  role?: UserRole;
  search?: string;
  activo?: boolean;
}

export interface UserListItem {
  id: string;
  email: string;
  nombre?: string;
  apellido?: string;
  role: UserRole;
  isActive: boolean;
  telefono?: string;
  createdAt: string;
}

export type UserListResponse = PaginatedResponse<UserListItem>;

// ─── Mi vendedor (cliente) ───

export interface MiVendedorResponse {
  id: string;
  nombre: string;
  apellido?: string;
  empresa?: string;
  logo?: string;
  telefono?: string;
  ciudad?: string;
}

// ─── Perfiles ───

export interface UserProfile {
  id: string;
  email: string;
  /** Nombre (puede ser el nombre completo si apellido no está definido) */
  nombre?: string;
  /** Apellido (opcional — en MVP se completa después del registro) */
  apellido?: string;
  role: UserRole;
  telefono?: string;
  isActive: boolean;
  /**
   * Perfil específico según el rol.
   * - VENDEDOR → VendedorProfile (empresa, qrCode, linkPublico, etc.)
   * - CLIENTE → ClienteProfile (dni, tipoFactura, etc.)
   * Hacer narrowing: `if (profile && 'empresa' in profile)`
   */
  profile?: VendedorProfile | ClienteProfile;
}

export interface VendedorProfile {
  nombre?: string;
  apellido?: string;
  empresa?: string;
  logo?: string;
  estado: VendedorEstado;
  qrCode?: string;
  linkPublico?: string;
  /** Nombre de ciudad/localidad por defecto para entregas */
  ciudadDefault?: string;
  /** Zona de entrega/sector (texto libre — ej: 'Villa Crespo', 'Norte') */
  zonaEntrega?: string;
}

export interface ClienteProfile {
  nombre?: string;
  apellido?: string;
  telefono?: string;
  dni?: string;
  tipoFactura?: TipoFactura;
}

// ─── Actualización de perfil ───

export interface UpdateProfileRequest {
  nombre?: string;
  apellido?: string;
  telefono?: string;
  address?: {
    calle?: string;
    numero?: string;
    pisoDepto?: string;
    referencia?: string;
    /** Nombre de barrio libre — NO es id. No existe tabla barrios en MVP */
    barrio?: string;
    latitude?: number;
    longitude?: number;
  };
}

// ─── Cartera de clientes (asignación admin → vendedor) ───

export interface AsignarVendedorRequest {
  clienteId: string;
  vendedorId: string;
}

export interface AsignarVendedorResponse {
  clienteId: string;
  vendedorId: string;
  updated: boolean;
}

// ─── Responses simplificados para listas ───

export interface ClienteResponse {
  id: string;
  nombre: string;
  apellido?: string;
  /** Representación en una línea de la dirección (NO es DireccionEntrega completo) */
  address?: string;
  telefono?: string;
  tipoFactura?: TipoFactura;
}

export interface VendedorResponse {
  id: string;
  nombre: string;
  apellido?: string;
  empresa?: string;
  telefono?: string;
  ciudad?: string;
  estado?: VendedorEstado;
}

// ─── QR / Link de invitación ───

export interface GenerarQRResponse {
  /** Imagen QR en Base64 (PNG) */
  qrCode: string;
  /** URL pública del link de invitación */
  url: string;
  /** ISO 8601 — el QR expira en 48 horas */
  expiresAt: string;
}

export interface GenerarLinkResponse {
  linkUrl: string;
  token: string;
  /** ISO 8601 — el link expira en 48 horas */
  expiresAt: string;
}

// ─── Perfil público para el catálogo del vendedor ───

export interface PerfilPublicoResponse {
  vendedor: {
    nombre: string;
    apellido?: string;
    empresa?: string;
    logo?: string;
    telefono?: string;
    ciudad?: string;
  };
  /** Productos activos, tipado completo desde products.dto */
  catalogo?: ProductResponse[];
}
