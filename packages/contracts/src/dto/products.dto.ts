// ─── Products Service ───
// Puerto: 3003
// Base de datos: PostgreSQL
//
// NOTA: El precio SIEMPRE se calcula server-side.
// El frontend NO manda precio al crear/actualizar un producto.

import type { PaginationRequest } from './common.dto';

// ─── Producto ───

export interface ProductResponse {
  id: string;
  nombre: string;
  descripcion?: string;
  precioSinIva: number;
  porcentajeIva: number;
  porcentajeImpuestos: number;
  costoIva: number;
  costoImpuestos: number;
  precioFinal: number;
  imagen?: string;
  stock: number;
  marca?: string;
  categoria?: string;
  vendedorId: string;
  activo: boolean;
  /** Si false, el precio no se muestra al cliente (oculto hasta configurar) */
  mostrarPrecio?: boolean;
}

// ─── Crear ───

export interface CreateProductRequest {
  nombre: string;
  descripcion?: string;
  /** Monto SIN IVA. El service calcula precioFinal automáticamente. */
  precioSinIva: number;
  /** Porcentaje de IVA (default 21). Se guarda por producto para flexibilidad fiscal. */
  porcentajeIva?: number;
  /** Porcentaje de impuestos adicionales (IIBB, municipales). Default 0. */
  porcentajeImpuestos?: number;
  categoriaId: string;
  marcaId?: string;
  imagen?: string;
  stock: number;
  /** Si false, el precio no se muestra al cliente (campo de producto, default true) */
  mostrarPrecio?: boolean;
  /**
   * ⚠️ NUNCA viene del body. El service lo inyecta desde el token JWT
   *    del vendedor autenticado (regla de seguridad §11.6).
   */
}

// ─── Actualizar ───

export interface UpdateProductRequest {
  nombre?: string;
  descripcion?: string;
  precioSinIva?: number;
  porcentajeIva?: number;
  porcentajeImpuestos?: number;
  stock?: number;
  imagen?: string;
  activo?: boolean;
  mostrarPrecio?: boolean;
  categoriaId?: string;
  marcaId?: string;
}

// ─── Filtros y búsqueda ───

export interface ProductListFilters extends PaginationRequest {
  vendedorId?: string;
  categoriaId?: string;
  /** Solo productos con stock > 0 y activo = true */
  disponibles?: boolean;
}

export interface SearchProductQuery {
  q: string;
  vendedorId?: string;
  page?: number;
  limit?: number;
}

// ─── Marcas y Categorías ───

export interface MarcaResponse {
  id: string;
  nombre: string;
  vendedorId: string;
  activo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategoriaResponse {
  id: string;
  nombre: string;
  orden: number;
  vendedorId: string;
  activo?: boolean;
  createdAt: string;
  updatedAt: string;
}
