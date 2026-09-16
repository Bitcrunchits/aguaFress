import { GatewayTimeoutException, Logger } from '@nestjs/common';
import { NEVER, of, throwError } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import type { ClientProxy } from '@nestjs/microservices';
import { ENTREGAS_CLIENT, NOTIFICATIONS_CLIENT, ORDERS_CLIENT, PRODUCTS_CLIENT, USUARIO_CLIENT } from '../src/tcp/tcp-clients.module';
import { TcpDispatcherService, type TcpCommandPayload } from '../src/tcp/tcp-dispatcher.service';

describe('TcpDispatcherService', () => {
  function createClient(): jest.Mocked<Pick<ClientProxy, 'send' | 'emit'>> {
    return {
      send: jest.fn().mockReturnValue(of({ ok: true })),
      emit: jest.fn().mockReturnValue(of({ queued: true })),
    };
  }

  function createDispatcher(tcpTimeoutMs = 5000): {
    dispatcher: TcpDispatcherService;
    usuarioClient: jest.Mocked<Pick<ClientProxy, 'send' | 'emit'>>;
    ordersClient: jest.Mocked<Pick<ClientProxy, 'send' | 'emit'>>;
    notificationsClient: jest.Mocked<Pick<ClientProxy, 'send' | 'emit'>>;
    entregasClient: jest.Mocked<Pick<ClientProxy, 'send' | 'emit'>>;
    productsClient: jest.Mocked<Pick<ClientProxy, 'send' | 'emit'>>;
  } {
    const usuarioClient = createClient();
    const ordersClient = createClient();
    const notificationsClient = createClient();
    const entregasClient = createClient();
    const productsClient = createClient();
    const configService = { get: jest.fn().mockReturnValue(tcpTimeoutMs) } as unknown as ConfigService;
    const dispatcher = new TcpDispatcherService(
      usuarioClient as unknown as ClientProxy,
      ordersClient as unknown as ClientProxy,
      notificationsClient as unknown as ClientProxy,
      entregasClient as unknown as ClientProxy,
      productsClient as unknown as ClientProxy,
      configService,
    );

    return { dispatcher, usuarioClient, ordersClient, notificationsClient, entregasClient, productsClient };
  }

  const payload: TcpCommandPayload = {
    requestId: 'request-1',
    params: { service: 'orders', action: 'list' },
    user: { sub: 'cliente-1', email: 'cliente@agua.com', role: 'cliente' },
  };

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('exports an ORDERS_CLIENT token separate from USUARIO_CLIENT', () => {
    expect(ORDERS_CLIENT).toBe('ORDERS_CLIENT');
    expect(ORDERS_CLIENT).not.toBe(USUARIO_CLIENT);
  });

  it('exports a NOTIFICATIONS_CLIENT token separate from existing TCP clients', () => {
    expect(NOTIFICATIONS_CLIENT).toBe('NOTIFICATIONS_CLIENT');
    expect(NOTIFICATIONS_CLIENT).not.toBe(USUARIO_CLIENT);
    expect(NOTIFICATIONS_CLIENT).not.toBe(ORDERS_CLIENT);
  });

  it('exports an ENTREGAS_CLIENT token separate from existing TCP clients', () => {
    expect(ENTREGAS_CLIENT).toBe('ENTREGAS_CLIENT');
    expect(ENTREGAS_CLIENT).not.toBe(USUARIO_CLIENT);
    expect(ENTREGAS_CLIENT).not.toBe(ORDERS_CLIENT);
    expect(ENTREGAS_CLIENT).not.toBe(NOTIFICATIONS_CLIENT);
  });

  it('exports a PRODUCTS_CLIENT token separate from existing TCP clients', () => {
    expect(PRODUCTS_CLIENT).toBe('PRODUCTS_CLIENT');
    expect(PRODUCTS_CLIENT).not.toBe(USUARIO_CLIENT);
    expect(PRODUCTS_CLIENT).not.toBe(ORDERS_CLIENT);
    expect(PRODUCTS_CLIENT).not.toBe(NOTIFICATIONS_CLIENT);
    expect(PRODUCTS_CLIENT).not.toBe(ENTREGAS_CLIENT);
  });

  it('routes orders actions to ORDERS_CLIENT', async () => {
    const { dispatcher, usuarioClient, ordersClient } = createDispatcher();

    await dispatcher.dispatch('orders', payload, {
      tcpPattern: 'orders.list',
      transport: 'send',
      authRequired: true,
    });

    expect(ordersClient.send).toHaveBeenCalledWith('orders.list', payload);
    expect(usuarioClient.send).not.toHaveBeenCalled();
  });

  it('routes cart actions to ORDERS_CLIENT', async () => {
    const { dispatcher, usuarioClient, ordersClient } = createDispatcher();

    await dispatcher.dispatch('cart', payload, {
      tcpPattern: 'cart.get',
      transport: 'send',
      authRequired: true,
    });

    expect(ordersClient.send).toHaveBeenCalledWith('cart.get', payload);
    expect(usuarioClient.send).not.toHaveBeenCalled();
  });

  it('routes activity-logs actions to NOTIFICATIONS_CLIENT', async () => {
    const { dispatcher, usuarioClient, ordersClient, notificationsClient } = createDispatcher();

    await dispatcher.dispatch('activity-logs', payload, {
      tcpPattern: 'activity_logs.list',
      transport: 'send',
      authRequired: true,
      roles: ['super_admin'],
    });

    expect(notificationsClient.send).toHaveBeenCalledWith('activity_logs.list', payload);
    expect(usuarioClient.send).not.toHaveBeenCalled();
    expect(ordersClient.send).not.toHaveBeenCalled();
  });

  it('routes deliveries actions to ENTREGAS_CLIENT', async () => {
    const { dispatcher, usuarioClient, ordersClient, notificationsClient, entregasClient } = createDispatcher();

    await dispatcher.dispatch('deliveries', payload, {
      tcpPattern: 'deliveries.list',
      transport: 'send',
      authRequired: true,
      roles: ['vendedor'],
    });

    expect(entregasClient.send).toHaveBeenCalledWith('deliveries.list', payload);
    expect(usuarioClient.send).not.toHaveBeenCalled();
    expect(ordersClient.send).not.toHaveBeenCalled();
    expect(notificationsClient.send).not.toHaveBeenCalled();
  });

  it('does not retry mutating send actions on timeout', async () => {
    const { dispatcher, ordersClient } = createDispatcher(1);
    ordersClient.send.mockReturnValue(NEVER);

    await expect(dispatcher.dispatch('orders', payload, {
      tcpPattern: 'orders.create',
      transport: 'send',
      authRequired: true,
      roles: ['cliente'],
      retryOnTimeout: false,
    })).rejects.toThrow(GatewayTimeoutException);

    expect(ordersClient.send).toHaveBeenCalledTimes(1);
  });

  it('retries safe read send actions once on timeout', async () => {
    const { dispatcher, ordersClient } = createDispatcher(1);
    ordersClient.send.mockReturnValue(NEVER);

    await expect(dispatcher.dispatch('orders', payload, {
      tcpPattern: 'orders.list',
      transport: 'send',
      authRequired: true,
    })).rejects.toThrow(GatewayTimeoutException);

    expect(ordersClient.send).toHaveBeenCalledTimes(2);
  });

  it('restores HTTP status from serialized TCP business errors', async () => {
    const { dispatcher, usuarioClient } = createDispatcher();
    const serializedUnauthorized = {
      statusCode: 401,
      message: 'Invalid credentials',
      error: 'Unauthorized',
    };
    usuarioClient.send.mockReturnValue(throwError(() => serializedUnauthorized));

    await expect(dispatcher.dispatch('auth', payload, {
      tcpPattern: 'auth.login',
      transport: 'send',
      authRequired: false,
      retryOnTimeout: false,
    })).rejects.toMatchObject({
      response: serializedUnauthorized,
      status: 401,
    });
  });

  it('restores HTTP status from TCP business errors serialized as Error instances', async () => {
    const { dispatcher, usuarioClient } = createDispatcher();
    const serializedUnauthorized = Object.assign(new Error('Invalid credentials'), {
      statusCode: 401,
      error: 'Unauthorized',
    });
    usuarioClient.send.mockReturnValue(throwError(() => serializedUnauthorized));

    await expect(dispatcher.dispatch('auth', payload, {
      tcpPattern: 'auth.login',
      transport: 'send',
      authRequired: false,
      retryOnTimeout: false,
    })).rejects.toMatchObject({
      response: serializedUnauthorized,
      status: 401,
    });
  });

  it('restores HTTP status from TCP business errors wrapped by Nest transport', async () => {
    const { dispatcher, usuarioClient } = createDispatcher();
    const serializedUnauthorized = {
      statusCode: 401,
      message: 'Invalid credentials',
      error: 'Unauthorized',
    };
    usuarioClient.send.mockReturnValue(throwError(() => ({
      error: serializedUnauthorized,
      message: 'Invalid credentials',
    })));

    await expect(dispatcher.dispatch('auth', payload, {
      tcpPattern: 'auth.login',
      transport: 'send',
      authRequired: false,
      retryOnTimeout: false,
    })).rejects.toMatchObject({
      response: serializedUnauthorized,
      status: 401,
    });
  });

  it('restores HTTP status from TCP business errors before retrying non-timeout failures', async () => {
    const { dispatcher, usuarioClient } = createDispatcher();
    const serializedUnauthorized = {
      statusCode: 401,
      message: 'Invalid credentials',
      error: 'Unauthorized',
    };
    usuarioClient.send.mockReturnValue(throwError(() => ({
      error: serializedUnauthorized,
      message: 'Invalid credentials',
    })));

    await expect(dispatcher.dispatch('auth', payload, {
      tcpPattern: 'auth.login',
      transport: 'send',
      authRequired: false,
    })).rejects.toMatchObject({
      response: serializedUnauthorized,
      status: 401,
    });

    expect(usuarioClient.send).toHaveBeenCalledTimes(1);
  });
});
