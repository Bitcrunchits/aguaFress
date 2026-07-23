import { Module } from '@nestjs/common';
import { BullMqDeliveriesQueue, deliveriesQueueProvider } from './deliveries-queue.provider';
import { DeliveriesQueueService } from './deliveries-queue.service';

@Module({
  providers: [BullMqDeliveriesQueue, deliveriesQueueProvider, DeliveriesQueueService],
  exports: [DeliveriesQueueService],
})
export class DeliveriesQueueModule {}
