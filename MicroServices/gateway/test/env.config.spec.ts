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
      ORDERS_SERVICE_HOST: 'orders-service',
      ORDERS_SERVICE_TCP_PORT: '3014',
      NOTIFICATIONS_SERVICE_HOST: 'notifications-service',
      NOTIFICATIONS_SERVICE_TCP_PORT: '3016',
      ENTREGAS_SERVICE_HOST: 'entregas-service',
      ENTREGAS_SERVICE_TCP_PORT: '3015',
      PRODUCTS_SERVICE_HOST: 'products-service',
      PRODUCTS_SERVICE_TCP_PORT: '3013',
    });

    expect(gatewayEnv).toEqual({
      PORT: GATEWAY_ENV_DEFAULTS.PORT,
      JWT_SECRET: 'test-secret',
      USUARIO_SERVICE_HOST: 'usuario-service',
      USUARIO_SERVICE_TCP_PORT: 3011,
      ORDERS_SERVICE_HOST: 'orders-service',
      ORDERS_SERVICE_TCP_PORT: 3014,
      NOTIFICATIONS_SERVICE_HOST: 'notifications-service',
      NOTIFICATIONS_SERVICE_TCP_PORT: 3016,
      ENTREGAS_SERVICE_HOST: 'entregas-service',
      ENTREGAS_SERVICE_TCP_PORT: 3015,
      PRODUCTS_SERVICE_HOST: 'products-service',
      PRODUCTS_SERVICE_TCP_PORT: 3013,
      TCP_TIMEOUT_MS: GATEWAY_ENV_DEFAULTS.TCP_TIMEOUT_MS,
      RATE_LIMIT_TTL_MS: GATEWAY_ENV_DEFAULTS.RATE_LIMIT_TTL_MS,
      RATE_LIMIT_MAX: GATEWAY_ENV_DEFAULTS.RATE_LIMIT_MAX,
      RATE_LIMIT_AUTH_SENSITIVE_TTL_MS: GATEWAY_ENV_DEFAULTS.RATE_LIMIT_AUTH_SENSITIVE_TTL_MS,
      RATE_LIMIT_AUTH_SENSITIVE_MAX: GATEWAY_ENV_DEFAULTS.RATE_LIMIT_AUTH_SENSITIVE_MAX,
      RATE_LIMIT_PUBLIC_TTL_MS: GATEWAY_ENV_DEFAULTS.RATE_LIMIT_PUBLIC_TTL_MS,
      RATE_LIMIT_PUBLIC_MAX: GATEWAY_ENV_DEFAULTS.RATE_LIMIT_PUBLIC_MAX,
      PAYLOAD_LIMIT: GATEWAY_ENV_DEFAULTS.PAYLOAD_LIMIT,
      UPLOAD_DIR: GATEWAY_ENV_DEFAULTS.UPLOAD_DIR,
      REDIS_URL: 'redis://localhost:6379',
      ORDERS_CREATE_QUEUE_NAME: 'orders.create',
      ORDERS_CREATE_QUEUE_ATTEMPTS: 3,
      ORDERS_CREATE_QUEUE_BACKOFF_MS: 1000,
      ORDERS_CREATE_QUEUE_REMOVE_ON_COMPLETE: 1000,
      DELIVERIES_QUEUE_NAME: 'deliveries.update_status',
      DELIVERIES_QUEUE_ATTEMPTS: 3,
      DELIVERIES_QUEUE_BACKOFF_MS: 1000,
      DELIVERIES_QUEUE_REMOVE_ON_COMPLETE: 1000,
    });
  });

  it('accepts BullMQ Redis settings for async orders.create enqueue', () => {
    const gatewayEnv = createGatewayEnv({
      JWT_SECRET: 'test-secret',
      USUARIO_SERVICE_HOST: 'usuario-service',
      USUARIO_SERVICE_TCP_PORT: '3011',
      ORDERS_SERVICE_HOST: 'orders-service',
      ORDERS_SERVICE_TCP_PORT: '3014',
      NOTIFICATIONS_SERVICE_HOST: 'notifications-service',
      NOTIFICATIONS_SERVICE_TCP_PORT: '3016',
      ENTREGAS_SERVICE_HOST: 'entregas-service',
      ENTREGAS_SERVICE_TCP_PORT: '3015',
      PRODUCTS_SERVICE_HOST: 'products-service',
      PRODUCTS_SERVICE_TCP_PORT: '3013',
      REDIS_URL: 'redis://redis:6379',
      ORDERS_CREATE_QUEUE_NAME: 'orders.create.custom',
      ORDERS_CREATE_QUEUE_ATTEMPTS: '5',
      ORDERS_CREATE_QUEUE_BACKOFF_MS: '2500',
      ORDERS_CREATE_QUEUE_REMOVE_ON_COMPLETE: '50',
    });

    expect(gatewayEnv).toEqual(expect.objectContaining({
      REDIS_URL: 'redis://redis:6379',
      ORDERS_CREATE_QUEUE_NAME: 'orders.create.custom',
      ORDERS_CREATE_QUEUE_ATTEMPTS: 5,
      ORDERS_CREATE_QUEUE_BACKOFF_MS: 2500,
      ORDERS_CREATE_QUEUE_REMOVE_ON_COMPLETE: 50,
    }));
  });

  it('fails fast when required JWT and TCP values are missing', () => {
    expect(() => createGatewayEnv({})).toThrow(GatewayEnvError);
    expect(() => createGatewayEnv({})).toThrow(
      'Missing required gateway env: JWT_SECRET, USUARIO_SERVICE_HOST, USUARIO_SERVICE_TCP_PORT, ORDERS_SERVICE_HOST, ORDERS_SERVICE_TCP_PORT, NOTIFICATIONS_SERVICE_HOST, NOTIFICATIONS_SERVICE_TCP_PORT, ENTREGAS_SERVICE_HOST, ENTREGAS_SERVICE_TCP_PORT, PRODUCTS_SERVICE_HOST, PRODUCTS_SERVICE_TCP_PORT',
    );
  });

  it('rejects invalid numeric limits before bootstrap', () => {
    expect(() =>
      createGatewayEnv({
        JWT_SECRET: 'test-secret',
        USUARIO_SERVICE_HOST: 'usuario-service',
        USUARIO_SERVICE_TCP_PORT: 'not-a-port',
        ORDERS_SERVICE_HOST: 'orders-service',
        ORDERS_SERVICE_TCP_PORT: '70000',
        NOTIFICATIONS_SERVICE_HOST: 'notifications-service',
        NOTIFICATIONS_SERVICE_TCP_PORT: '0',
        ENTREGAS_SERVICE_HOST: 'entregas-service',
        ENTREGAS_SERVICE_TCP_PORT: 'invalid',
        PRODUCTS_SERVICE_HOST: 'products-service',
        PRODUCTS_SERVICE_TCP_PORT: '3013',
        TCP_TIMEOUT_MS: '0',
        RATE_LIMIT_MAX: '-1',
        RATE_LIMIT_AUTH_SENSITIVE_MAX: 'none',
      }),
    ).toThrow(
      'Invalid gateway env: USUARIO_SERVICE_TCP_PORT must be a number between 1 and 65535; ORDERS_SERVICE_TCP_PORT must be a number between 1 and 65535; NOTIFICATIONS_SERVICE_TCP_PORT must be a number between 1 and 65535; ENTREGAS_SERVICE_TCP_PORT must be a number between 1 and 65535; TCP_TIMEOUT_MS must be a positive integer; RATE_LIMIT_MAX must be a positive integer; RATE_LIMIT_AUTH_SENSITIVE_MAX must be a positive integer',
    );
  });
});
