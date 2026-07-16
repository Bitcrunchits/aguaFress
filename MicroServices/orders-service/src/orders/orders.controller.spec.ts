import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PATTERN_METADATA } from '@nestjs/microservices/constants';
import { MetodoPago, OrderEstado, UserRole } from '@agua/contracts';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { TcpPayloadAdapter } from '../tcp/tcp-payload-adapter.service';
import type { OrderResponse } from './orders.dto';
import type { TcpPayload } from '../tcp/tcp-payload';

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

  let service: jest.Mocked<Pick<OrdersService, 'create' | 'getById' | 'list' | 'updateStatus' | 'cancel' | 'confirm'>>;
  let controller: OrdersController;

  beforeEach(async () => {
    service = {
      create: jest.fn().mockResolvedValue(orderResponse),
      getById: jest.fn().mockResolvedValue(orderResponse),
      list: jest.fn().mockResolvedValue([orderResponse]),
      updateStatus: jest.fn().mockResolvedValue(orderResponse),
      cancel: jest.fn().mockResolvedValue(orderResponse),
      confirm: jest.fn().mockResolvedValue(orderResponse),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [TcpPayloadAdapter, { provide: OrdersService, useValue: service }],
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
    await controller.list(authenticatedPayload());
    await controller.getById(authenticatedPayload({ query: { id: 'order-1' } }));
    await controller.updateStatus(authenticatedPayload({ body: { id: 'order-1', estado: OrderEstado.EN_CAMINO, notas: 'on route' } }));
    await controller.cancel(authenticatedPayload({ body: { id: 'order-1', motivo: 'customer requested' } }));
    await controller.confirm(authenticatedPayload({ body: { id: 'order-1' } }));

    expect(service.list).toHaveBeenCalledWith(expect.objectContaining({ userId: 'jwt-user' }));
    expect(service.getById).toHaveBeenCalledWith(expect.objectContaining({ userId: 'jwt-user' }), 'order-1');
    expect(service.updateStatus).toHaveBeenCalledWith(expect.objectContaining({ userId: 'jwt-user' }), 'order-1', OrderEstado.EN_CAMINO, 'on route');
    expect(service.cancel).toHaveBeenCalledWith(expect.objectContaining({ userId: 'jwt-user' }), 'order-1', 'customer requested');
    expect(service.confirm).toHaveBeenCalledWith(expect.objectContaining({ userId: 'jwt-user' }), 'order-1');
  });

  it('throws a controlled request exception when get by id receives no id', async () => {
    expect(() => controller.getById(authenticatedPayload({ query: {} }))).toThrow(BadRequestException);
  });

  it('exposes the required order TCP message patterns', () => {
    expect(messagePatternFor('list')).toBe('orders.list');
    expect(messagePatternFor('getById')).toBe('orders.get_by_id');
    expect(messagePatternFor('create')).toBe('orders.create');
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
