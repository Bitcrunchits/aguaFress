import { MethodNotAllowedException } from '@nestjs/common';
import { ActionResolverService, ActionNotFoundError, ServiceUnavailable } from '../src/actions/action-resolver.service';
import { type ActionMapping } from '../src/actions/action-registry';
import { GatewayController } from '../src/gateway.controller';
import { OrdersCreateQueueService } from '../src/queues/orders-create-queue.service';
import { TcpDispatcherService } from '../src/tcp/tcp-dispatcher.service';

describe('GatewayController', () => {
  let controller: GatewayController;
  let mockResolver: jest.Mocked<ActionResolverService>;
  let mockDispatcher: { dispatch: jest.Mock };
  let mockOrdersCreateQueue: { enqueue: jest.Mock };

  const mockMapping: ActionMapping = {
    tcpPattern: 'auth.login',
    transport: 'send',
    authRequired: false,
  };

  beforeEach(() => {
    mockResolver = {
      resolve: jest.fn(),
    } as unknown as jest.Mocked<ActionResolverService>;

    mockDispatcher = {
      dispatch: jest.fn(),
    };

    mockOrdersCreateQueue = {
      enqueue: jest.fn(),
    };

    controller = new GatewayController(
      mockResolver,
      mockDispatcher as unknown as TcpDispatcherService,
      mockOrdersCreateQueue as unknown as OrdersCreateQueueService,
    );
  });

  describe('action routing', () => {
    it('resolves and dispatches GET actions', async () => {
      mockResolver.resolve.mockReturnValue(mockMapping);
      mockDispatcher.dispatch.mockResolvedValue({ ok: true });

      const req = { headers: {}, user: { sub: 'u1', email: 'a@b.com', role: 'vendedor' } };
      const result = await controller.handleGetAction('auth', 'login', {}, req as never);

      expect(mockResolver.resolve).toHaveBeenCalledWith('auth', 'login');
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith('auth', expect.objectContaining({
        params: { service: 'auth', action: 'login' },
        user: { sub: 'u1', email: 'a@b.com', role: 'vendedor' },
      }), mockMapping);
      expect(result).toEqual({ ok: true });
    });

    it('resolves and dispatches POST actions with body', async () => {
      mockResolver.resolve.mockReturnValue(mockMapping);
      mockDispatcher.dispatch.mockResolvedValue({ token: 'abc' });

      const body = { email: 'test@agua.com', password: 'secret' };
      const req = { headers: {} };
      const result = await controller.handlePostAction('auth', 'login', body, {}, req as never);

      expect(mockResolver.resolve).toHaveBeenCalledWith('auth', 'login');
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith('auth', expect.objectContaining({
        body: { email: 'test@agua.com', password: 'secret' },
      }), mockMapping);
      expect(result).toEqual({ token: 'abc' });
    });

    it('accepts body idempotency key for orders.create', async () => {
      mockResolver.resolve.mockReturnValue({
        tcpPattern: 'orders.create',
        transport: 'send',
        authRequired: true,
        roles: ['cliente'],
        asyncQueue: 'orders.create',
      });
      mockOrdersCreateQueue.enqueue.mockResolvedValue({ jobId: 'orders.create:cliente-1:body-key', trackingId: 't-1', status: 'PENDING', statusUrl: '/api/v1/orders/job-status?id=t-1', acceptedAt: '2026-07-17T19:00:00.000Z' });

      await controller.handlePostAction(
        'orders',
        'create',
        { idempotencyKey: 'body-key', metodoPago: 'contra_entrega' },
        {},
        { headers: {}, user: { sub: 'cliente-1', email: 'c@agua.com', role: 'cliente' } } as never,
      );

      expect(mockOrdersCreateQueue.enqueue).toHaveBeenCalledWith(expect.objectContaining({ idempotencyKey: 'body-key' }));
    });

    it('resolves and dispatches PATCH actions', async () => {
      mockResolver.resolve.mockReturnValue({
        tcpPattern: 'users.profile_update',
        transport: 'send',
        authRequired: true,
      });
      mockDispatcher.dispatch.mockResolvedValue({ updated: true });

      const body = { name: 'New Name' };
      const req = { headers: {} };
      const result = await controller.handlePatchAction('users', 'profile/update', body, {}, req as never);

      expect(mockResolver.resolve).toHaveBeenCalledWith('users', 'profile/update');
      expect(result).toEqual({ updated: true });
    });

    it('resolves and dispatches DELETE actions with sanitized body identity', async () => {
      mockResolver.resolve.mockReturnValue({
        tcpPattern: 'auth.session',
        transport: 'send',
        authRequired: true,
      });
      mockDispatcher.dispatch.mockResolvedValue({ deleted: true });

      const req = { headers: {} };
      const result = await controller.handleDeleteAction(
        'auth',
        'session',
        { id: 'session-1', userId: 'forged-user', clienteId: 'forged-cliente' },
        {},
        req as never,
      );

      expect(mockResolver.resolve).toHaveBeenCalledWith('auth', 'session');
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith('auth', expect.objectContaining({
        body: { id: 'session-1' },
      }), expect.objectContaining({ tcpPattern: 'auth.session' }));
      expect(result).toEqual({ deleted: true });
    });

    it('propagates resolver errors (unknown service)', async () => {
      mockResolver.resolve.mockImplementation(() => {
        throw new ActionNotFoundError('unknown', 'test');
      });

      const req = { headers: {} };
      await expect(
        controller.handleGetAction('unknown', 'test', {}, req as never),
      ).rejects.toThrow(ActionNotFoundError);
    });

    it('propagates resolver errors (unavailable service)', async () => {
      mockResolver.resolve.mockImplementation(() => {
        throw new ServiceUnavailable('products');
      });

      const req = { headers: {} };
      await expect(
        controller.handleGetAction('products', 'list', {}, req as never),
      ).rejects.toThrow(ServiceUnavailable);
    });

    it('propagates dispatcher errors', async () => {
      mockResolver.resolve.mockReturnValue(mockMapping);
      mockDispatcher.dispatch.mockRejectedValue(new Error('TCP timeout'));

      const req = { headers: {} };
      await expect(
        controller.handleGetAction('auth', 'login', {}, req as never),
      ).rejects.toThrow('TCP timeout');
    });

    it('generates requestId from x-request-id header', async () => {
      mockResolver.resolve.mockReturnValue(mockMapping);
      mockDispatcher.dispatch.mockResolvedValue({});

      const req = { headers: { 'x-request-id': 'custom-id' } };
      await controller.handleGetAction('auth', 'login', {}, req as never);

      expect(mockDispatcher.dispatch).toHaveBeenCalledWith('auth', expect.objectContaining({
        requestId: 'custom-id',
      }), mockMapping);
    });
  });

  describe('unsupported methods', () => {
    it('rejects PUT with 405', () => {
      expect(() => controller.rejectPutMethod()).toThrow(MethodNotAllowedException);
    });

    it('rejects OPTIONS with 405', () => {
      expect(() => controller.rejectOptionsMethod()).toThrow(MethodNotAllowedException);
    });

    it('rejects HEAD with 405', () => {
      expect(() => controller.rejectHeadMethod()).toThrow(MethodNotAllowedException);
    });
  });
});
