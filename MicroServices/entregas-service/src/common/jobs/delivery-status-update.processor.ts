import { Inject, Injectable } from '@nestjs/common';
import { $Enums } from '../../generated/prisma';
import { createHash } from 'node:crypto';
import { DeliveryJobStatus } from '@agua/contracts';
import { DeliveryCommandTrackingService } from './delivery-command-tracking.service';
import { DeliveriesService } from '../../deliveries/deliveries.service';
import { classifyDeliveryJobFailure } from './delivery-failure-classifier';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import type { DeliveryCommandJobRecord, CreateDeliveryCommandJobInput } from '../../deliveries/deliveries.repository';

export interface DeliveryUpdateJobData {
  readonly jobId: string;
  readonly trackingId: string;
  readonly deliveryId: string;
  readonly vendedorId: string;
  readonly actorUserId: string;
  readonly idempotencyKey: string;
  readonly estado: $Enums.DeliveryEstado;
  readonly notas?: string | null;
  readonly requestId: string;
  readonly requestedAt: string;
}

export interface ProcessDeliveryJobResult {
  readonly status: DeliveryJobStatus;
  readonly trackingId: string;
  readonly deliveryId: string;
  readonly errorCode?: string;
  readonly errorMessage?: string;
}

function computePayloadFingerprint(jobData: DeliveryUpdateJobData): string {
  return createHash('sha256')
    .update(`${jobData.deliveryId}:${jobData.vendedorId}:${jobData.estado}:${jobData.notas ?? ''}`)
    .digest('hex')
    .slice(0, 16);
}

function getErrorCode(error: Error): string {
  if (error instanceof NotFoundException) return 'DELIVERY_NOT_FOUND';
  if (error instanceof BadRequestException) return 'BAD_REQUEST';
  if (error instanceof ForbiddenException) return 'FORBIDDEN';
  return 'INTERNAL_ERROR';
}

@Injectable()
export class DeliveryStatusUpdateProcessor {
  private readonly maxAttempts = 3;

  constructor(
    private readonly trackingService: DeliveryCommandTrackingService,
    private readonly deliveriesService: DeliveriesService,
  ) {}

  async process(jobData: DeliveryUpdateJobData): Promise<ProcessDeliveryJobResult> {
    // 1. Register pending job tracking record
    let record: DeliveryCommandJobRecord;
    try {
      record = await this.trackingService.registerPending(this.buildCreateInput(jobData));
    } catch (error: unknown) {
      // Duplicate key — return existing result
      if (error instanceof Error && error.message === 'DUPLICATE_KEY') {
        const existing = await this.trackingService.findByTrackingId(jobData.trackingId);
        if (existing !== null) {
          return this.toResult(existing);
        }
      }
      throw error;
    }

    try {
      // 2. Transition PENDING → PROCESSING
      record = await this.trackingService.transitionStatus(
        record.id,
        $Enums.DeliveryJobStatus.PENDING,
        $Enums.DeliveryJobStatus.PROCESSING,
      );

      // 3. Execute the business logic
      await this.deliveriesService.updateStatus(
        jobData.deliveryId,
        { estado: jobData.estado as never, notas: jobData.notas ?? undefined },
        jobData.vendedorId,
        jobData.actorUserId,
      );

      // 4. Transition PROCESSING → COMPLETED
      record = await this.trackingService.transitionStatus(
        record.id,
        $Enums.DeliveryJobStatus.PROCESSING,
        $Enums.DeliveryJobStatus.COMPLETED,
      );

      return this.toResult(record);
    } catch (error: unknown) {
      if (error instanceof Error) {
        const errorCode = getErrorCode(error);
        const classification = classifyDeliveryJobFailure({
          error,
          errorCode,
          attempts: record.attempts + 1,
          maxAttempts: this.maxAttempts,
        });

        record = await this.trackingService.transitionStatus(
          record.id,
          $Enums.DeliveryJobStatus.PROCESSING,
          classification.status,
          {
            errorCode: classification.errorCode,
            errorMessage: classification.errorMessage,
            attempts: record.attempts + 1,
          },
        );

        return this.toResult(record);
      }
      throw error;
    }
  }

  private buildCreateInput(jobData: DeliveryUpdateJobData): CreateDeliveryCommandJobInput {
    return {
      trackingId: jobData.trackingId,
      jobId: jobData.jobId,
      deliveryId: jobData.deliveryId,
      vendedorId: jobData.vendedorId,
      actorUserId: jobData.actorUserId,
      estado: jobData.estado,
      notas: jobData.notas ?? null,
      idempotencyKey: jobData.idempotencyKey,
      payloadFingerprint: computePayloadFingerprint(jobData),
    };
  }

  private toResult(record: DeliveryCommandJobRecord): ProcessDeliveryJobResult {
    return {
      status: record.status as unknown as DeliveryJobStatus,
      trackingId: record.trackingId,
      deliveryId: record.deliveryId,
      errorCode: record.errorCode ?? undefined,
      errorMessage: record.errorMessage ?? undefined,
    };
  }
}
