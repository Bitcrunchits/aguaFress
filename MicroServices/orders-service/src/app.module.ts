import { Module } from '@nestjs/common';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { CommonModule } from './common/common.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [CartModule, OrdersModule, CommonModule, HealthModule],
})
export class AppModule {}
