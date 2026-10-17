import type { TcpAuthenticatedUser } from '../tcp/tcp-payload';

export interface ProductSnapshot {
  readonly id: string;
  readonly vendedorId: string;
  readonly nombre: string;
  readonly precioFinal: number;
  readonly stock: number;
  readonly activo: boolean;
  readonly mostrarPrecio: boolean;
}

export interface ProductCatalogPort {
  getSnapshot(productId: string): Promise<ProductSnapshot>;
}

export interface ScopedProductCatalogPort extends ProductCatalogPort {
  getScopedSnapshot(productId: string, user: TcpAuthenticatedUser, timeoutMs?: number): Promise<ProductSnapshot>;
}

export const PRODUCT_CATALOG_PORT = Symbol.for('orders.product-catalog-port');
export const SCOPED_PRODUCT_CATALOG_PORT = Symbol.for('orders.scoped-product-catalog-port');
export const PRODUCT_CATALOG_TIMEOUT_MS = 4000;
