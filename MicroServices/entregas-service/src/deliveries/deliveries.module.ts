// Módulo deliveries — Repartos, estados, asignación
import { Module } from '@nestjs/common';
import { DeliveriesService } from './deliveries.service';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule],
  providers: [DeliveriesService],
  exports: [DeliveriesService],
})
export class DeliveriesModule {}