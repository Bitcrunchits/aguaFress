import { HealthController } from '../src/health/health.controller';

describe('HealthController', () => {
  it('returns public gateway availability without secrets', () => {
    const controller = new HealthController();

    expect(controller.check()).toEqual({
      status: 'ok',
      service: 'api-gateway',
      version: '1.0.0',
    });
  });

  it('keeps health output sanitized from connection details', () => {
    const controller = new HealthController();
    const healthPayload = JSON.stringify(controller.check());

    expect(healthPayload).not.toContain('secret');
    expect(healthPayload).not.toContain('postgresql://');
    expect(healthPayload).not.toContain('JWT');
  });
});
