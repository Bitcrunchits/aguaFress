// ─── usuario-service (módulo users) ───
// Puertos: 3001 (mismo MS que auth)
// Base de datos: PostgreSQL (schema: users)
//
// Este módulo maneja: perfil, cartera de clientes, QR de invitación.

import { TipoFactura, UserRole, VendedorEstado } from '../enums';
import type { ProductResponse } from './products.dto';

// ─── Perfiles ───

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  phone?: string;
  isActive: boolean;
  profile?: VendedorProfile | ClienteProfile;
}

export interface VendedorProfile {
  empresa?: string;
  logo?: string;
  estado: VendedorEstado;
  qrCode?: string;
  linkPublico?: string;
  /** Nombre de ciudad/localidad por defecto para entregas */
  ciudadDefault?: string;
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
  name?: string;
  phone?: string;
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
  name: string;
  address?: string;
  phone?: string;
  tipoFactura?: TipoFactura;
}

export interface VendedorResponse {
  id: string;
  name: string;
  empresa?: string;
  phone?: string;
  estado?: VendedorEstado;
}

// ─── QR / Link de invitación ───

export interface GenerarQRResponse {
  qrCode: string;
  url: string;
  expiresAt: string;
}

export interface GenerarLinkResponse {
  linkUrl: string;
  token: string;
  expiresAt: string;
}

// ─── Perfil público para el catálogo del vendedor ───

export interface PerfilPublicoResponse {
  vendedor: {
    nombre: string;
    empresa?: string;
    logo?: string;
    phone?: string;
  };
  /** Productos activos, tipado completo desde products.dto */
  catalogo?: ProductResponse[];
}
