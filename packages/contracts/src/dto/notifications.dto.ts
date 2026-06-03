// ─── Notifications Service ───
// Puerto 3006 · MongoDB

export interface ActivityLogResponse {
  id: string;
  usuarioId?: string;
  accion: string;
  entidadTipo: string;
  entidadId?: string;
  servicio: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface LogFilters {
  servicio?: string;
  accion?: string;
  usuarioId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}
