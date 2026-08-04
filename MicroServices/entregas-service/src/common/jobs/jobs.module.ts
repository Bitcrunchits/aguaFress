import { Module } from '@nestjs/common';
import { CommonModule } from '../common.module';
import { DeliveriesModule } from '../../deliveries/deliveries.module';
import { DeliveryStatusUpdateWorker } from './delivery-status-update.worker';
import { DeliveryStatusUpdateProcessor } from './delivery-status-update.processor';
import { DeliveryCommandTrackingService } from './delivery-command-tracking.service';

@Module({
  imports: [CommonModule, DeliveriesModule],
  providers: [
    DeliveryStatusUpdateWorker,
    DeliveryStatusUpdateProcessor,
    DeliveryCommandTrackingService,
  ],
  exports: [DeliveryCommandTrackingService],
})
export class JobsModule {}
