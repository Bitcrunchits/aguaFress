import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { ProductsModule } from '../products/products.module';
import { CategoriesModule } from '../categories/categories.module';
import { ProductsTcpController } from './products-tcp.controller';
import { CategoriesTcpController } from './categories-tcp.controller';
import { TcpPayloadAdapter } from './tcp-payload-adapter.service';

@Module({
  imports: [CommonModule, ProductsModule, CategoriesModule],
  controllers: [ProductsTcpController, CategoriesTcpController],
  providers: [TcpPayloadAdapter],
})
export class TcpModule {}
