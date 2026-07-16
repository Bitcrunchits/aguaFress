import { Module } from '@nestjs/common';
import { PRODUCT_CATALOG_PORT, UnavailableProductCatalog } from '../products/product-catalog.port';
import { PrismaService } from './prisma.service';

@Module({
  providers: [
    PrismaService,
    {
      provide: PRODUCT_CATALOG_PORT,
      useClass: UnavailableProductCatalog,
    },
  ],
  exports: [PrismaService, PRODUCT_CATALOG_PORT],
})
export class CommonModule {}
