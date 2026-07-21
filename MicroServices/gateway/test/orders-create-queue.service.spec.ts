import { ConfigService } from '@nestjs/config';
import { OrderJobStatus } from '@agua/contracts';
import {
  buildOrdersCreateJobId,
  buildOrdersCreateTrackingId,
  OrdersCreateQueueService,
} from '../src/queues/orders-create-queue.service';

describe('OrdersCreateQueueService', () => {
  it('builds deterministic job and tracking ids from cliente, provider, plus idempotency key', () => {
    const firstJobId = buildOrdersCreateJobId('cliente-1', 'vendedor-1', 'idem-1');
    const secondJobId = buildOrdersCreateJobId('cliente-1', 'vendedor-1', 'idem-1');
    const otherProviderJobId = buildOrdersCreateJobId('cliente-1', 'vendedor-2', 'idem-1');
    const firstTrackingId = buildOrdersCreateTrackingId('cliente-1', 'vendedor-1', 'idem-1');
    const secondTrackingId = buildOrdersCreateTrackingId('cliente-1', 'vendedor-1', 'idem-1');
    const otherProviderTrackingId = buildOrdersCreateTrackingId('cliente-1', 'vendedor-2', 'idem-1');

    expect(firstJobId).toBe('orders.create:cliente-1:vendedor-1:idem-1');
    expect(secondJobId).toBe(firstJobId);
    expect(otherProviderJobId).toBe('orders.create:cliente-1:vendedor-2:idem-1');
    expect(secondTrackingId).toBe(firstTrackingId);
    expect(otherProviderTrackingId).not.toBe(firstTrackingId);
    expect(firstTrackingId).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
  });

  it('enqueues create order jobs with stable tracking response and raw body payload', async () => {
    const queue = { add: jest.fn().mockResolvedValue({ id: 'job-1' }) };
    const config = new ConfigService({
      ORDERS_CREATE_QUEUE_ATTEMPTS: 5,
      ORDERS_CREATE_QUEUE_BACKOFF_MS: 2000,
      ORDERS_CREATE_QUEUE_REMOVE_ON_COMPLETE: 20,
    });
    const service = new OrdersCreateQueueService(queue, config);

    const response = await service.enqueue({
      clienteId: 'cliente-1',
      vendedorId: 'vendedor-1',
      idempotencyKey: 'idem-1',
      requestId: 'request-1',
      body: { metodoPago: 'contra_entrega' },
    });

    const expectedTrackingId = buildOrdersCreateTrackingId('cliente-1', 'vendedor-1', 'idem-1');

    expect(response).toEqual({
      jobId: 'orders.create:cliente-1:vendedor-1:idem-1',
      trackingId: expectedTrackingId,
      status: OrderJobStatus.PENDING,
      vendedorId: 'vendedor-1',
      statusUrl: `/api/v1/orders/job-status?id=${expectedTrackingId}`,
      acceptedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });
    expect(queue.add).toHaveBeenCalledWith(
      'orders.create',
      expect.objectContaining({
        jobId: 'orders.create:cliente-1:vendedor-1:idem-1',
        trackingId: expectedTrackingId,
        clienteId: 'cliente-1',
        vendedorId: 'vendedor-1',
        idempotencyKey: 'idem-1',
        requestId: 'request-1',
        body: { metodoPago: 'contra_entrega' },
      }),
      {
        jobId: 'orders.create:cliente-1:vendedor-1:idem-1',
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { count: 20 },
        removeOnFail: false,
      },
    );
  });
});
