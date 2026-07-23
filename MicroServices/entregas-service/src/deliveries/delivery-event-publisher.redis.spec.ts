import { Test, type TestingModule } from '@nestjs/testing';
import { DeliveryEstado, RedisStreams } from '@agua/contracts';
import { RedisDeliveryEventPublisher } from './delivery-event-publisher.redis';
import { DELIVERY_EVENT_PUBLISHER } from './delivery-event-publisher.port';

const mockRedis = {
  xadd: jest.fn(),
};

describe('RedisDeliveryEventPublisher', () => {
  let publisher: RedisDeliveryEventPublisher;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: DELIVERY_EVENT_PUBLISHER, useClass: RedisDeliveryEventPublisher },
        { provide: 'REDIS_CLIENT', useValue: mockRedis },
      ],
    }).compile();

    publisher = module.get<RedisDeliveryEventPublisher>(DELIVERY_EVENT_PUBLISHER);
  });

  describe('publishStatusChanged', () => {
    it('llama a XADD con los campos del evento en deliveries-stream', async () => {
      mockRedis.xadd.mockResolvedValue('1689000000000-0');

      await publisher.publishStatusChanged({
        type: 'DeliveryStatusChanged',
        deliveryId: 'entrega-1',
        orderId: 'order-1',
        estadoAnterior: DeliveryEstado.PENDIENTE,
        estadoNuevo: DeliveryEstado.EN_CAMINO,
        actorUserId: 'user-abc',
        timestamp: '2026-07-07T10:00:00.000Z',
      });

      expect(mockRedis.xadd).toHaveBeenCalledWith(
        RedisStreams.DELIVERIES,
        '*',
        'type',
        'DeliveryStatusChanged',
        'deliveryId',
        'entrega-1',
        'orderId',
        'order-1',
        'estadoAnterior',
        DeliveryEstado.PENDIENTE,
        'estadoNuevo',
        DeliveryEstado.EN_CAMINO,
        'actorUserId',
        'user-abc',
        'timestamp',
        '2026-07-07T10:00:00.000Z',
      );
    });

    it('propaga el error si XADD falla (non-blocking no es seguro — DB ya actualizada)', async () => {
      mockRedis.xadd.mockRejectedValue(new Error('Redis connection lost'));

      await expect(
        publisher.publishStatusChanged({
          type: 'DeliveryStatusChanged',
          deliveryId: 'entrega-1',
          orderId: 'order-1',
          estadoAnterior: DeliveryEstado.EN_CAMINO,
          estadoNuevo: DeliveryEstado.ENTREGADA,
          actorUserId: 'user-abc',
          timestamp: '2026-07-07T10:00:00.000Z',
        }),
      ).rejects.toThrow('Redis connection lost');
    });
  });

  describe('publishStarted', () => {
    it('llama a XADD con los campos del DeliveryStartedEvent en deliveries-stream', async () => {
      mockRedis.xadd.mockResolvedValue('1689000000000-0');

      await publisher.publishStarted({
        type: 'DeliveryStarted',
        deliveryId: 'entrega-1',
        orderId: 'order-1',
        vendedorId: 'vendedor-1',
        clienteId: 'cli-1',
        actorUserId: 'user-abc',
        timestamp: '2026-07-07T10:00:00.000Z',
      });

      expect(mockRedis.xadd).toHaveBeenCalledWith(
        RedisStreams.DELIVERIES,
        '*',
        'type',
        'DeliveryStarted',
        'deliveryId',
        'entrega-1',
        'orderId',
        'order-1',
        'vendedorId',
        'vendedor-1',
        'clienteId',
        'cli-1',
        'actorUserId',
        'user-abc',
        'timestamp',
        '2026-07-07T10:00:00.000Z',
      );
    });

    it('propaga el error si XADD falla en publishStarted', async () => {
      mockRedis.xadd.mockRejectedValue(new Error('Redis connection lost'));

      await expect(
        publisher.publishStarted({
          type: 'DeliveryStarted',
          deliveryId: 'entrega-1',
          orderId: 'order-1',
          vendedorId: 'vendedor-1',
          clienteId: 'cli-1',
          actorUserId: 'user-abc',
          timestamp: '2026-07-07T10:00:00.000Z',
        }),
      ).rejects.toThrow('Redis connection lost');
    });
  });

  describe('publishCompleted', () => {
    it('llama a XADD con los campos del DeliveryCompletedEvent en deliveries-stream', async () => {
      mockRedis.xadd.mockResolvedValue('1689000000000-0');

      await publisher.publishCompleted({
        type: 'DeliveryCompleted',
        deliveryId: 'entrega-1',
        orderId: 'order-1',
        vendedorId: 'vendedor-1',
        clienteId: 'cli-1',
        actorUserId: 'user-abc',
        timestamp: '2026-07-07T10:00:00.000Z',
      });

      expect(mockRedis.xadd).toHaveBeenCalledWith(
        RedisStreams.DELIVERIES,
        '*',
        'type',
        'DeliveryCompleted',
        'deliveryId',
        'entrega-1',
        'orderId',
        'order-1',
        'vendedorId',
        'vendedor-1',
        'clienteId',
        'cli-1',
        'actorUserId',
        'user-abc',
        'timestamp',
        '2026-07-07T10:00:00.000Z',
      );
    });

    it('propaga el error si XADD falla en publishCompleted', async () => {
      mockRedis.xadd.mockRejectedValue(new Error('Redis connection lost'));

      await expect(
        publisher.publishCompleted({
          type: 'DeliveryCompleted',
          deliveryId: 'entrega-1',
          orderId: 'order-1',
          vendedorId: 'vendedor-1',
          clienteId: 'cli-1',
          actorUserId: 'user-abc',
          timestamp: '2026-07-07T10:00:00.000Z',
        }),
      ).rejects.toThrow('Redis connection lost');
    });
  });
});
