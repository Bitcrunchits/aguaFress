import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';
import type { CreateOrderJobData } from '@agua/contracts';
import { getOrdersCreateQueueAttempts, getOrdersCreateQueueName, getOrdersCreateWorkerConcurrency, getRedisUrl } from '../../common/config/env.config';
import { OrderCreateJobProcessor } from './order-create-job.processor';

@Injectable()
export class OrdersCreateWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrdersCreateWorker.name);
  private worker: Worker<CreateOrderJobData> | null = null;
  private connection: IORedis | null = null;

  constructor(private readonly processor: OrderCreateJobProcessor) {}

  onModuleInit(): void {
    this.connection = new IORedis(getRedisUrl(), { maxRetriesPerRequest: null });
    this.worker = new Worker<CreateOrderJobData>(
      getOrdersCreateQueueName(),
      (job) => this.processJob(job),
      { connection: this.connection, concurrency: getOrdersCreateWorkerConcurrency() },
    );
    this.worker.on('failed', (job, error) => {
      this.logger.warn(`orders.create job ${job?.id ?? 'unknown'} failed: ${error.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.connection?.quit();
  }

  private processJob(job: Job<CreateOrderJobData>): Promise<unknown> {
    const configuredAttempts = typeof job.opts.attempts === 'number' && job.opts.attempts > 0 ? job.opts.attempts : getOrdersCreateQueueAttempts();
    return this.processor.process(job.data, { attemptsMade: job.attemptsMade, maxAttempts: configuredAttempts });
  }
}
