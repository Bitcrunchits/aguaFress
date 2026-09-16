export const GATEWAY_ENV_DEFAULTS = {
  PORT: 3000,
  TCP_TIMEOUT_MS: 5000,
  RATE_LIMIT_TTL_MS: 60000,
  RATE_LIMIT_MAX: 100,
  RATE_LIMIT_AUTH_SENSITIVE_TTL_MS: 60000,
  RATE_LIMIT_AUTH_SENSITIVE_MAX: 10,
  RATE_LIMIT_PUBLIC_TTL_MS: 60000,
  RATE_LIMIT_PUBLIC_MAX: 300,
  PAYLOAD_LIMIT: '1mb',
  UPLOAD_DIR: '../../public/uploads',
  REDIS_URL: 'redis://localhost:6379',
  ORDERS_CREATE_QUEUE_NAME: 'orders.create',
  ORDERS_CREATE_QUEUE_ATTEMPTS: 3,
  ORDERS_CREATE_QUEUE_BACKOFF_MS: 1000,
  ORDERS_CREATE_QUEUE_REMOVE_ON_COMPLETE: 1000,
  DELIVERIES_QUEUE_NAME: 'deliveries.update_status',
  DELIVERIES_QUEUE_ATTEMPTS: 3,
  DELIVERIES_QUEUE_BACKOFF_MS: 1000,
  DELIVERIES_QUEUE_REMOVE_ON_COMPLETE: 1000,
} as const;

const REQUIRED_ENV_KEYS = {
  JWT_SECRET: 'JWT_SECRET',
  USUARIO_SERVICE_HOST: 'USUARIO_SERVICE_HOST',
  USUARIO_SERVICE_TCP_PORT: 'USUARIO_SERVICE_TCP_PORT',
  ORDERS_SERVICE_HOST: 'ORDERS_SERVICE_HOST',
  ORDERS_SERVICE_TCP_PORT: 'ORDERS_SERVICE_TCP_PORT',
  NOTIFICATIONS_SERVICE_HOST: 'NOTIFICATIONS_SERVICE_HOST',
  NOTIFICATIONS_SERVICE_TCP_PORT: 'NOTIFICATIONS_SERVICE_TCP_PORT',
  ENTREGAS_SERVICE_HOST: 'ENTREGAS_SERVICE_HOST',
  ENTREGAS_SERVICE_TCP_PORT: 'ENTREGAS_SERVICE_TCP_PORT',
  PRODUCTS_SERVICE_HOST: 'PRODUCTS_SERVICE_HOST',
  PRODUCTS_SERVICE_TCP_PORT: 'PRODUCTS_SERVICE_TCP_PORT',
} as const;

type RequiredEnvKey = (typeof REQUIRED_ENV_KEYS)[keyof typeof REQUIRED_ENV_KEYS];

export class GatewayEnvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GatewayEnvError';
  }
}

export interface GatewayEnv {
  readonly PORT: number;
  readonly JWT_SECRET: string;
  readonly USUARIO_SERVICE_HOST: string;
  readonly USUARIO_SERVICE_TCP_PORT: number;
  readonly ORDERS_SERVICE_HOST: string;
  readonly ORDERS_SERVICE_TCP_PORT: number;
  readonly NOTIFICATIONS_SERVICE_HOST: string;
  readonly NOTIFICATIONS_SERVICE_TCP_PORT: number;
  readonly ENTREGAS_SERVICE_HOST: string;
  readonly ENTREGAS_SERVICE_TCP_PORT: number;
  readonly PRODUCTS_SERVICE_HOST: string;
  readonly PRODUCTS_SERVICE_TCP_PORT: number;
  readonly TCP_TIMEOUT_MS: number;
  readonly RATE_LIMIT_TTL_MS: number;
  readonly RATE_LIMIT_MAX: number;
  readonly RATE_LIMIT_AUTH_SENSITIVE_TTL_MS: number;
  readonly RATE_LIMIT_AUTH_SENSITIVE_MAX: number;
  readonly RATE_LIMIT_PUBLIC_TTL_MS: number;
  readonly RATE_LIMIT_PUBLIC_MAX: number;
  readonly PAYLOAD_LIMIT: string;
  readonly UPLOAD_DIR: string;
  readonly REDIS_URL: string;
  readonly ORDERS_CREATE_QUEUE_NAME: string;
  readonly ORDERS_CREATE_QUEUE_ATTEMPTS: number;
  readonly ORDERS_CREATE_QUEUE_BACKOFF_MS: number;
  readonly ORDERS_CREATE_QUEUE_REMOVE_ON_COMPLETE: number;
  readonly DELIVERIES_QUEUE_NAME: string;
  readonly DELIVERIES_QUEUE_ATTEMPTS: number;
  readonly DELIVERIES_QUEUE_BACKOFF_MS: number;
  readonly DELIVERIES_QUEUE_REMOVE_ON_COMPLETE: number;
}

type GatewayEnvInput = Record<string, string | undefined>;

export function createGatewayEnv(envInput: GatewayEnvInput): GatewayEnv {
  assertRequiredEnv(envInput);

  const port = readOptionalPositiveInteger(envInput.PORT, GATEWAY_ENV_DEFAULTS.PORT, 'PORT');
  const usuarioServiceTcpPort = readRequiredPort(
    envInput.USUARIO_SERVICE_TCP_PORT,
    'USUARIO_SERVICE_TCP_PORT',
  );
  const ordersServiceTcpPort = readRequiredPort(
    envInput.ORDERS_SERVICE_TCP_PORT,
    'ORDERS_SERVICE_TCP_PORT',
  );
  const notificationsServiceTcpPort = readRequiredPort(
    envInput.NOTIFICATIONS_SERVICE_TCP_PORT,
    'NOTIFICATIONS_SERVICE_TCP_PORT',
  );
  const entregasServiceTcpPort = readRequiredPort(
    envInput.ENTREGAS_SERVICE_TCP_PORT,
    'ENTREGAS_SERVICE_TCP_PORT',
  );
  const productsServiceTcpPort = readRequiredPort(
    envInput.PRODUCTS_SERVICE_TCP_PORT,
    'PRODUCTS_SERVICE_TCP_PORT',
  );
  const tcpTimeoutMs = readOptionalPositiveInteger(
    envInput.TCP_TIMEOUT_MS,
    GATEWAY_ENV_DEFAULTS.TCP_TIMEOUT_MS,
    'TCP_TIMEOUT_MS',
  );
  const rateLimitTtlMs = readOptionalPositiveInteger(
    envInput.RATE_LIMIT_TTL_MS,
    GATEWAY_ENV_DEFAULTS.RATE_LIMIT_TTL_MS,
    'RATE_LIMIT_TTL_MS',
  );
  const rateLimitMax = readOptionalPositiveInteger(
    envInput.RATE_LIMIT_MAX,
    GATEWAY_ENV_DEFAULTS.RATE_LIMIT_MAX,
    'RATE_LIMIT_MAX',
  );
  const rateLimitAuthSensitiveTtlMs = readOptionalPositiveInteger(
    envInput.RATE_LIMIT_AUTH_SENSITIVE_TTL_MS,
    GATEWAY_ENV_DEFAULTS.RATE_LIMIT_AUTH_SENSITIVE_TTL_MS,
    'RATE_LIMIT_AUTH_SENSITIVE_TTL_MS',
  );
  const rateLimitAuthSensitiveMax = readOptionalPositiveInteger(
    envInput.RATE_LIMIT_AUTH_SENSITIVE_MAX,
    GATEWAY_ENV_DEFAULTS.RATE_LIMIT_AUTH_SENSITIVE_MAX,
    'RATE_LIMIT_AUTH_SENSITIVE_MAX',
  );
  const rateLimitPublicTtlMs = readOptionalPositiveInteger(
    envInput.RATE_LIMIT_PUBLIC_TTL_MS,
    GATEWAY_ENV_DEFAULTS.RATE_LIMIT_PUBLIC_TTL_MS,
    'RATE_LIMIT_PUBLIC_TTL_MS',
  );
  const rateLimitPublicMax = readOptionalPositiveInteger(
    envInput.RATE_LIMIT_PUBLIC_MAX,
    GATEWAY_ENV_DEFAULTS.RATE_LIMIT_PUBLIC_MAX,
    'RATE_LIMIT_PUBLIC_MAX',
  );
  const ordersCreateQueueAttempts = readOptionalPositiveInteger(
    envInput.ORDERS_CREATE_QUEUE_ATTEMPTS,
    GATEWAY_ENV_DEFAULTS.ORDERS_CREATE_QUEUE_ATTEMPTS,
    'ORDERS_CREATE_QUEUE_ATTEMPTS',
  );
  const ordersCreateQueueBackoffMs = readOptionalPositiveInteger(
    envInput.ORDERS_CREATE_QUEUE_BACKOFF_MS,
    GATEWAY_ENV_DEFAULTS.ORDERS_CREATE_QUEUE_BACKOFF_MS,
    'ORDERS_CREATE_QUEUE_BACKOFF_MS',
  );
  const ordersCreateQueueRemoveOnComplete = readOptionalPositiveInteger(
    envInput.ORDERS_CREATE_QUEUE_REMOVE_ON_COMPLETE,
    GATEWAY_ENV_DEFAULTS.ORDERS_CREATE_QUEUE_REMOVE_ON_COMPLETE,
    'ORDERS_CREATE_QUEUE_REMOVE_ON_COMPLETE',
  );
  const deliveriesQueueAttempts = readOptionalPositiveInteger(
    envInput.DELIVERIES_QUEUE_ATTEMPTS,
    GATEWAY_ENV_DEFAULTS.DELIVERIES_QUEUE_ATTEMPTS,
    'DELIVERIES_QUEUE_ATTEMPTS',
  );
  const deliveriesQueueBackoffMs = readOptionalPositiveInteger(
    envInput.DELIVERIES_QUEUE_BACKOFF_MS,
    GATEWAY_ENV_DEFAULTS.DELIVERIES_QUEUE_BACKOFF_MS,
    'DELIVERIES_QUEUE_BACKOFF_MS',
  );
  const deliveriesQueueRemoveOnComplete = readOptionalPositiveInteger(
    envInput.DELIVERIES_QUEUE_REMOVE_ON_COMPLETE,
    GATEWAY_ENV_DEFAULTS.DELIVERIES_QUEUE_REMOVE_ON_COMPLETE,
    'DELIVERIES_QUEUE_REMOVE_ON_COMPLETE',
  );

  const invalidMessages = [
    port.error,
    usuarioServiceTcpPort.error,
    ordersServiceTcpPort.error,
    notificationsServiceTcpPort.error,
    entregasServiceTcpPort.error,
    productsServiceTcpPort.error,
    tcpTimeoutMs.error,
    rateLimitTtlMs.error,
    rateLimitMax.error,
    rateLimitAuthSensitiveTtlMs.error,
    rateLimitAuthSensitiveMax.error,
    rateLimitPublicTtlMs.error,
    rateLimitPublicMax.error,
    ordersCreateQueueAttempts.error,
    ordersCreateQueueBackoffMs.error,
    ordersCreateQueueRemoveOnComplete.error,
    deliveriesQueueAttempts.error,
    deliveriesQueueBackoffMs.error,
    deliveriesQueueRemoveOnComplete.error,
  ].filter(isString);

  if (invalidMessages.length > 0) {
    throw new GatewayEnvError(`Invalid gateway env: ${invalidMessages.join('; ')}`);
  }

  return {
    PORT: port.value,
    JWT_SECRET: envInput.JWT_SECRET as string,
    USUARIO_SERVICE_HOST: envInput.USUARIO_SERVICE_HOST as string,
    USUARIO_SERVICE_TCP_PORT: usuarioServiceTcpPort.value,
    ORDERS_SERVICE_HOST: envInput.ORDERS_SERVICE_HOST as string,
    ORDERS_SERVICE_TCP_PORT: ordersServiceTcpPort.value,
    NOTIFICATIONS_SERVICE_HOST: envInput.NOTIFICATIONS_SERVICE_HOST as string,
    NOTIFICATIONS_SERVICE_TCP_PORT: notificationsServiceTcpPort.value,
    ENTREGAS_SERVICE_HOST: envInput.ENTREGAS_SERVICE_HOST as string,
    ENTREGAS_SERVICE_TCP_PORT: entregasServiceTcpPort.value,
    PRODUCTS_SERVICE_HOST: envInput.PRODUCTS_SERVICE_HOST as string,
    PRODUCTS_SERVICE_TCP_PORT: productsServiceTcpPort.value,
    TCP_TIMEOUT_MS: tcpTimeoutMs.value,
    RATE_LIMIT_TTL_MS: rateLimitTtlMs.value,
    RATE_LIMIT_MAX: rateLimitMax.value,
    RATE_LIMIT_AUTH_SENSITIVE_TTL_MS: rateLimitAuthSensitiveTtlMs.value,
    RATE_LIMIT_AUTH_SENSITIVE_MAX: rateLimitAuthSensitiveMax.value,
    RATE_LIMIT_PUBLIC_TTL_MS: rateLimitPublicTtlMs.value,
    RATE_LIMIT_PUBLIC_MAX: rateLimitPublicMax.value,
    PAYLOAD_LIMIT: envInput.PAYLOAD_LIMIT ?? GATEWAY_ENV_DEFAULTS.PAYLOAD_LIMIT,
    UPLOAD_DIR: envInput.UPLOAD_DIR ?? GATEWAY_ENV_DEFAULTS.UPLOAD_DIR,
    REDIS_URL: envInput.REDIS_URL ?? GATEWAY_ENV_DEFAULTS.REDIS_URL,
    ORDERS_CREATE_QUEUE_NAME: envInput.ORDERS_CREATE_QUEUE_NAME ?? GATEWAY_ENV_DEFAULTS.ORDERS_CREATE_QUEUE_NAME,
    ORDERS_CREATE_QUEUE_ATTEMPTS: ordersCreateQueueAttempts.value,
    ORDERS_CREATE_QUEUE_BACKOFF_MS: ordersCreateQueueBackoffMs.value,
    ORDERS_CREATE_QUEUE_REMOVE_ON_COMPLETE: ordersCreateQueueRemoveOnComplete.value,
    DELIVERIES_QUEUE_NAME: envInput.DELIVERIES_QUEUE_NAME ?? GATEWAY_ENV_DEFAULTS.DELIVERIES_QUEUE_NAME,
    DELIVERIES_QUEUE_ATTEMPTS: deliveriesQueueAttempts.value,
    DELIVERIES_QUEUE_BACKOFF_MS: deliveriesQueueBackoffMs.value,
    DELIVERIES_QUEUE_REMOVE_ON_COMPLETE: deliveriesQueueRemoveOnComplete.value,
  };
}

interface NumberReadResult {
  readonly value: number;
  readonly error: string | null;
}

function assertRequiredEnv(envInput: GatewayEnvInput): void {
  const missingKeys = Object.values(REQUIRED_ENV_KEYS).filter((key) => !hasValue(envInput[key]));

  if (missingKeys.length > 0) {
    throw new GatewayEnvError(`Missing required gateway env: ${missingKeys.join(', ')}`);
  }
}

function readOptionalPositiveInteger(
  rawValue: string | undefined,
  fallbackValue: number,
  envKey: string,
): NumberReadResult {
  if (!hasValue(rawValue)) {
    return { value: fallbackValue, error: null };
  }

  const parsedValue = Number(rawValue);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return { value: fallbackValue, error: `${envKey} must be a positive integer` };
  }

  return { value: parsedValue, error: null };
}

function readRequiredPort(rawValue: string | undefined, envKey: RequiredEnvKey): NumberReadResult {
  const parsedValue = Number(rawValue);

  if (!Number.isInteger(parsedValue) || parsedValue < 1 || parsedValue > 65535) {
    return { value: 0, error: `${envKey} must be a number between 1 and 65535` };
  }

  return { value: parsedValue, error: null };
}

function hasValue(value: string | undefined): value is string {
  return value !== undefined && value.trim().length > 0;
}

function isString(value: string | null): value is string {
  return value !== null;
}
