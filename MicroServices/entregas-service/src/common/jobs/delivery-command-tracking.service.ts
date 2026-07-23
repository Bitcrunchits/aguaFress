import { Inject, Injectable } from '@nestjs/common';
import { $Enums } from '../../generated/prisma';
import {
  DELIVERY_REPOSITORY,
  type CreateDeliveryCommandJobInput,
  type DeliveryCommandJobRecord,
  type UpdateDeliveryCommandJobStatusInput,
  type DeliveriesRepository,
} from '../../deliveries/deliveries.repository';

@Injectable()
export class DeliveryCommandTrackingService {
  constructor(
    @Inject(DELIVERY_REPOSITORY) private readonly repository: DeliveriesRepository,
  ) {}

  async registerPending(input: CreateDeliveryCommandJobInput): Promise<DeliveryCommandJobRecord> {
    try {
      return await this.repository.createDeliveryCommandJob(input);
    } catch (error: unknown) {
      if (isPrismaUniqueConstraintError(error)) {
        throw new Error('DUPLICATE_KEY');
      }
      throw error;
    }
  }

  async transitionStatus(
    id: string,
    _from: $Enums.DeliveryJobStatus,
    to: $Enums.DeliveryJobStatus,
    extra?: Partial<UpdateDeliveryCommandJobStatusInput>,
  ): Promise<DeliveryCommandJobRecord> {
    return this.repository.updateDeliveryCommandJobStatus(id, {
      status: to,
      estadoAnterior: extra?.estadoAnterior,
      errorCode: extra?.errorCode,
      errorMessage: extra?.errorMessage,
      attempts: extra?.attempts,
    });
  }

  async findByTrackingId(trackingId: string): Promise<DeliveryCommandJobRecord | null> {
    return this.repository.findDeliveryCommandByTrackingId(trackingId);
  }
}

function isPrismaUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as Record<string, unknown>).code === 'P2002'
  );
}
