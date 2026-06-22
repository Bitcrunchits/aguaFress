import { Module } from '@nestjs/common';
import { DeliveriesModule } from './deliveries/deliveries.module';
import { CommonModule } from './common/common.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [DeliveriesModule, CommonModule, HealthModule],
})
export class AppModule {}
