import {
  createGatewayEnv,
  GATEWAY_ENV_DEFAULTS,
  GatewayEnvError,
} from '../src/config/env.config';

describe('createGatewayEnv', () => {
  it('uses validated defaults for gateway foundation settings', () => {
    const gatewayEnv = createGatewayEnv({
      JWT_SECRET: 'test-secret',
      USUARIO_SERVICE_HOST: 'usuario-service',
      USUARIO_SERVICE_TCP_PORT: '3011',
    });

    expect(gatewayEnv).toEqual({
      PORT: GATEWAY_ENV_DEFAULTS.PORT,
      JWT_SECRET: 'test-secret',
      USUARIO_SERVICE_HOST: 'usuario-service',
      USUARIO_SERVICE_TCP_PORT: 3011,
      TCP_TIMEOUT_MS: GATEWAY_ENV_DEFAULTS.TCP_TIMEOUT_MS,
      RATE_LIMIT_TTL_MS: GATEWAY_ENV_DEFAULTS.RATE_LIMIT_TTL_MS,
      RATE_LIMIT_MAX: GATEWAY_ENV_DEFAULTS.RATE_LIMIT_MAX,
      RATE_LIMIT_AUTH_SENSITIVE_TTL_MS: GATEWAY_ENV_DEFAULTS.RATE_LIMIT_AUTH_SENSITIVE_TTL_MS,
      RATE_LIMIT_AUTH_SENSITIVE_MAX: GATEWAY_ENV_DEFAULTS.RATE_LIMIT_AUTH_SENSITIVE_MAX,
      RATE_LIMIT_PUBLIC_TTL_MS: GATEWAY_ENV_DEFAULTS.RATE_LIMIT_PUBLIC_TTL_MS,
      RATE_LIMIT_PUBLIC_MAX: GATEWAY_ENV_DEFAULTS.RATE_LIMIT_PUBLIC_MAX,
      PAYLOAD_LIMIT: GATEWAY_ENV_DEFAULTS.PAYLOAD_LIMIT,
    });
  });

  it('fails fast when required JWT and TCP values are missing', () => {
    expect(() => createGatewayEnv({})).toThrow(GatewayEnvError);
    expect(() => createGatewayEnv({})).toThrow(
      'Missing required gateway env: JWT_SECRET, USUARIO_SERVICE_HOST, USUARIO_SERVICE_TCP_PORT',
    );
  });

  it('rejects invalid numeric limits before bootstrap', () => {
    expect(() =>
      createGatewayEnv({
        JWT_SECRET: 'test-secret',
        USUARIO_SERVICE_HOST: 'usuario-service',
        USUARIO_SERVICE_TCP_PORT: 'not-a-port',
        TCP_TIMEOUT_MS: '0',
        RATE_LIMIT_MAX: '-1',
        RATE_LIMIT_AUTH_SENSITIVE_MAX: 'none',
      }),
    ).toThrow(
      'Invalid gateway env: USUARIO_SERVICE_TCP_PORT must be a number between 1 and 65535; TCP_TIMEOUT_MS must be a positive integer; RATE_LIMIT_MAX must be a positive integer; RATE_LIMIT_AUTH_SENSITIVE_MAX must be a positive integer',
    );
  });
});
