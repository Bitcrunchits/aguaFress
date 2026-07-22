import {
  ActivityLogAction,
  ActivityLogResult,
  ActivityLogSource,
  type AguaFressEvent,
  type CreateActivityLogRequestDTO,
} from '@agua/contracts';

export function mapEventToActivityLogCreate(event: unknown, streamName: string, eventId: string): CreateActivityLogRequestDTO | undefined {
  if (!isAguaFressEvent(event)) return undefined;

  switch (event.type) {
    case 'UserCreated':
      return {
        source: ActivityLogSource.USUARIO_SERVICE,
        action: ActivityLogAction.USER_CREATED,
        actor: { userId: event.userId, email: event.email, role: event.role },
        entity: { type: 'USER', id: event.userId },
        result: ActivityLogResult.SUCCESS,
        summary: `User ${event.email} was created`,
        metadata: baseMetadata(event.type, streamName),
        createdAt: event.timestamp,
        eventId,
      };
    case 'VendedorStatusChanged':
      return statusChange(ActivityLogSource.USUARIO_SERVICE, ActivityLogAction.VENDEDOR_STATUS_CHANGED, 'VENDEDOR', event.vendedorId, event.timestamp, eventId, streamName, event.type);
    case 'CarteraClienteAdded':
      return entityEvent(ActivityLogSource.USUARIO_SERVICE, ActivityLogAction.CARTERA_CLIENTE_ADDED, 'CLIENTE', event.clienteId, event.vendedorId, event.timestamp, eventId, streamName, event.type);
    case 'ProductUpdated':
      return entityEvent(ActivityLogSource.PRODUCTS_SERVICE, ActivityLogAction.PRODUCT_UPDATED, 'PRODUCT', event.productId, event.vendedorId, event.timestamp, eventId, streamName, event.type);
    case 'ProductDeleted':
      return entityEvent(ActivityLogSource.PRODUCTS_SERVICE, ActivityLogAction.PRODUCT_DELETED, 'PRODUCT', event.productId, event.vendedorId, event.timestamp, eventId, streamName, event.type);
    case 'OrderCreated':
      return entityEvent(ActivityLogSource.ORDERS_SERVICE, ActivityLogAction.ORDER_CREATED, 'ORDER', event.orderId, event.vendedorId, event.timestamp, eventId, streamName, event.type);
    case 'OrderStatusChanged':
      return statusChange(ActivityLogSource.ORDERS_SERVICE, ActivityLogAction.ORDER_STATUS_CHANGED, 'ORDER', event.orderId, event.timestamp, eventId, streamName, event.type);
    case 'DeliveryStarted':
      return entityEvent(ActivityLogSource.ENTREGAS_SERVICE, ActivityLogAction.DELIVERY_STARTED, 'DELIVERY', event.deliveryId, event.vendedorId, event.timestamp, eventId, streamName, event.type);
    case 'DeliveryCompleted':
      return entityEvent(ActivityLogSource.ENTREGAS_SERVICE, ActivityLogAction.DELIVERY_COMPLETED, 'DELIVERY', event.deliveryId, event.vendedorId, event.timestamp, eventId, streamName, event.type);
    case 'DeliveryStatusChanged':
      return statusChange(ActivityLogSource.ENTREGAS_SERVICE, ActivityLogAction.DELIVERY_STATUS_CHANGED, 'DELIVERY', event.deliveryId, event.timestamp, eventId, streamName, event.type);
    default:
      return undefined;
  }
}

function entityEvent(source: ActivityLogSource, action: ActivityLogAction, entityType: string, entityId: string, actorId: string, createdAt: string, eventId: string, streamName: string, eventType: string): CreateActivityLogRequestDTO {
  return {
    source,
    action,
    actor: { userId: actorId },
    entity: { type: entityType, id: entityId },
    result: ActivityLogResult.SUCCESS,
    summary: `${eventType} processed for ${entityType} ${entityId}`,
    metadata: baseMetadata(eventType, streamName),
    createdAt,
    eventId,
  };
}

function statusChange(source: ActivityLogSource, action: ActivityLogAction, entityType: string, entityId: string, createdAt: string, eventId: string, streamName: string, eventType: string): CreateActivityLogRequestDTO {
  return {
    source,
    action,
    entity: { type: entityType, id: entityId },
    result: ActivityLogResult.SUCCESS,
    summary: `${eventType} processed for ${entityType} ${entityId}`,
    metadata: baseMetadata(eventType, streamName),
    createdAt,
    eventId,
  };
}

function baseMetadata(eventType: string, streamName: string): Record<string, unknown> {
  return { eventType, streamName };
}

function isAguaFressEvent(value: unknown): value is AguaFressEvent {
  return typeof value === 'object' && value !== null && 'type' in value && 'timestamp' in value && typeof value.timestamp === 'string';
}
