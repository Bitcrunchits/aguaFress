import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { Injectable, type OnModuleDestroy } from '@nestjs/common';

export const DELIVERIES_UPDATE_STATUS_QUEUE = Symbol('DELIVERIES_UPDATE_STATUS_QUEUE');

export interface DeliveriesQueuePort<TData = unknown> {
  add(name: string, data: TData, options: Parameters<Queue<TData>['add']>[2]): Promise<unknown>;
}

@Injectable()
export class BullMqDeliveriesQueue implements DeliveriesQueuePort, OnModuleDestroy {
  private readonly queue: Queue;
  private readonly connection: IORedis;

  constructor(configService: ConfigService) {
    const redisUrl = configService.get<string>('REDIS_URL', 'redis://localhost:6379');
    const queueName = configService.get<string>('DELIVERIES_QUEUE_NAME', 'deliveries.update_status');
    this.connection = new IORedis(redisUrl, { maxRetriesPerRequest: null, lazyConnect: true });

    this.queue = new Queue(queueName, { connection: this.connection });
  }

  async add(name: string, data: unknown, options: Parameters<Queue['add']>[2]): Promise<unknown> {
    return this.queue.add(name, data, options);
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
    this.connection.disconnect();
  }
}

export const deliveriesQueueProvider = {
  provide: DELIVERIES_UPDATE_STATUS_QUEUE,
  useExisting: BullMqDeliveriesQueue,
};
