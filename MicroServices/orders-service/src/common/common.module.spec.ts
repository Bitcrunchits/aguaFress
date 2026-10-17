import { Test } from '@nestjs/testing';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { CommonModule } from './common.module';
import { CLOCK } from './clock.provider';
import { PrismaService } from './prisma.service';
import { PRODUCT_CATALOG_PORT, SCOPED_PRODUCT_CATALOG_PORT } from '../products/product-catalog.port';
import { PRODUCT_CATALOG_CLIENT, TcpProductCatalogAdapter } from '../products/tcp-product-catalog.adapter';

describe('CommonModule', () => {
  it('provides shared Prisma and product catalog ports through DI', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CommonModule],
    }).compile();

    expect(moduleRef.get(PrismaService)).toBeInstanceOf(PrismaService);
    expect(moduleRef.get(PRODUCT_CATALOG_PORT)).toBeDefined();
    expect(moduleRef.get(SCOPED_PRODUCT_CATALOG_PORT)).toBe(moduleRef.get(PRODUCT_CATALOG_PORT));
    expect(moduleRef.get(CLOCK)()).toBeInstanceOf(Date);

    await moduleRef.close();
  });

  it('creates the catalog TCP client from provider configuration and closes it with the module', async () => {
    const previousHost = process.env.PRODUCTS_SERVICE_HOST;
    const previousPort = process.env.PRODUCTS_SERVICE_TCP_PORT;
    const client = { send: jest.fn(), close: jest.fn().mockResolvedValue(undefined) };
    const factory = jest.spyOn(ClientProxyFactory, 'create').mockReturnValue(client as unknown as ClientProxy);
    process.env.PRODUCTS_SERVICE_HOST = 'catalog-host';
    process.env.PRODUCTS_SERVICE_TCP_PORT = '4213';

    try {
      const moduleRef = await Test.createTestingModule({ imports: [CommonModule] }).compile();
      try {
        expect(factory).toHaveBeenCalledWith({
          transport: Transport.TCP,
          options: { host: 'catalog-host', port: 4213 },
        });
        expect(moduleRef.get(PRODUCT_CATALOG_CLIENT)).toBe(client);
        expect(moduleRef.get(PRODUCT_CATALOG_PORT)).toBeInstanceOf(TcpProductCatalogAdapter);
      } finally {
        await moduleRef.close();
      }
      expect(client.close).toHaveBeenCalledTimes(1);
    } finally {
      factory.mockRestore();
      if (previousHost === undefined) delete process.env.PRODUCTS_SERVICE_HOST;
      else process.env.PRODUCTS_SERVICE_HOST = previousHost;
      if (previousPort === undefined) delete process.env.PRODUCTS_SERVICE_TCP_PORT;
      else process.env.PRODUCTS_SERVICE_TCP_PORT = previousPort;
    }
  });
});
