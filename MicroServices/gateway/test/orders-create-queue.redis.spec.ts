import { ConfigService } from '@nestjs/config';
import type { CreateOrderJobData } from '@agua/contracts';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { randomUUID } from 'node:crypto';
import {
  OrdersCreateQueueService,
  type EnqueueOrderCreateInput,
} from '../src/queues/orders-create-queue.service';
import type { OrdersCreateQueuePort } from '../src/queues/orders-queue.provider';

const describeRedis = process.env.RUN_REDIS_INTEGRATION === '1' ? describe : describe.skip;

describeRedis('OrdersCreateQueueService (local Redis)', () => {
  it('retains the first job for duplicate keys and enqueues a distinct key', async () => {
    const queueName = `orders-create-test-${randomUUID()}`;
    const prefix = `orders-create-test-${randomUUID()}`;
    const connection = new IORedis('redis://127.0.0.1:6379', {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      retryStrategy: () => null,
    });
    const queue = new Queue<CreateOrderJobData>(queueName, { prefix, connection });

    try {
      const queuePort: OrdersCreateQueuePort<CreateOrderJobData> = queue;
      const service = new OrdersCreateQueueService(queuePort, new ConfigService({
        ORDERS_CREATE_QUEUE_ATTEMPTS: 3,
        ORDERS_CREATE_QUEUE_BACKOFF_MS: 1000,
        ORDERS_CREATE_QUEUE_REMOVE_ON_COMPLETE: 1000,
      }));

      // V1 clienteId is the authenticated JWT user ID, not a CLIENTE profile ID.
      const input = {
        clienteId: 'auth-user-1',
        vendedorId: 'vendedor-1',
        idempotencyKey: 'idem-1',
        requestId: 'request-1',
        body: { metodoPago: 'contra_entrega' },
      } satisfies EnqueueOrderCreateInput;

      const first = await service.enqueue(input);
      const duplicate = await service.enqueue({
        ...input,
        requestId: 'request-2',
        body: { metodoPago: 'transferencia' },
      });

      expect(first.jobId).toMatch(/^orders\.create\.[a-f0-9]{64}$/);
      expect(first.jobId).toHaveLength(78);
      expect(first.jobId).not.toContain(':');
      expect(duplicate.jobId).toBe(first.jobId);
      expect(duplicate.trackingId).toBe(first.trackingId);

      const retainedJob = await queue.getJob(first.jobId);
      expect(retainedJob?.name).toBe('orders.create');
      expect(retainedJob?.data).toMatchObject({
        jobId: first.jobId,
        trackingId: first.trackingId,
        clienteId: input.clienteId,
        vendedorId: input.vendedorId,
        idempotencyKey: input.idempotencyKey,
        requestId: 'request-1',
        body: input.body,
      });
      expect(await queue.getWaitingCount()).toBe(1);

      const distinct = await service.enqueue({
        ...input,
        idempotencyKey: 'idem-2',
        requestId: 'request-3',
      });

      expect(distinct.jobId).not.toBe(first.jobId);
      expect(distinct.trackingId).not.toBe(first.trackingId);
      expect((await queue.getJob(distinct.jobId))?.data).toMatchObject({
        jobId: distinct.jobId,
        idempotencyKey: 'idem-2',
        requestId: 'request-3',
      });
      expect(await queue.getWaitingCount()).toBe(2);
    } finally {
      try {
        await queue.obliterate({ force: true });
        expect(await connection.keys(`${prefix}:${queueName}:*`)).toEqual([]);
      } finally {
        try {
          await queue.close();
        } finally {
          connection.disconnect();
        }
      }
    }
  });
});
