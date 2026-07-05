import { GatewayController } from '../src/gateway.controller';

describe('GatewayController', () => {
  it('accepts versioned service/action route shape without dispatching yet', () => {
    const controller = new GatewayController();

    expect(controller.handleAction('auth', 'login')).toEqual({
      service: 'auth',
      action: 'login',
      status: 'routing-not-implemented',
    });
  });

  it('normalizes another service/action pair through the same foundation surface', () => {
    const controller = new GatewayController();

    expect(controller.handleAction('users', 'profile')).toEqual({
      service: 'users',
      action: 'profile',
      status: 'routing-not-implemented',
    });
  });
});
