import { Injectable, Inject, Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';
import type { DeliveryStatusChangedEvent, DeliveryStartedEvent, DeliveryCompletedEvent } from '@agua/contracts';
import { RedisStreams } from '@agua/contracts';
import { REDIS_CLIENT } from '../common/tokens';
import type { DeliveryEventPublisher } from './delivery-event-publisher.port';

@Injectable()
export class RedisDeliveryEventPublisher implements DeliveryEventPublisher {
  private readonly logger = new Logger(RedisDeliveryEventPublisher.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async publishStatusChanged(event: DeliveryStatusChangedEvent): Promise<void> {
    try {
      await this.redis.xadd(
        RedisStreams.DELIVERIES,
        '*',
        'type',
        event.type,
        'deliveryId',
        event.deliveryId,
        'orderId',
        event.orderId,
        'estadoAnterior',
        event.estadoAnterior,
        'estadoNuevo',
        event.estadoNuevo,
        'actorUserId',
        event.actorUserId,
        'timestamp',
        event.timestamp,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish DeliveryStatusChangedEvent for delivery ${event.deliveryId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async publishStarted(event: DeliveryStartedEvent): Promise<void> {
    try {
      await this.redis.xadd(
        RedisStreams.DELIVERIES,
        '*',
        'type',
        event.type,
        'deliveryId',
        event.deliveryId,
        'orderId',
        event.orderId,
        'vendedorId',
        event.vendedorId,
        'clienteId',
        event.clienteId,
        'actorUserId',
        event.actorUserId,
        'timestamp',
        event.timestamp,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish DeliveryStartedEvent for delivery ${event.deliveryId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async publishCompleted(event: DeliveryCompletedEvent): Promise<void> {
    try {
      await this.redis.xadd(
        RedisStreams.DELIVERIES,
        '*',
        'type',
        event.type,
        'deliveryId',
        event.deliveryId,
        'orderId',
        event.orderId,
        'vendedorId',
        event.vendedorId,
        'clienteId',
        event.clienteId,
        'actorUserId',
        event.actorUserId,
        'timestamp',
        event.timestamp,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish DeliveryCompletedEvent for delivery ${event.deliveryId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
}
