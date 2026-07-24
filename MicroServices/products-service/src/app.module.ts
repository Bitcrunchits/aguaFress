import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from './common/common.module';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { TcpModule } from './tcp/tcp.module';
import envConfig from './common/config/env.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [envConfig] }),
    CommonModule,
    ProductsModule,
    CategoriesModule,
    TcpModule,
  ],
})
export class AppModule {}
