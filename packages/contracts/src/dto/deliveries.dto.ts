// ─── Entregas Service ───
// Puerto: 3005
// Base de datos: PostgreSQL
//
// ⚠️ El vendedor autenticado se obtiene del token JWT.
//    Los endpoints usan ese ID para filtrar sus entregas.

import { DeliveryEstado, DeliveryJobStatus } from '../enums';
import type { DireccionEntrega, PaginationRequest } from './common.dto';

export interface DeliveryResponse {
  id: string;
  orderId: string;
  vendedorId: string;
  clienteId: string;
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
}

export interface UpdateDeliveryStatusRequest {
  estado: DeliveryEstado.EN_CAMINO | DeliveryEstado.ENTREGADA;
  notas?: string;
}

// ─── Async Job Tracking ───

export interface DeliveryJobStatusResponse {
  trackingId: string;
  deliveryId: string;
  status: DeliveryJobStatus;
  errorCode?: string;
  errorMessage?: string;
  attempts: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateDeliveryStatusJobData {
  deliveryId: string;
  vendedorId: string;
  actorUserId: string;
  estado: DeliveryEstado.EN_CAMINO | DeliveryEstado.ENTREGADA;
  notas?: string;
  idempotencyKey: string;
  requestId: string;
}
