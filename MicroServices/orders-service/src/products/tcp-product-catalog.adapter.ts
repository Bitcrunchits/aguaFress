import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { randomUUID } from 'node:crypto';
import { firstValueFrom, timeout } from 'rxjs';
import type { TcpAuthenticatedUser } from '../tcp/tcp-payload';
import { PRODUCT_CATALOG_TIMEOUT_MS, type ProductSnapshot, type ScopedProductCatalogPort } from './product-catalog.port';

export const PRODUCT_CATALOG_CLIENT = Symbol('orders.product-catalog-client');

// Products resolves the client's portfolio through usuario (2500 ms). Leave
// room for that lookup and for orders to respond before the gateway's 5000 ms.
@Injectable()
export class TcpProductCatalogAdapter implements ScopedProductCatalogPort, OnModuleDestroy {
  constructor(@Inject(PRODUCT_CATALOG_CLIENT) private readonly client: ClientProxy) {}

  // Legacy LSP entry: no authenticated user can be supplied here, so the
  // unscoped read fails closed instead of bypassing products-service scoping.
  getSnapshot(_productId: string): Promise<ProductSnapshot> {
    return Promise.reject(new ServiceUnavailableException('Product catalog is unavailable'));
  }

  async getScopedSnapshot(productId: string, user: TcpAuthenticatedUser, timeoutMs = PRODUCT_CATALOG_TIMEOUT_MS): Promise<ProductSnapshot> {
    let response: unknown;
    try {
      response = await firstValueFrom(this.client.send<unknown>('products.get', {
        query: { id: productId },
        body: {},
        user: { sub: user.userId, email: user.email, role: user.role },
        requestId: randomUUID(),
      }).pipe(timeout(Math.min(timeoutMs, PRODUCT_CATALOG_TIMEOUT_MS))));
    } catch (error) {
      throw catalogError(error);
    }

    if (!isSnapshot(response) || response.id !== productId) {
      throw new ServiceUnavailableException('Product catalog returned an invalid snapshot');
    }
    return response;
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.close();
  }
}

function isSnapshot(value: unknown): value is ProductSnapshot {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const product = value as Record<string, unknown>;
  return typeof product.id === 'string' && product.id.trim() !== ''
    && typeof product.vendedorId === 'string' && product.vendedorId.trim() !== ''
    && typeof product.nombre === 'string' && product.nombre.trim() !== ''
    && typeof product.precioFinal === 'number' && Number.isFinite(product.precioFinal) && product.precioFinal >= 0
    && typeof product.stock === 'number' && Number.isSafeInteger(product.stock) && product.stock >= 0
    && typeof product.activo === 'boolean' && typeof product.mostrarPrecio === 'boolean';
}

function catalogError(error: unknown): Error {
  // Nest TCP serializes HttpExceptions as { statusCode, message, error }.
  // Only known client errors cross this boundary; failures remain retryable.
  const payload = error instanceof RpcException ? error.getError() : error;
  const nested = typeof payload === 'object' && payload !== null && 'error' in payload
    && typeof payload.error === 'object' && payload.error !== null ? payload.error : payload;
  if (typeof nested === 'object' && nested !== null && 'statusCode' in nested) {
    const status = nested.statusCode;
    if (status === 404) return new NotFoundException('Product was not found');
    if (status === 400) return new BadRequestException('Invalid product request');
    if (status === 403) return new ForbiddenException('Product access denied');
  }
  return new ServiceUnavailableException('Product catalog is unavailable');
}
