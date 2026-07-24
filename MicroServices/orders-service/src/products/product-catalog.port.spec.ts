import { ServiceUnavailableException } from '@nestjs/common';
import {
  PRODUCT_CATALOG_PORT,
  UnavailableProductCatalog,
} from './product-catalog.port';

describe('UnavailableProductCatalog', () => {
  it('exposes a stable DI token for product snapshot lookups', () => {
    expect(PRODUCT_CATALOG_PORT).toBe(Symbol.for('orders.product-catalog-port'));
  });

  it('returns a controlled unavailable failure when product data cannot be resolved', async () => {
    const catalog = new UnavailableProductCatalog();

    await expect(catalog.getSnapshot('11111111-1111-4111-8111-111111111111')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('keeps client-provided product metadata outside the boundary contract', async () => {
    const catalog = new UnavailableProductCatalog();

    await expect(catalog.getSnapshot('22222222-2222-4222-8222-222222222222')).rejects.toMatchObject({
      message: 'Product catalog is unavailable',
    });
  });
});
