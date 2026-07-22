import type { DeliveryStatusChangedEvent, DeliveryStartedEvent, DeliveryCompletedEvent } from '@agua/contracts';

export const DELIVERY_EVENT_PUBLISHER = 'DELIVERY_EVENT_PUBLISHER';

export interface DeliveryEventPublisher {
  publishStatusChanged(event: DeliveryStatusChangedEvent): Promise<void>;
  publishStarted(event: DeliveryStartedEvent): Promise<void>;
  publishCompleted(event: DeliveryCompletedEvent): Promise<void>;
}
