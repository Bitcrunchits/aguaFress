import {
  ActivityLogAction,
  ActivityLogResult,
  ActivityLogSource,
  DeliveryEstado,
  MetodoPago,
  OrderEstado,
  UserRole,
  VendedorEstado,
  type AguaFressEvent,
  type CreateActivityLogRequestDTO,
  type UserCreatedEvent,
} from '@agua/contracts';
import { mapEventToActivityLogCreate } from './activity-log-event.mapper';

describe('mapEventToActivityLogCreate', () => {
  it('maps typed domain events into activity-log create requests with stream id dedupe', () => {
    const event: UserCreatedEvent = {
      type: 'UserCreated',
      timestamp: '2026-07-20T12:00:00.000Z',
      userId: 'user-1',
      email: 'user@aguafress.test',
      role: UserRole.CLIENTE,
    };

    expect(mapEventToActivityLogCreate(event, 'auth.events', '1753032000000-0')).toEqual({
      source: ActivityLogSource.USUARIO_SERVICE,
      action: ActivityLogAction.USER_CREATED,
      actor: { userId: 'user-1', email: 'user@aguafress.test', role: UserRole.CLIENTE },
      entity: { type: 'USER', id: 'user-1' },
      result: ActivityLogResult.SUCCESS,
      summary: 'User user@aguafress.test was created',
      metadata: { eventType: 'UserCreated', streamName: 'auth.events' },
      createdAt: '2026-07-20T12:00:00.000Z',
      eventId: '1753032000000-0',
    });
  });

  it('returns undefined for unsupported event types so consumers can acknowledge safely', () => {
    expect(mapEventToActivityLogCreate({ type: 'UnsupportedEvent', timestamp: '2026-07-20T12:00:00.000Z' }, 'unknown.events', '1-0')).toBeUndefined();
  });

  it.each<MapperBranchCase>([
    {
      name: 'VendedorStatusChanged',
      streamName: 'user.events',
      event: { type: 'VendedorStatusChanged', timestamp: '2026-07-20T12:00:00.000Z', vendedorId: 'vendedor-1', estadoAnterior: VendedorEstado.PENDIENTE, estadoNuevo: VendedorEstado.ACTIVO },
      expected: statusChangeExpected(ActivityLogSource.USUARIO_SERVICE, ActivityLogAction.VENDEDOR_STATUS_CHANGED, 'VENDEDOR', 'vendedor-1', 'VendedorStatusChanged', 'user.events'),
    },
    {
      name: 'CarteraClienteAdded',
      streamName: 'user.events',
      event: { type: 'CarteraClienteAdded', timestamp: '2026-07-20T12:00:00.000Z', vendedorId: 'vendedor-1', clienteId: 'cliente-1' },
      expected: entityExpected(ActivityLogSource.USUARIO_SERVICE, ActivityLogAction.CARTERA_CLIENTE_ADDED, 'CLIENTE', 'cliente-1', 'vendedor-1', 'CarteraClienteAdded', 'user.events'),
    },
    {
      name: 'ProductUpdated',
      streamName: 'products.events',
      event: { type: 'ProductUpdated', timestamp: '2026-07-20T12:00:00.000Z', productId: 'product-1', vendedorId: 'vendedor-1', nombre: 'Agua 20L', precioFinal: 1200, stock: 7 },
      expected: entityExpected(ActivityLogSource.PRODUCTS_SERVICE, ActivityLogAction.PRODUCT_UPDATED, 'PRODUCT', 'product-1', 'vendedor-1', 'ProductUpdated', 'products.events'),
    },
    {
      name: 'ProductDeleted',
      streamName: 'products.events',
      event: { type: 'ProductDeleted', timestamp: '2026-07-20T12:00:00.000Z', productId: 'product-2', vendedorId: 'vendedor-2' },
      expected: entityExpected(ActivityLogSource.PRODUCTS_SERVICE, ActivityLogAction.PRODUCT_DELETED, 'PRODUCT', 'product-2', 'vendedor-2', 'ProductDeleted', 'products.events'),
    },
    {
      name: 'OrderCreated',
      streamName: 'orders.events',
      event: { type: 'OrderCreated', timestamp: '2026-07-20T12:00:00.000Z', orderId: 'order-1', pedidoNumero: 'P-1', vendedorId: 'vendedor-3', clienteId: 'cliente-2', total: 1500, estado: OrderEstado.PENDIENTE, metodoPago: MetodoPago.CONTRA_ENTREGA, items: [{ productId: 'product-1', cantidad: 1, precioUnitario: 1500 }] },
      expected: entityExpected(ActivityLogSource.ORDERS_SERVICE, ActivityLogAction.ORDER_CREATED, 'ORDER', 'order-1', 'vendedor-3', 'OrderCreated', 'orders.events'),
    },
    {
      name: 'OrderStatusChanged',
      streamName: 'orders.events',
      event: { type: 'OrderStatusChanged', timestamp: '2026-07-20T12:00:00.000Z', orderId: 'order-2', vendedorId: 'vendedor-4', estadoAnterior: OrderEstado.PENDIENTE, estadoNuevo: OrderEstado.CONFIRMADO },
      expected: statusChangeExpected(ActivityLogSource.ORDERS_SERVICE, ActivityLogAction.ORDER_STATUS_CHANGED, 'ORDER', 'order-2', 'OrderStatusChanged', 'orders.events'),
    },
    {
      name: 'DeliveryStarted',
      streamName: 'deliveries.events',
      event: { type: 'DeliveryStarted', timestamp: '2026-07-20T12:00:00.000Z', deliveryId: 'delivery-1', orderId: 'order-3', vendedorId: 'vendedor-5' },
      expected: entityExpected(ActivityLogSource.ENTREGAS_SERVICE, ActivityLogAction.DELIVERY_STARTED, 'DELIVERY', 'delivery-1', 'vendedor-5', 'DeliveryStarted', 'deliveries.events'),
    },
    {
      name: 'DeliveryCompleted',
      streamName: 'deliveries.events',
      event: { type: 'DeliveryCompleted', timestamp: '2026-07-20T12:00:00.000Z', deliveryId: 'delivery-2', orderId: 'order-4', vendedorId: 'vendedor-6' },
      expected: entityExpected(ActivityLogSource.ENTREGAS_SERVICE, ActivityLogAction.DELIVERY_COMPLETED, 'DELIVERY', 'delivery-2', 'vendedor-6', 'DeliveryCompleted', 'deliveries.events'),
    },
    {
      name: 'DeliveryStatusChanged',
      streamName: 'deliveries.events',
      event: { type: 'DeliveryStatusChanged', timestamp: '2026-07-20T12:00:00.000Z', deliveryId: 'delivery-3', orderId: 'order-5', estadoAnterior: DeliveryEstado.PENDIENTE, estadoNuevo: DeliveryEstado.EN_CAMINO },
      expected: statusChangeExpected(ActivityLogSource.ENTREGAS_SERVICE, ActivityLogAction.DELIVERY_STATUS_CHANGED, 'DELIVERY', 'delivery-3', 'DeliveryStatusChanged', 'deliveries.events'),
    },
  ])('maps $name events through the supported Redis stream branch', ({ event, streamName, expected }) => {
    expect(mapEventToActivityLogCreate(event, streamName, '1753032000000-1')).toEqual(expected);
  });
});

interface MapperBranchCase {
  readonly name: string;
  readonly streamName: string;
  readonly event: AguaFressEvent;
  readonly expected: CreateActivityLogRequestDTO;
}

function entityExpected(source: ActivityLogSource, action: ActivityLogAction, entityType: string, entityId: string, actorId: string, eventType: string, streamName: string): CreateActivityLogRequestDTO {
  return {
    source,
    action,
    actor: { userId: actorId },
    entity: { type: entityType, id: entityId },
    result: ActivityLogResult.SUCCESS,
    summary: `${eventType} processed for ${entityType} ${entityId}`,
    metadata: { eventType, streamName },
    createdAt: '2026-07-20T12:00:00.000Z',
    eventId: '1753032000000-1',
  };
}

function statusChangeExpected(source: ActivityLogSource, action: ActivityLogAction, entityType: string, entityId: string, eventType: string, streamName: string): CreateActivityLogRequestDTO {
  return {
    source,
    action,
    entity: { type: entityType, id: entityId },
    result: ActivityLogResult.SUCCESS,
    summary: `${eventType} processed for ${entityType} ${entityId}`,
    metadata: { eventType, streamName },
    createdAt: '2026-07-20T12:00:00.000Z',
    eventId: '1753032000000-1',
  };
}
