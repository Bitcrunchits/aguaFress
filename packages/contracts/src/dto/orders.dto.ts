// ─── Orders Service ───
// Puerto 3004 · PostgreSQL
// Unifica carrito + pedidos + facturas

// ─── Carrito ───

export interface CartItemRequest {
  userId: string;
  productId: string;
  cantidad: number;
}

export interface CartItemResponse {
  id: string;
  productId: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
}

export interface CartResponse {
  items: CartItemResponse[];
  totalSinIva: number;
  iva: number;
  total: number;
}

export interface UpdateCartItemRequest {
  cantidad: number;
}

// ─── Pedidos ───

export interface CreateOrderRequest {
  userId: string;
  items: { productId: string; cantidad: number }[];
  metodoPago: 'contra_entrega';
  direccion: {
    calle: string;
    numero: string;
    pisoDepto?: string;
    referencia?: string;
    barrioId?: string;
    latitude?: number;
    longitude?: number;
  };
  observaciones?: string;
}

export interface OrderResponse {
  id: string;
  pedidoNumero: string;
  cliente: { id: string; nombre: string };
  items: {
    productId: string;
    nombre: string;
    cantidad: number;
    precioUnitario: number;
  }[];
  totalSinIva: number;
  iva: number;
  total: number;
  estado: string;
  metodoPago: string;
  direccion: object;
  createdAt: string;
}

export interface OrderListFilters {
  userId?: string;
  vendedorId?: string;
  estado?: string;
}

export interface OrderListResponse {
  id: string;
  pedidoNumero: string;
  estado: string;
  total: number;
  clienteNombre?: string;
  createdAt: string;
}

export interface UpdateOrderStatusRequest {
  estado: string;
}

export interface CancelOrderRequest {
  motivo?: string;
}
