import type { DeliveryStatusChangedEvent } from '@agua/contracts';

export const DELIVERY_EVENT_PUBLISHER = 'DELIVERY_EVENT_PUBLISHER';

export interface DeliveryEventPublisher {
  publishStatusChanged(event: DeliveryStatusChangedEvent): Promise<void>;
}
