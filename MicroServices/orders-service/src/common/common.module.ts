import { Module } from '@nestjs/common';
import { PRODUCT_CATALOG_PORT, UnavailableProductCatalog } from '../products/product-catalog.port';
import { CLOCK, systemClock } from './clock.provider';
import { PrismaService } from './prisma.service';

@Module({
  providers: [
    PrismaService,
    {
      provide: PRODUCT_CATALOG_PORT,
      useClass: UnavailableProductCatalog,
    },
    {
      provide: CLOCK,
      useValue: systemClock,
    },
  ],
  exports: [PrismaService, PRODUCT_CATALOG_PORT, CLOCK],
})
export class CommonModule {}
