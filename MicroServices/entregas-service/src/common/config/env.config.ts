import { readOptionalPositiveInteger } from '../utils/read-optional-positive-integer';

export const DELIVERIES_SERVICE_ENV_DEFAULTS = {
  REDIS_URL: 'redis://localhost:6379',
  DELIVERIES_QUEUE_NAME: 'deliveries.update_status',
  DELIVERIES_WORKER_CONCURRENCY: 1,
  DELIVERIES_QUEUE_ATTEMPTS: 3,
} as const;

export function validateEnv(): void {
  const env = process.env;
  const requiredEnvVars = [
    'DATABASE_URL',
    'TCP_PORT',
  ];
  for (const key of requiredEnvVars) {
    if (!env[key]) throw new Error(`Se requiere: ${key}`);
  }
}

export function getRedisUrl(value: string | undefined = process.env.REDIS_URL): string {
  return value ?? DELIVERIES_SERVICE_ENV_DEFAULTS.REDIS_URL;
}

export function getDeliveriesQueueName(value: string | undefined = process.env.DELIVERIES_QUEUE_NAME): string {
  return value ?? DELIVERIES_SERVICE_ENV_DEFAULTS.DELIVERIES_QUEUE_NAME;
}

export function getDeliveriesWorkerConcurrency(value: string | undefined = process.env.DELIVERIES_WORKER_CONCURRENCY): number {
  return readOptionalPositiveInteger(value, DELIVERIES_SERVICE_ENV_DEFAULTS.DELIVERIES_WORKER_CONCURRENCY, 'DELIVERIES_WORKER_CONCURRENCY').value;
}

export function getDeliveriesQueueAttempts(value: string | undefined = process.env.DELIVERIES_QUEUE_ATTEMPTS): number {
  return readOptionalPositiveInteger(value, DELIVERIES_SERVICE_ENV_DEFAULTS.DELIVERIES_QUEUE_ATTEMPTS, 'DELIVERIES_QUEUE_ATTEMPTS').value;
}