import { Module } from '@nestjs/common';
import { BullMqOrdersCreateQueue, ordersCreateQueueProvider } from './orders-queue.provider';
import { OrdersCreateQueueService } from './orders-create-queue.service';

@Module({
  providers: [BullMqOrdersCreateQueue, ordersCreateQueueProvider, OrdersCreateQueueService],
  exports: [OrdersCreateQueueService],
})
export class OrdersQueueModule {}
