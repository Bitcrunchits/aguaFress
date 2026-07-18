import { Inject, Injectable } from '@nestjs/common';
import { OrderJobStatus, UserRole, type CreateOrderJobData, type OrderJobStatusResponse } from '@agua/contracts';
import { UnrecoverableError } from 'bullmq';
import { parseCreateOrderRequest } from '../orders.dto';
import { OrdersService } from '../orders.service';
import { classifyOrderJobFailure } from './order-failure-classifier';
import { OrderCommandTrackingService } from './order-command-tracking.service';

export interface OrderCreateJobAttemptContext {
  readonly attemptsMade: number;
  readonly maxAttempts: number;
}

type OrderCreateJobTrackingService = Pick<OrderCommandTrackingService, 'registerPending' | 'transitionStatus'>;
type OrderCreateJobOrdersService = Pick<OrdersService, 'create'>;

@Injectable()
export class OrderCreateJobProcessor {
  constructor(
    @Inject(OrderCommandTrackingService)
    private readonly trackingService: OrderCreateJobTrackingService,
    @Inject(OrdersService) private readonly ordersService: OrderCreateJobOrdersService,
  ) {}

  async process(data: CreateOrderJobData, context: OrderCreateJobAttemptContext): Promise<OrderJobStatusResponse> {
    const currentAttempt = context.attemptsMade + 1;

    // First attempt: register the pending tracking record (idempotent, race-safe)
    if (context.attemptsMade === 0) {
      await this.trackingService.registerPending(data);
    }

    const previousStatus = context.attemptsMade === 0 ? OrderJobStatus.PENDING : OrderJobStatus.RETRYING;

    await this.trackingService.transitionStatus({
      trackingId: data.trackingId,
      previousStatus,
      nextStatus: OrderJobStatus.PROCESSING,
      attempts: currentAttempt,
    });

    try {
      const order = await this.ordersService.create(
        { userId: data.clienteId, email: '', role: UserRole.CLIENTE },
        parseCreateOrderRequest(data.body),
      );

      return this.trackingService.transitionStatus({
        trackingId: data.trackingId,
        previousStatus: OrderJobStatus.PROCESSING,
        nextStatus: OrderJobStatus.COMPLETED,
        orderId: order.id,
        attempts: currentAttempt,
      });
    } catch (error) {
      return this.handleFailure(data.trackingId, error, currentAttempt, context.maxAttempts);
    }
  }

  private async handleFailure(trackingId: string, error: unknown, currentAttempt: number, maxAttempts: number): Promise<OrderJobStatusResponse> {
    const classification = classifyOrderJobFailure(error, { currentAttempt, maxAttempts });
    const nextStatus = resolveFailureStatus(classification.retryable, classification.exhausted);

    await this.trackingService.transitionStatus({
      trackingId,
      previousStatus: OrderJobStatus.PROCESSING,
      nextStatus,
      attempts: currentAttempt,
      errorCode: classification.errorCode,
      errorMessage: classification.errorMessage,
    });

    if (nextStatus === OrderJobStatus.RETRYING) {
      throw error;
    }

    throw new UnrecoverableError(classification.errorCode);
  }
}

function resolveFailureStatus(retryable: boolean, exhausted: boolean): OrderJobStatus.FAILED | OrderJobStatus.RETRYING | OrderJobStatus.DEAD_LETTER {
  if (!retryable) return OrderJobStatus.FAILED;
  return exhausted ? OrderJobStatus.DEAD_LETTER : OrderJobStatus.RETRYING;
}
