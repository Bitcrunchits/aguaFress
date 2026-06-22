// ─── Tipos compartidos entre múltiples servicios ───
// Se reusan en pedidos, entregas, users, etc.

/**
 * Dirección de entrega
 * Usada en: orders.dto, deliveries.dto, user.dto
 * NOTA: barrio es nombre libre, NO id — no existe tabla barrios en MVP
 */
export interface DireccionEntrega {
  calle: string;
  numero: string;
  pisoDepto?: string;
  referencia?: string;
  barrio?: string;
  ciudad?: string;
  provincia?: string;
  codigoPostal?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Paginación para endpoints de listas
 * Ver: products, orders, deliveries
 */
export interface PaginationRequest {
  page?: number;
  limit?: number;
}

export interface PaginationResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Respuesta paginada genérica.
 * USO: `PaginatedResponse<ProductResponse>`
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationResponse;
}

/**
 * Formato de error estándar para todos los microservicios
 */
export interface ErrorResponse {
  statusCode: number;
  message: string;
  error?: string;
  details?: unknown;
}
