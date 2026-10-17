import { Module } from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { PRODUCT_CATALOG_PORT, SCOPED_PRODUCT_CATALOG_PORT } from '../products/product-catalog.port';
import { PRODUCT_CATALOG_CLIENT, TcpProductCatalogAdapter } from '../products/tcp-product-catalog.adapter';
import { CLOCK, systemClock } from './clock.provider';
import { PrismaService } from './prisma.service';

@Module({
  providers: [
    PrismaService,
    {
      provide: PRODUCT_CATALOG_CLIENT,
      useFactory: () => ClientProxyFactory.create({
        transport: Transport.TCP,
        options: {
          host: process.env.PRODUCTS_SERVICE_HOST || 'products-service',
          port: readPort(process.env.PRODUCTS_SERVICE_TCP_PORT),
        },
      }),
    },
    {
      provide: PRODUCT_CATALOG_PORT,
      useClass: TcpProductCatalogAdapter,
    },
    {
      provide: SCOPED_PRODUCT_CATALOG_PORT,
      useExisting: PRODUCT_CATALOG_PORT,
    },
    {
      provide: CLOCK,
      useValue: systemClock,
    },
  ],
  exports: [PrismaService, PRODUCT_CATALOG_PORT, SCOPED_PRODUCT_CATALOG_PORT, CLOCK],
})
export class CommonModule {}

function readPort(value: string | undefined): number {
  const port = value === undefined ? 3013 : Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PRODUCTS_SERVICE_TCP_PORT must be a valid TCP port');
  }
  return port;
}
