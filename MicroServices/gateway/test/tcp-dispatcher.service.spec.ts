import { of } from 'rxjs';
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

  function createDispatcher(): {
    dispatcher: TcpDispatcherService;
    usuarioClient: jest.Mocked<Pick<ClientProxy, 'send' | 'emit'>>;
    ordersClient: jest.Mocked<Pick<ClientProxy, 'send' | 'emit'>>;
  } {
    const usuarioClient = createClient();
    const ordersClient = createClient();
    const configService = { get: jest.fn().mockReturnValue(5000) } as unknown as ConfigService;
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
});
