import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PATTERN_METADATA } from '@nestjs/microservices/constants';
import { MetodoPago, OrderEstado, OrderJobStatus, UserRole, type OrderListResponse, type PaginatedResponse } from '@agua/contracts';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { TcpPayloadAdapter } from '../tcp/tcp-payload-adapter.service';
import type { OrderResponse } from './orders.dto';
import type { TcpPayload } from '../tcp/tcp-payload';
import { OrderCommandTrackingService } from './jobs/order-command-tracking.service';

describe('OrdersController', () => {
  const orderResponse: OrderResponse = {
    id: 'order-1',
    pedidoNumero: '000001',
    clienteId: 'jwt-user',
    vendedorId: 'vendedor-1',
    items: [],
    totalSinIva: 0,
    iva: 0,
    total: 0,
    estado: OrderEstado.PENDIENTE,
    metodoPago: MetodoPago.CONTRA_ENTREGA,
    direccion: { calle: 'San Martin', numero: '123', ciudad: 'Mendoza', provincia: 'Mendoza' },
    createdAt: '2026-07-16T10:00:00.000Z',
    updatedAt: '2026-07-16T10:00:00.000Z',
  };
  const orderListResponse: PaginatedResponse<OrderListResponse> = {
    data: [{ id: 'order-1', pedidoNumero: '000001', estado: OrderEstado.PENDIENTE, total: 0, createdAt: '2026-07-16T10:00:00.000Z' }],
    pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
  };

  let service: jest.Mocked<Pick<OrdersService, 'create' | 'getById' | 'list' | 'updateStatus' | 'cancel' | 'confirm'>>;
  let trackingService: jest.Mocked<Pick<OrderCommandTrackingService, 'findByTrackingId'>>;
  let controller: OrdersController;

  beforeEach(async () => {
    service = {
      create: jest.fn().mockResolvedValue(orderResponse),
      getById: jest.fn().mockResolvedValue(orderResponse),
      list: jest.fn().mockResolvedValue(orderListResponse),
      updateStatus: jest.fn().mockResolvedValue(orderResponse),
      cancel: jest.fn().mockResolvedValue(orderResponse),
      confirm: jest.fn().mockResolvedValue(orderResponse),
    };
    trackingService = {
      findByTrackingId: jest.fn().mockResolvedValue({
        clienteId: 'jwt-user',
        idempotencyKey: 'idem-1',
        jobId: 'orders.create:jwt-user:idem-1',
        trackingId: 'tracking-1',
        status: OrderJobStatus.COMPLETED,
        orderId: 'order-1',
        attempts: 1,
        createdAt: '2026-07-16T10:00:00.000Z',
        updatedAt: '2026-07-16T10:01:00.000Z',
      }),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [TcpPayloadAdapter, { provide: OrdersService, useValue: service }, { provide: OrderCommandTrackingService, useValue: trackingService }],
    }).compile();

    controller = moduleRef.get(OrdersController);
  });

  it('creates orders using JWT user context and ignoring body userId', async () => {
    const payload = authenticatedPayload({ body: { userId: 'body-user', metodoPago: MetodoPago.CONTRA_ENTREGA, direccion: orderResponse.direccion } });

    await expect(controller.create(payload)).resolves.toBe(orderResponse);

    expect(service.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'jwt-user' }), {
      metodoPago: MetodoPago.CONTRA_ENTREGA,
      direccion: orderResponse.direccion,
      observaciones: undefined,
    });
  });

  it('routes order reads and state mutations through TCP message patterns', async () => {
    await controller.list(authenticatedPayload({ query: { page: '2', limit: '5', estado: OrderEstado.PENDIENTE, clienteId: 'cliente-2' } }));
    await controller.getById(authenticatedPayload({ query: { id: 'order-1' } }));
    await controller.updateStatus(authenticatedPayload({ body: { id: 'order-1', estado: OrderEstado.EN_CAMINO, notas: 'on route' } }));
    await controller.cancel(authenticatedPayload({ body: { id: 'order-1', motivo: 'customer requested' } }));
    await controller.confirm(authenticatedPayload({ body: { id: 'order-1' } }));

    expect(service.list).toHaveBeenCalledWith(expect.objectContaining({ userId: 'jwt-user' }), {
      page: 2,
      limit: 5,
      estado: OrderEstado.PENDIENTE,
      clienteId: 'cliente-2',
      vendedorId: undefined,
    });
    expect(service.getById).toHaveBeenCalledWith(expect.objectContaining({ userId: 'jwt-user' }), 'order-1');
    expect(service.updateStatus).toHaveBeenCalledWith(expect.objectContaining({ userId: 'jwt-user' }), 'order-1', OrderEstado.EN_CAMINO, 'on route');
    expect(service.cancel).toHaveBeenCalledWith(expect.objectContaining({ userId: 'jwt-user' }), 'order-1', 'customer requested');
    expect(service.confirm).toHaveBeenCalledWith(expect.objectContaining({ userId: 'jwt-user' }), 'order-1');
  });

  it('throws a controlled request exception when get by id receives no id', async () => {
    expect(() => controller.getById(authenticatedPayload({ query: {} }))).toThrow(BadRequestException);
  });

  it('returns async order job status by tracking id without requiring body identity', async () => {
    await expect(controller.jobStatus(authenticatedPayload({ query: { id: 'tracking-1' }, body: { userId: 'body-user' } }))).resolves.toEqual(expect.objectContaining({
      trackingId: 'tracking-1',
      status: OrderJobStatus.COMPLETED,
      orderId: 'order-1',
    }));

    expect(trackingService.findByTrackingId).toHaveBeenCalledWith('tracking-1');
  });

  it('hides async order job status from other authenticated clientes', async () => {
    trackingService.findByTrackingId.mockResolvedValueOnce({
      clienteId: 'other-cliente',
      idempotencyKey: 'idem-1',
      jobId: 'orders.create:other-cliente:idem-1',
      trackingId: 'tracking-1',
      status: OrderJobStatus.COMPLETED,
      attempts: 1,
      createdAt: '2026-07-16T10:00:00.000Z',
      updatedAt: '2026-07-16T10:01:00.000Z',
    });

    await expect(controller.jobStatus(authenticatedPayload({ query: { id: 'tracking-1' } }))).rejects.toThrow(NotFoundException);
  });

  it('allows super admins to inspect async order job status', async () => {
    await expect(controller.jobStatus(authenticatedPayload({
      query: { id: 'tracking-1' },
      user: { sub: 'admin-user', email: 'admin@test.com', role: UserRole.SUPER_ADMIN },
    }))).resolves.toEqual(expect.objectContaining({ trackingId: 'tracking-1' }));
  });

  it('throws a controlled request exception when job status receives no id', async () => {
    await expect(controller.jobStatus(authenticatedPayload({ query: {} }))).rejects.toThrow(BadRequestException);
  });

  it('exposes the required order TCP message patterns', () => {
    expect(messagePatternFor('list')).toBe('orders.list');
    expect(messagePatternFor('getById')).toBe('orders.get_by_id');
    expect(messagePatternFor('create')).toBe('orders.create');
    expect(messagePatternFor('jobStatus')).toBe('orders.job_status');
    expect(messagePatternFor('updateStatus')).toBe('orders.status_update');
    expect(messagePatternFor('cancel')).toBe('orders.cancel');
    expect(messagePatternFor('confirm')).toBe('orders.confirm');
  });

  function messagePatternFor(methodName: keyof OrdersController): string {
    const method = OrdersController.prototype[methodName];
    const pattern = Reflect.getMetadata(PATTERN_METADATA, method) as readonly string[] | undefined;
    const [firstPattern] = pattern ?? [];
    if (firstPattern === undefined) {
      throw new Error(`Missing TCP pattern for ${String(methodName)}`);
    }

    return firstPattern;
  }

  function authenticatedPayload(overrides: Partial<TcpPayload> = {}): TcpPayload {
    return {
      user: { sub: 'jwt-user', email: 'jwt-user@test.com', role: UserRole.CLIENTE },
      ...overrides,
    };
  }
});
