import { ConflictException } from '@nestjs/common';
import { OrderJobStatus, type CreateOrderJobData } from '@agua/contracts';
import { OrderCommandTrackingService } from './order-command-tracking.service';
import type { OrderCommandJobRecord, OrdersRepository } from '../orders.repository';

type TrackingRepositoryMock = jest.Mocked<Pick<OrdersRepository,
  | 'createOrderCommandJob'
  | 'findOrderCommandByIdempotency'
  | 'findOrderCommandByTrackingId'
  | 'updateOrderCommandJobStatus'
>>;

describe('OrderCommandTrackingService', () => {
  const now = new Date('2026-07-17T10:00:00.000Z');
  const clienteId = '11111111-1111-1111-1111-111111111111';
  const vendedorId = 'vendor-1';
  const trackingId = '22222222-2222-2222-2222-222222222222';
  const jobId = `orders.create:${clienteId}:key-1`;
  const payloadHash = 'd09deb959babd09f809eb54cfd13ece7cd6677cfa74f0058a9b932817d3b40b1';
  let repository: TrackingRepositoryMock;
  let service: OrderCommandTrackingService;

  beforeEach(() => {
    repository = repositoryMock();
    service = new OrderCommandTrackingService(repository);
  });

  it('preserves original tracking for duplicate cliente/idempotency payloads', async () => {
    repository.findOrderCommandByIdempotency.mockResolvedValue(commandRecord({ payloadHash }));

    await expect(service.registerPending(createJobData())).resolves.toEqual(expect.objectContaining({
      trackingId,
      jobId,
      status: OrderJobStatus.PENDING,
    }));
    expect(repository.createOrderCommandJob).not.toHaveBeenCalled();
  });

  it('rejects duplicate cliente/idempotency payload conflicts', async () => {
    repository.findOrderCommandByIdempotency.mockResolvedValue(commandRecord({ payloadHash: 'different-hash' }));

    await expect(service.registerPending(createJobData())).rejects.toThrow(ConflictException);
    expect(repository.createOrderCommandJob).not.toHaveBeenCalled();
  });

  it('creates pending records with payload fingerprint and ISO timestamps', async () => {
    repository.findOrderCommandByIdempotency.mockResolvedValue(null);
    repository.createOrderCommandJob.mockResolvedValue(commandRecord({ payloadHash }));

    const response = await service.registerPending(createJobData());

    expect(repository.createOrderCommandJob).toHaveBeenCalledWith(expect.objectContaining({
      clienteId,
      vendedorId,
      idempotencyKey: 'key-1',
      trackingId,
      jobId,
      payloadHash,
      status: OrderJobStatus.PENDING,
    }));
    expect(response.createdAt).toBe(now.toISOString());
  });

  it('reloads the existing tracking record when concurrent idempotent creation hits a unique constraint', async () => {
    repository.findOrderCommandByIdempotency
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(commandRecord({ payloadHash }));
    repository.createOrderCommandJob.mockRejectedValue({ code: 'P2002' });

    await expect(service.registerPending(createJobData())).resolves.toEqual(expect.objectContaining({
      trackingId,
      jobId,
      status: OrderJobStatus.PENDING,
    }));
    expect(repository.findOrderCommandByIdempotency).toHaveBeenCalledTimes(2);
  });

  it('rejects concurrent idempotent creation when the reloaded payload hash differs', async () => {
    repository.findOrderCommandByIdempotency
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(commandRecord({ payloadHash: 'different-hash' }));
    repository.createOrderCommandJob.mockRejectedValue({ code: 'P2002' });

    await expect(service.registerPending(createJobData())).rejects.toThrow(ConflictException);
  });

  it('looks up tracking records by tracking id', async () => {
    repository.findOrderCommandByTrackingId.mockResolvedValue(commandRecord({ status: OrderJobStatus.COMPLETED, orderId: 'order-1' }));

    await expect(service.findByTrackingId(trackingId)).resolves.toEqual(expect.objectContaining({
      status: OrderJobStatus.COMPLETED,
      orderId: 'order-1',
    }));
  });

  it('applies status transitions only from the expected previous status', async () => {
    repository.updateOrderCommandJobStatus.mockResolvedValue(commandRecord({ status: OrderJobStatus.PROCESSING, attempts: 1 }));

    await expect(service.transitionStatus({
      trackingId,
      previousStatus: OrderJobStatus.PENDING,
      nextStatus: OrderJobStatus.PROCESSING,
      attempts: 1,
    })).resolves.toEqual(expect.objectContaining({ status: OrderJobStatus.PROCESSING, attempts: 1 }));
    expect(repository.updateOrderCommandJobStatus).toHaveBeenCalledWith(expect.objectContaining({
      previousStatus: OrderJobStatus.PENDING,
      nextStatus: OrderJobStatus.PROCESSING,
    }));
  });

  it('rejects stale atomic transitions', async () => {
    repository.updateOrderCommandJobStatus.mockResolvedValue(null);

    await expect(service.transitionStatus({
      trackingId,
      previousStatus: OrderJobStatus.PENDING,
      nextStatus: OrderJobStatus.COMPLETED,
      orderId: 'order-1',
    })).rejects.toThrow(ConflictException);
  });

  function createJobData(): CreateOrderJobData {
    return { clienteId, vendedorId, idempotencyKey: 'key-1', trackingId, jobId, requestId: 'request-1', requestedAt: now.toISOString(), body: { amount: 10, vendedorId } };
  }

  function commandRecord(overrides: Partial<OrderCommandJobRecord> = {}): OrderCommandJobRecord {
    return { id: 'command-1', trackingId, jobId, clienteId, vendedorId, idempotencyKey: 'key-1', payloadHash: 'hash-1', status: OrderJobStatus.PENDING, orderId: null, errorCode: null, errorMessage: null, attempts: 0, createdAt: now, updatedAt: now, ...overrides };
  }
});

function repositoryMock(): TrackingRepositoryMock {
  return {
    createOrderCommandJob: jest.fn(),
    findOrderCommandByIdempotency: jest.fn(),
    findOrderCommandByTrackingId: jest.fn(),
    updateOrderCommandJobStatus: jest.fn(),
  };
}
