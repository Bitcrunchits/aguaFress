import { Injectable, ServiceUnavailableException } from '@nestjs/common';

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

export const PRODUCT_CATALOG_PORT = Symbol.for('orders.product-catalog-port');

@Injectable()
export class UnavailableProductCatalog implements ProductCatalogPort {
  getSnapshot(_productId: string): Promise<ProductSnapshot> {
    return Promise.reject(new ServiceUnavailableException('Product catalog is unavailable'));
  }
}
