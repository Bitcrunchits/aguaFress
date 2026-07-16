import { GatewayTimeoutException, Logger } from '@nestjs/common';
import { NEVER, of } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import type { ClientProxy } from '@nestjs/microservices';
import { ORDERS_CLIENT, USUARIO_CLIENT } from '../src/tcp/tcp-clients.module';
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
  } {
    const usuarioClient = createClient();
    const ordersClient = createClient();
    const configService = { get: jest.fn().mockReturnValue(tcpTimeoutMs) } as unknown as ConfigService;
    const dispatcher = new TcpDispatcherService(
      usuarioClient as unknown as ClientProxy,
      ordersClient as unknown as ClientProxy,
      configService,
    );

    return { dispatcher, usuarioClient, ordersClient };
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
});
