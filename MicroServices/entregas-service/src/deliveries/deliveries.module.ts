// Módulo deliveries — Repartos, estados, asignación
import { Module } from '@nestjs/common';
import { DeliveriesController } from './deliveries.controller';
import { DeliveriesService } from './deliveries.service';

@Module({
  controllers: [DeliveriesController],
  providers: [DeliveriesService],
})
export class DeliveriesModule {}