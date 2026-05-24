// ─── Entregas Service ───
// Puerto 3005 · PostgreSQL

export interface DeliveryResponse {
  id: string;
  orderId: string;
  vendedorId: string;
  estado: 'pendiente' | 'en_camino' | 'entregada';
  cliente: {
    nombre: string;
    telefono?: string;
  };
  direccion: {
    calle: string;
    numero: string;
    pisoDepto?: string;
    referencia?: string;
    latitude?: number;
    longitude?: number;
  };
  fechaAsignacion: string;
  fechaEntrega?: string;
  notas?: string;
}

export interface DeliveryListFilters {
  fecha?: string;
  vendedorId: string;
}

export interface UpdateDeliveryStatusRequest {
  estado: 'en_camino' | 'entregada';
  notas?: string;
}
