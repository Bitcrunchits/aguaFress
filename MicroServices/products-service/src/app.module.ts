import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CommonModule } from './common/common.module';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { TcpModule } from './tcp/tcp.module';
import { UploadModule } from './common/upload/upload.module';
import envConfig from './common/config/env.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [envConfig] }),
    EventEmitterModule.forRoot(),
    CommonModule,
    ProductsModule,
    CategoriesModule,
    UploadModule,
    TcpModule,
  ],
})
export class AppModule {}
