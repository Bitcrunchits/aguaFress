import { Test } from '@nestjs/testing';
import { CommonModule } from './common.module';
import { PrismaService } from './prisma.service';
import { PRODUCT_CATALOG_PORT } from '../products/product-catalog.port';

describe('CommonModule', () => {
  it('provides shared Prisma and product catalog ports through DI', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CommonModule],
    }).compile();

    expect(moduleRef.get(PrismaService)).toBeInstanceOf(PrismaService);
    expect(moduleRef.get(PRODUCT_CATALOG_PORT)).toBeDefined();

    await moduleRef.close();
  });
});
