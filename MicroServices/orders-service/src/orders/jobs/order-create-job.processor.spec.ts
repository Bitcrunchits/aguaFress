import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { MetodoPago, OrderEstado, OrderJobStatus, UserRole, type CreateOrderJobData } from '@agua/contracts';
import { OrderCreateJobProcessor } from './order-create-job.processor';
import type { OrderCommandTrackingService } from './order-command-tracking.service';
import type { OrdersService } from '../orders.service';

type TrackingMock = jest.Mocked<Pick<OrderCommandTrackingService, 'transitionStatus'>>;
type OrdersServiceMock = jest.Mocked<Pick<OrdersService, 'create'>>;

describe('OrderCreateJobProcessor', () => {
  const createdAt = '2026-07-17T10:00:00.000Z';
  const clienteId = 'cliente-1';
  const trackingId = 'tracking-1';
  const jobId = `orders.create:${clienteId}:idem-1`;
  let tracking: TrackingMock;
  let ordersService: OrdersServiceMock;
  let processor: OrderCreateJobProcessor;

  beforeEach(() => {
    tracking = { transitionStatus: jest.fn().mockImplementation(async (input) => ({
      clienteId,
      idempotencyKey: 'idem-1',
      trackingId,
      jobId,
      createdAt,
      updatedAt: createdAt,
      status: input.nextStatus,
      orderId: input.orderId,
      errorCode: input.errorCode,
      errorMessage: input.errorMessage,
      attempts: input.attempts ?? 0,
    })) };
    ordersService = { create: jest.fn().mockResolvedValue(orderResponse()) };
    processor = new OrderCreateJobProcessor(tracking, ordersService);
  });

  it('moves PENDING jobs to PROCESSING and then COMPLETED with the created order id', async () => {
    await expect(processor.process(createJobData(), { attemptsMade: 0, maxAttempts: 3 })).resolves.toEqual(expect.objectContaining({
      status: OrderJobStatus.COMPLETED,
      orderId: 'order-1',
    }));

    expect(tracking.transitionStatus).toHaveBeenNthCalledWith(1, expect.objectContaining({
      trackingId,
      previousStatus: OrderJobStatus.PENDING,
      nextStatus: OrderJobStatus.PROCESSING,
      attempts: 1,
    }));
    expect(ordersService.create).toHaveBeenCalledWith(
      { userId: clienteId, email: '', role: UserRole.CLIENTE },
      { metodoPago: MetodoPago.CONTRA_ENTREGA, direccion: createJobData().body.direccion, observaciones: undefined },
    );
    expect(tracking.transitionStatus).toHaveBeenNthCalledWith(2, expect.objectContaining({
      previousStatus: OrderJobStatus.PROCESSING,
      nextStatus: OrderJobStatus.COMPLETED,
      orderId: 'order-1',
    }));
  });

  it('moves RETRYING jobs back to PROCESSING on the next BullMQ attempt', async () => {
    await processor.process(createJobData(), { attemptsMade: 1, maxAttempts: 3 });

    expect(tracking.transitionStatus).toHaveBeenNthCalledWith(1, expect.objectContaining({
      previousStatus: OrderJobStatus.RETRYING,
      nextStatus: OrderJobStatus.PROCESSING,
      attempts: 2,
    }));
  });

  it('marks retryable failures as RETRYING and rethrows so BullMQ schedules the next attempt', async () => {
    const failure = new ServiceUnavailableException('Product catalog unavailable');
    ordersService.create.mockRejectedValue(failure);

    await expect(processor.process(createJobData(), { attemptsMade: 0, maxAttempts: 3 })).rejects.toBe(failure);

    expect(tracking.transitionStatus).toHaveBeenLastCalledWith(expect.objectContaining({
      previousStatus: OrderJobStatus.PROCESSING,
      nextStatus: OrderJobStatus.RETRYING,
      attempts: 1,
      errorCode: 'RETRYABLE_SERVICE_UNAVAILABLE',
    }));
  });

  it('marks terminal business failures as FAILED and does not retry forever', async () => {
    ordersService.create.mockRejectedValue(new BadRequestException('Active cart is not available for checkout'));

    await expect(processor.process(createJobData(), { attemptsMade: 0, maxAttempts: 3 })).rejects.toThrow('TERMINAL_BAD_REQUEST');

    expect(tracking.transitionStatus).toHaveBeenLastCalledWith(expect.objectContaining({
      previousStatus: OrderJobStatus.PROCESSING,
      nextStatus: OrderJobStatus.FAILED,
      attempts: 1,
    }));
  });

  it('marks exhausted retryable failures as DEAD_LETTER and does not clear the cart through a success path', async () => {
    ordersService.create.mockRejectedValue(new ServiceUnavailableException('Product catalog unavailable'));

    await expect(processor.process(createJobData(), { attemptsMade: 2, maxAttempts: 3 })).rejects.toThrow('DEAD_LETTER_SERVICE_UNAVAILABLE');

    expect(tracking.transitionStatus).toHaveBeenLastCalledWith(expect.objectContaining({
      previousStatus: OrderJobStatus.PROCESSING,
      nextStatus: OrderJobStatus.DEAD_LETTER,
      attempts: 3,
    }));
  });

  function createJobData(): CreateOrderJobData {
    return {
      clienteId, idempotencyKey: 'idem-1', trackingId, jobId, requestId: 'request-1', requestedAt: createdAt,
      body: { metodoPago: MetodoPago.CONTRA_ENTREGA, direccion: { calle: 'San Martin', numero: '123', ciudad: 'Mendoza', provincia: 'Mendoza' } },
    };
  }

  function orderResponse() {
    return { id: 'order-1', pedidoNumero: '000001', clienteId, vendedorId: 'vendedor-1', items: [], totalSinIva: 0, iva: 0, total: 0, estado: OrderEstado.PENDIENTE, metodoPago: MetodoPago.CONTRA_ENTREGA, direccion: createJobData().body.direccion, createdAt, updatedAt: createdAt };
  }
});
