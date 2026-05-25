// ─── Entregas Service ───
// Puerto: 3005
// Base de datos: PostgreSQL
//
// ⚠️ El vendedor autenticado se obtiene del token JWT.
//    Los endpoints usan ese ID para filtrar sus entregas.

import { DeliveryEstado } from '../enums';
import type { DireccionEntrega, PaginationRequest } from './common.dto';

export interface DeliveryResponse {
  id: string;
  orderId: string;
  vendedorId: string;
  estado: DeliveryEstado;
  cliente: {
    nombre: string;
    telefono?: string;
  };
  direccion: DireccionEntrega;
  fechaAsignacion: string;
  fechaEntrega?: string;
  notas?: string;
}

export interface DeliveryListFilters extends PaginationRequest {
  /** Fecha ISO (YYYY-MM-DD) */
  fecha?: string;
  vendedorId: string;
}

export interface UpdateDeliveryStatusRequest {
  estado: DeliveryEstado.EN_CAMINO | DeliveryEstado.ENTREGADA;
  notas?: string;
}
