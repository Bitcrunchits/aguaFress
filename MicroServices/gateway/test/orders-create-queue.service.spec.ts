import { ConfigService } from '@nestjs/config';
import { OrderJobStatus, type CreateOrderJobData } from '@agua/contracts';
import { Job, QueueKeys, type JobJson, type QueueBase } from 'bullmq';
import {
  buildOrdersCreateJobId,
  buildOrdersCreateTrackingId,
  OrdersCreateQueueService,
} from '../src/queues/orders-create-queue.service';
import { type OrdersCreateQueuePort } from '../src/queues/orders-queue.provider';

/**
 * Exposes the protected `Job.validateOptions` so tests can run the validator
 * shipped with the installed BullMQ version (5.80.5). `Queue.add` reaches this
 * same validator through `Job.create` -> `Job.addJob` before writing to Redis.
 */
class BullMqJobOptionsValidator<DataType> extends Job<DataType> {
  assertOptionsValid(data: DataType): void {
    this.validateOptions({ data: JSON.stringify(data) } as unknown as JobJson);
  }
}

function createJobForValidation<DataType>(name: string, data: DataType, jobId: string): BullMqJobOptionsValidator<DataType> {
  const queueKeys = new QueueKeys('bull');
  const queue = {
    keys: queueKeys.getKeys('orders.create'),
    client: Promise.resolve(null),
    redisVersion: '7.0.0',
    toKey: (type: string) => queueKeys.toKey('orders.create', type),
    opts: { prefix: 'bull' },
    closing: false,
    databaseType: 'redis',
    qualifiedName: queueKeys.getQueueQualifiedName('orders.create'),
  } as unknown as QueueBase;

  return new BullMqJobOptionsValidator(queue, name, data, { jobId });
}

describe('OrdersCreateQueueService', () => {
  it('builds a job id accepted by the installed BullMQ job options validation', () => {
    const data = { clienteId: 'cliente-1', vendedorId: 'vendedor-1', idempotencyKey: 'idem-1' };
    const jobId = buildOrdersCreateJobId(data.clienteId, data.vendedorId, data.idempotencyKey);
    const job = createJobForValidation('orders.create', data, jobId);

    expect(() => job.assertOptionsValid(data)).not.toThrow();
  });

  it('builds deterministic, colon-free job and tracking ids from cliente, provider, plus idempotency key', () => {
    const firstJobId = buildOrdersCreateJobId('cliente-1', 'vendedor-1', 'idem-1');
    const secondJobId = buildOrdersCreateJobId('cliente-1', 'vendedor-1', 'idem-1');
    const otherClienteJobId = buildOrdersCreateJobId('cliente-2', 'vendedor-1', 'idem-1');
    const otherProviderJobId = buildOrdersCreateJobId('cliente-1', 'vendedor-2', 'idem-1');
    const otherKeyJobId = buildOrdersCreateJobId('cliente-1', 'vendedor-1', 'idem-2');
    const firstTrackingId = buildOrdersCreateTrackingId('cliente-1', 'vendedor-1', 'idem-1');
    const secondTrackingId = buildOrdersCreateTrackingId('cliente-1', 'vendedor-1', 'idem-1');
    const otherProviderTrackingId = buildOrdersCreateTrackingId('cliente-1', 'vendedor-2', 'idem-1');

    expect(firstJobId).toBe(secondJobId);
    expect(firstJobId).toMatch(/^orders\.create\.[a-f0-9]{64}$/);
    expect(firstJobId).not.toContain(':');
    expect(otherClienteJobId).not.toBe(firstJobId);
    expect(otherProviderJobId).not.toBe(firstJobId);
    expect(otherKeyJobId).not.toBe(firstJobId);
    expect(firstTrackingId).toBe('599aef17-c337-63fe-9766-9da8469f0853');
    expect(secondTrackingId).toBe(firstTrackingId);
    expect(otherProviderTrackingId).not.toBe(firstTrackingId);
    expect(firstTrackingId).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
  });

  it('enqueues create order jobs with stable tracking response and raw body payload', async () => {
    const addMock = jest.fn(
      async (
        name: string,
        data: CreateOrderJobData,
        options: Parameters<OrdersCreateQueuePort<CreateOrderJobData>['add']>[2],
      ): Promise<unknown> => {
        const jobId = options?.jobId;
        if (!jobId) {
          throw new Error('Expected BullMQ options to include a jobId');
        }
        createJobForValidation(name, data, jobId).assertOptionsValid(data);
        return { id: 'job-1' };
      },
    );
    const queue: OrdersCreateQueuePort<CreateOrderJobData> = { add: addMock };
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

    const expectedJobId = buildOrdersCreateJobId('cliente-1', 'vendedor-1', 'idem-1');
    const expectedTrackingId = '599aef17-c337-63fe-9766-9da8469f0853';

    expect(response).toEqual({
      jobId: expectedJobId,
      trackingId: expectedTrackingId,
      status: OrderJobStatus.PENDING,
      vendedorId: 'vendedor-1',
      statusUrl: `/api/v1/orders/job-status?id=${expectedTrackingId}`,
      acceptedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });
    expect(queue.add).toHaveBeenCalledWith(
      'orders.create',
      expect.objectContaining({
        jobId: expectedJobId,
        trackingId: expectedTrackingId,
        clienteId: 'cliente-1',
        vendedorId: 'vendedor-1',
        idempotencyKey: 'idem-1',
        requestId: 'request-1',
        body: { metodoPago: 'contra_entrega' },
      }),
      {
        jobId: expectedJobId,
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { count: 20 },
        removeOnFail: false,
      },
    );
  });
});
