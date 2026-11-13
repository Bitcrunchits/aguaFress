import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import type { Observable } from 'rxjs';
import { VendedorEstado, type VendedorProfileV2DTO } from '@agua/contracts';
import { API_CONFIG } from '../../core/config/api.config';

const PROFILE_URL = `${API_CONFIG.baseUrl}/api/v1/vendedores/profile`;
const UPDATE_PROFILE_URL = `${API_CONFIG.baseUrl}/api/v1/vendedores/profile/update`;
const UPLOAD_LOGO_URL = `${API_CONFIG.baseUrl}/api/v1/upload/vendor-logo`;

/**
 * Raw Prisma VENDEDOR row returned by the DEPLOYED `main` backend. Local only:
 * the deployed `vendedores.profile` action returns a snake_case row, not the
 * camelCase `VendedorProfile` read model, so this must NOT live in contracts.
 */
interface VendedorProfileRawResponse {
  id: string;
  auth_user_id: string;
  nombre: string;
  apellido: string;
  dni: string;
  cuil: string | null;
  cuit: string | null;
  telefono: string;
  empresa: string | null;
  logo: string | null;
  estado: string;
  ciudad_default: string;
  zona_entrega: string | null;
  qr_token: string | null;
  created_at: string;
  updated_at: string;
  auth_user: { id: string; email: string; role: string; is_active: boolean };
  _count: { clientes: number };
}

/**
 * camelCase update payload for `vendedores.profile/update`. Local to this
 * service: the deployed backend maps camelCase → snake_case itself and none of
 * the shared `@agua/contracts` request DTOs describe the vendedor update body.
 */
export interface UpdateVendedorProfileRequest {
  nombre?: string;
  apellido?: string;
  dni?: string;
  cuil?: string;
  cuit?: string;
  telefono?: string;
  empresa?: string;
  logo?: string;
  ciudadDefault?: string;
  zonaEntrega?: string;
}

/** Validated wire-value → enum lookup. Unknown values fail safely instead of leaking an invalid state. */
const ESTADO_FROM_RAW: Record<string, VendedorEstado> = {
  pendiente: VendedorEstado.PENDIENTE,
  activo: VendedorEstado.ACTIVO,
  inactivo: VendedorEstado.INACTIVO,
  bloqueado: VendedorEstado.BLOQUEADO,
};

function mapEstado(raw: string): VendedorEstado {
  const estado = ESTADO_FROM_RAW[raw];
  if (estado === undefined) {
    throw new Error(`Unknown VendedorEstado from backend: ${raw}`);
  }
  return estado;
}

/**
 * Maps the deployed backend's snake_case Prisma row into the camelCase
 * `VendedorProfileV2DTO` read model. Empty-string and `null` optionals
 * collapse to `undefined` so read-only UI can use truthiness (e.g.
 * `profile.zonaEntrega`).
 */
function mapRawToProfile(raw: VendedorProfileRawResponse): VendedorProfileV2DTO {
  return {
    nombre: raw.nombre || undefined,
    apellido: raw.apellido || undefined,
    dni: raw.dni || undefined,
    cuil: raw.cuil ?? undefined,
    cuit: raw.cuit ?? undefined,
    telefono: raw.telefono || undefined,
    empresa: raw.empresa ?? undefined,
    logo: raw.logo ?? undefined,
    estado: mapEstado(raw.estado),
    qrCode: raw.qr_token ?? undefined,
    ciudadDefault: raw.ciudad_default || undefined,
    zonaEntrega: raw.zona_entrega ?? undefined,
  };
}

/**
 * Vendedor profile HTTP access against the gateway `vendedores.profile`
 * action. The authenticated vendedor is resolved from the JWT server-side,
 * so no `vendedorId` or `userId` is ever sent in the request.
 */
@Injectable({ providedIn: 'root' })
export class VendedorProfileService {
  private readonly http = inject(HttpClient);

  getProfile(): Observable<VendedorProfileV2DTO> {
    return this.http
      .get<VendedorProfileRawResponse>(PROFILE_URL)
      .pipe(map(mapRawToProfile));
  }

  updateProfile(body: UpdateVendedorProfileRequest): Observable<VendedorProfileV2DTO> {
    return this.http
      .post<VendedorProfileRawResponse>(UPDATE_PROFILE_URL, body)
      .pipe(map(mapRawToProfile));
  }

  uploadLogo(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http
      .post<{ imageId: string }>(UPLOAD_LOGO_URL, formData)
      .pipe(map((response) => `/uploads/${response.imageId}`));
  }
}
