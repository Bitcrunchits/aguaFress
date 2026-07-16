import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { TcpModule } from '../tcp/tcp.module';
import { OrdersController } from './orders.controller';
import { PrismaOrdersRepository } from './orders.repository';
import { OrdersService } from './orders.service';

@Module({
  imports: [CommonModule, TcpModule],
  controllers: [OrdersController],
  providers: [PrismaOrdersRepository, OrdersService],
})
export class OrdersModule {}
