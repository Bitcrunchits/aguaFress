// Módulo products — CRUD de productos

import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';

@Module({
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
