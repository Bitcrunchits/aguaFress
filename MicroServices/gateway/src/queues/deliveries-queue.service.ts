import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeliveryJobStatus, type UpdateDeliveryStatusJobData } from '@agua/contracts';
import { createHash } from 'node:crypto';
import { DELIVERIES_UPDATE_STATUS_QUEUE, type DeliveriesQueuePort } from './deliveries-queue.provider';

export interface EnqueueDeliveryUpdateInput {
  readonly deliveryId: string;
  readonly vendedorId: string;
  readonly actorUserId: string;
  readonly estado: UpdateDeliveryStatusJobData['estado'];
  readonly notas?: string;
  readonly idempotencyKey: string;
  readonly requestId: string;
}

export interface EnqueueDeliveryUpdateResponse {
  jobId: string;
  trackingId: string;
  status: DeliveryJobStatus;
  statusUrl: string;
  acceptedAt: string;
}

export function buildDeliveryUpdateJobId(deliveryId: string, idempotencyKey: string): string {
  return `deliveries.update_status:${deliveryId}:${idempotencyKey}`;
}

export function buildDeliveryUpdateTrackingId(deliveryId: string, idempotencyKey: string): string {
  const digest = createHash('md5')
    .update(`${deliveryId}:${idempotencyKey}`)
    .digest('hex');

  return `${digest.slice(0, 8)}-${digest.slice(8, 12)}-${digest.slice(12, 16)}-${digest.slice(16, 20)}-${digest.slice(20)}`;
}

@Injectable()
export class DeliveriesQueueService {
  private readonly attempts: number;
  private readonly backoffMs: number;
  private readonly removeOnComplete: number;

  constructor(
    @Inject(DELIVERIES_UPDATE_STATUS_QUEUE) private readonly queue: DeliveriesQueuePort<UpdateDeliveryStatusJobData>,
    configService: ConfigService,
  ) {
    this.attempts = configService.get<number>('DELIVERIES_QUEUE_ATTEMPTS', 3);
    this.backoffMs = configService.get<number>('DELIVERIES_QUEUE_BACKOFF_MS', 1000);
    this.removeOnComplete = configService.get<number>('DELIVERIES_QUEUE_REMOVE_ON_COMPLETE', 1000);
  }

  async enqueue(input: EnqueueDeliveryUpdateInput): Promise<EnqueueDeliveryUpdateResponse> {
    const jobId = buildDeliveryUpdateJobId(input.deliveryId, input.idempotencyKey);
    const trackingId = buildDeliveryUpdateTrackingId(input.deliveryId, input.idempotencyKey);
    const acceptedAt = new Date().toISOString();

    const jobData: UpdateDeliveryStatusJobData & { jobId: string; trackingId: string; requestedAt: string } = {
      jobId,
      trackingId,
      deliveryId: input.deliveryId,
      vendedorId: input.vendedorId,
      actorUserId: input.actorUserId,
      idempotencyKey: input.idempotencyKey,
      estado: input.estado,
      notas: input.notas,
      requestId: input.requestId,
      requestedAt: acceptedAt,
    };

    await this.queue.add('deliveries.update_status', jobData, {
      jobId,
      attempts: this.attempts,
      backoff: { type: 'exponential', delay: this.backoffMs },
      removeOnComplete: { count: this.removeOnComplete },
      removeOnFail: false,
    });

    return {
      jobId,
      trackingId,
      status: DeliveryJobStatus.PENDING,
      statusUrl: `/api/v1/deliveries/job-status?id=${trackingId}`,
      acceptedAt,
    };
  }
}
