import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderJobStatus, type AsyncAcceptedResponse, type CreateOrderJobData } from '@agua/contracts';
import { createHash } from 'node:crypto';
import { ORDERS_CREATE_QUEUE, type OrdersCreateQueuePort } from './orders-queue.provider';

export interface EnqueueOrderCreateInput {
  readonly clienteId: string;
  readonly vendedorId?: string;
  readonly idempotencyKey: string;
  readonly body: Record<string, unknown>;
  readonly requestId: string;
}

export function buildOrdersCreateJobId(clienteId: string, idempotencyKey: string): string {
  return `orders.create:${clienteId}:${idempotencyKey}`;
}

export function buildOrdersCreateTrackingId(clienteId: string, idempotencyKey: string): string {
  const digest = createHash('md5')
    .update(`${clienteId}:${idempotencyKey}`)
    .digest('hex');

  // Format as a standard UUID shape: 8-4-4-4-12.
  return `${digest.slice(0, 8)}-${digest.slice(8, 12)}-${digest.slice(12, 16)}-${digest.slice(16, 20)}-${digest.slice(20)}`;
}

@Injectable()
export class OrdersCreateQueueService {
  private readonly attempts: number;
  private readonly backoffMs: number;
  private readonly removeOnComplete: number;

  constructor(
    @Inject(ORDERS_CREATE_QUEUE) private readonly queue: OrdersCreateQueuePort<CreateOrderJobData>,
    configService: ConfigService,
  ) {
    this.attempts = configService.get<number>('ORDERS_CREATE_QUEUE_ATTEMPTS', 3);
    this.backoffMs = configService.get<number>('ORDERS_CREATE_QUEUE_BACKOFF_MS', 1000);
    this.removeOnComplete = configService.get<number>('ORDERS_CREATE_QUEUE_REMOVE_ON_COMPLETE', 1000);
  }

  async enqueue(input: EnqueueOrderCreateInput): Promise<AsyncAcceptedResponse> {
    const jobId = buildOrdersCreateJobId(input.clienteId, input.idempotencyKey);
    const trackingId = buildOrdersCreateTrackingId(input.clienteId, input.idempotencyKey);
    const acceptedAt = new Date().toISOString();

    await this.queue.add('orders.create', {
      jobId,
      trackingId,
      clienteId: input.clienteId,
      vendedorId: input.vendedorId,
      idempotencyKey: input.idempotencyKey,
      requestId: input.requestId,
      body: input.body,
      requestedAt: acceptedAt,
    }, {
      jobId,
      attempts: this.attempts,
      backoff: { type: 'exponential', delay: this.backoffMs },
      removeOnComplete: { count: this.removeOnComplete },
      removeOnFail: false,
    });

    return {
      jobId,
      trackingId,
      status: OrderJobStatus.PENDING,
      statusUrl: `/api/v1/orders/job-status?id=${trackingId}`,
      vendedorId: input.vendedorId,
      acceptedAt,
    };
  }
}
