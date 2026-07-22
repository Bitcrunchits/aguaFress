import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { TcpModule } from '../tcp/tcp.module';
import { OrdersController } from './orders.controller';
import { OrderCommandTrackingService } from './jobs/order-command-tracking.service';
import { OrderCreateJobProcessor } from './jobs/order-create-job.processor';
import { OrdersCreateWorker } from './jobs/orders-create.worker';
import { PrismaOrdersRepository } from './orders.repository';
import { OrdersService } from './orders.service';

@Module({
  imports: [CommonModule, TcpModule],
  controllers: [OrdersController],
  providers: [PrismaOrdersRepository, OrdersService, OrderCommandTrackingService, OrderCreateJobProcessor, OrdersCreateWorker],
})
export class OrdersModule {}
