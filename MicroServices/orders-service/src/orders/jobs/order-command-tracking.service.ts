import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { OrderJobStatus, type CreateOrderJobData, type OrderJobStatusResponse } from '@agua/contracts';
import type { Prisma } from '../../generated/prisma';
import { PrismaOrdersRepository, type OrderCommandJobRecord, type OrdersRepository } from '../orders.repository';

type OrderCommandTrackingRepository = Pick<OrdersRepository, 'createOrderCommandJob' | 'findOrderCommandByIdempotency' | 'findOrderCommandByTrackingId' | 'updateOrderCommandJobStatus'>;

export interface OrderCommandTransitionInput {
  readonly trackingId: string;
  readonly previousStatus: OrderJobStatus;
  readonly nextStatus: OrderJobStatus;
  readonly orderId?: string;
  readonly errorCode?: string;
  readonly errorMessage?: string;
  readonly attempts?: number;
}

@Injectable()
export class OrderCommandTrackingService {
  constructor(@Inject(PrismaOrdersRepository) private readonly ordersRepository: OrderCommandTrackingRepository) {}

  async registerPending(data: CreateOrderJobData): Promise<OrderJobStatusResponse> {
    const payloadHash = hashPayload(data.body);
    const existing = await this.ordersRepository.findOrderCommandByIdempotency(data.clienteId, data.idempotencyKey);

    if (existing !== null) {
      if (existing.payloadHash !== payloadHash) {
        throw new ConflictException('Idempotency key was already used with a different payload');
      }

      return toResponse(existing);
    }

    const job = await this.createOrReloadPending(data, payloadHash);

    return toResponse(job);
  }

  async findByTrackingId(trackingId: string): Promise<OrderJobStatusResponse | null> {
    const job = await this.ordersRepository.findOrderCommandByTrackingId(trackingId);
    return job === null ? null : toResponse(job);
  }

  async transitionStatus(input: OrderCommandTransitionInput): Promise<OrderJobStatusResponse> {
    const job = await this.ordersRepository.updateOrderCommandJobStatus(input);

    if (job === null) {
      throw new ConflictException('Order command status changed before update');
    }

    return toResponse(job);
  }

  private async createOrReloadPending(data: CreateOrderJobData, payloadHash: string): Promise<OrderCommandJobRecord> {
    try {
      return await this.ordersRepository.createOrderCommandJob({
        trackingId: data.trackingId,
        jobId: data.jobId,
        clienteId: data.clienteId,
        idempotencyKey: data.idempotencyKey,
        payloadHash,
        payloadBody: toInputJsonObject(data.body),
        status: OrderJobStatus.PENDING,
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }

      const existing = await this.ordersRepository.findOrderCommandByIdempotency(data.clienteId, data.idempotencyKey);
      if (existing === null) {
        throw error;
      }

      if (existing.payloadHash !== payloadHash) {
        throw new ConflictException('Idempotency key was already used with a different payload');
      }

      return existing;
    }
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return isPlainRecord(error) && error.code === 'P2002';
}

function toResponse(job: OrderCommandJobRecord): OrderJobStatusResponse {
  return {
    clienteId: job.clienteId,
    idempotencyKey: job.idempotencyKey,
    jobId: job.jobId,
    trackingId: job.trackingId,
    status: job.status,
    orderId: job.orderId ?? undefined,
    errorCode: job.errorCode ?? undefined,
    errorMessage: job.errorMessage ?? undefined,
    attempts: job.attempts,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}

function hashPayload(payload: Record<string, unknown>): string {
  return createHash('sha256').update(stableStringify(payload)).digest('hex');
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (isPlainRecord(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toInputJsonObject(payload: Record<string, unknown>): Prisma.InputJsonObject {
  return Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, toInputJsonField(value)]));
}

function toInputJsonField(value: unknown): Prisma.InputJsonValue | null {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map(toInputJsonField) as Prisma.InputJsonArray;
  if (isPlainRecord(value)) return toInputJsonObject(value);
  return null;
}
