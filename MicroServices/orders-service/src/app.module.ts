import { Module } from '@nestjs/common';
import { CartModule } from './cart/cart.module';
import { CommonModule } from './common/common.module';
import { OrdersModule } from './orders/orders.module';
import { TcpModule } from './tcp/tcp.module';

@Module({
  imports: [CommonModule, CartModule, OrdersModule, TcpModule],
})
export class AppModule {}
