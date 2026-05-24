// ─── Products Service ───
// Puerto 3003 · PostgreSQL

export interface ProductResponse {
  id: string;
  nombre: string;
  descripcion?: string;
  precioSinIva: number;
  precioFinal: number;
  imagen?: string;
  stock: number;
  marca?: string;
  categoria?: string;
  vendedorId: string;
  activo: boolean;
}

export interface ProductListFilters {
  vendedorId?: string;
  categoria?: string;
  disponibles?: boolean;
}

export interface CreateProductRequest {
  nombre: string;
  descripcion?: string;
  precio: number;
  categoriaId: string;
  marcaId?: string;
  imagen?: string;
  stock: number;
  vendedorId: string;
}

export interface UpdateProductRequest {
  nombre?: string;
  descripcion?: string;
  precio?: number;
  stock?: number;
  imagen?: string;
  activo?: boolean;
}

export interface MarcaResponse {
  id: string;
  nombre: string;
  vendedorId: string;
}

export interface CategoriaResponse {
  id: string;
  nombre: string;
  orden: number;
  vendedorId: string;
}

export interface SearchProductQuery {
  q: string;
  vendedorId?: string;
}
