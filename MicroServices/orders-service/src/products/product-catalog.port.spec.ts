import { ServiceUnavailableException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  PRODUCT_CATALOG_PORT,
  SCOPED_PRODUCT_CATALOG_PORT,
  type ProductCatalogPort,
  type ScopedProductCatalogPort,
} from './product-catalog.port';
import { TcpProductCatalogAdapter } from './tcp-product-catalog.adapter';

describe('product catalog port contract', () => {
  it('exposes stable DI tokens for legacy and scoped product snapshot lookups', () => {
    expect(PRODUCT_CATALOG_PORT).toBe(Symbol.for('orders.product-catalog-port'));
    expect(SCOPED_PRODUCT_CATALOG_PORT).toBe(Symbol.for('orders.scoped-product-catalog-port'));
  });

  it('keeps the scoped port substitutable for the legacy port contract', () => {
    const client = { send: jest.fn(), close: jest.fn() };
    const scoped: ScopedProductCatalogPort = new TcpProductCatalogAdapter(client as unknown as ClientProxy);
    const legacy: ProductCatalogPort = scoped;

    expect(typeof legacy.getSnapshot).toBe('function');
    expect(legacy.getSnapshot).toBe(scoped.getSnapshot);
  });

  it('fails closed on the legacy unscoped entry without contacting the catalog client', async () => {
    const client = { send: jest.fn(), close: jest.fn() };
    const legacy: ProductCatalogPort = new TcpProductCatalogAdapter(client as unknown as ClientProxy);

    await expect(legacy.getSnapshot('11111111-1111-4111-8111-111111111111')).rejects.toThrow(ServiceUnavailableException);
    await expect(legacy.getSnapshot('22222222-2222-4222-8222-222222222222')).rejects.toMatchObject({
      message: 'Product catalog is unavailable',
    });
    expect(client.send).not.toHaveBeenCalled();
  });
});
