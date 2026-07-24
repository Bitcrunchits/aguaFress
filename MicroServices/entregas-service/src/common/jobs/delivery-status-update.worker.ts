import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { getRedisUrl, getDeliveriesQueueName, getDeliveriesWorkerConcurrency } from '../config/env.config';
import { DeliveryStatusUpdateProcessor, type DeliveryUpdateJobData, type ProcessDeliveryJobResult } from './delivery-status-update.processor';

@Injectable()
export class DeliveryStatusUpdateWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DeliveryStatusUpdateWorker.name);
  private worker: Worker | null = null;
  private connection: IORedis | null = null;

  constructor(private readonly processor: DeliveryStatusUpdateProcessor) {}

  async onModuleInit(): Promise<void> {
    const redisUrl = getRedisUrl();
    const queueName = getDeliveriesQueueName();
    const concurrency = getDeliveriesWorkerConcurrency();

    this.connection = new IORedis(redisUrl, { maxRetriesPerRequest: null, lazyConnect: true });

    this.worker = new Worker<DeliveryUpdateJobData, ProcessDeliveryJobResult>(
      queueName,
      async (job) => this.processJob(job),
      {
        connection: this.connection,
        concurrency,
        // Allow manual removal on fail for tracking
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      },
    );

    this.worker.on('failed', (job, error) => {
      this.logger.error(
        `Job ${job?.id} failed after ${job?.attemptsMade} attempts: ${error.message}`,
        error.stack,
      );
    });

    this.worker.on('error', (error) => {
      this.logger.error(`Worker error: ${error.message}`, error.stack);
    });

    this.logger.log(`Delivery status update worker started (queue: ${queueName}, concurrency: ${concurrency})`);
  }

  async processJob(job: { id?: string; data: DeliveryUpdateJobData; attemptsMade?: number }): Promise<ProcessDeliveryJobResult> {
    this.logger.log(`Processing job ${job.id} for delivery ${job.data.deliveryId}`);
    return this.processor.process(job.data);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker !== null) {
      await this.worker.close();
    }
    if (this.connection !== null) {
      this.connection.disconnect();
    }
  }
}
