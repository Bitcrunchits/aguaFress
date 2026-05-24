// ─── User Service ───
// Puerto 3002 · PostgreSQL

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  role: string;
  phone?: string;
  isActive: boolean;
  profile?: VendedorProfile | ClienteProfile;
}

export interface VendedorProfile {
  empresa?: string;
  logo?: string;
  estado: string;
  qrCode?: string;
  linkPublico?: string;
  ciudadDefault?: string;
}

export interface ClienteProfile {
  nombre?: string;
  apellido?: string;
  telefono?: string;
  dni?: string;
  tipoFactura?: 'B' | 'C';
}

export interface UpdateProfileRequest {
  name?: string;
  phone?: string;
  address?: {
    calle?: string;
    numero?: string;
    pisoDepto?: string;
    referencia?: string;
    barrioId?: string;
    latitude?: number;
    longitude?: number;
  };
}

export interface AsignarVendedorRequest {
  clienteId: string;
  vendedorId: string;
}

export interface AsignarVendedorResponse {
  clienteId: string;
  vendedorId: string;
  updated: boolean;
}

export interface ClienteResponse {
  id: string;
  name: string;
  address?: string;
  phone?: string;
}

export interface VendedorResponse {
  id: string;
  name: string;
  empresa?: string;
  phone?: string;
}

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

export interface PerfilPublicoResponse {
  vendedor: {
    nombre: string;
    empresa?: string;
    logo?: string;
    phone?: string;
  };
  catalogo?: unknown[]; // Tipado completo desde products.dto
}
