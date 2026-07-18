const DEFAULT_TCP_PORT = 3014;
const MAX_TCP_PORT = 65535;
const DEFAULT_REDIS_URL = 'redis://localhost:6379';
const DEFAULT_ORDERS_CREATE_QUEUE_NAME = 'orders.create';
const DEFAULT_ORDERS_CREATE_QUEUE_ATTEMPTS = 3;
const DEFAULT_ORDERS_CREATE_WORKER_CONCURRENCY = 1;

export function getTcpPort(value: string | undefined = process.env.TCP_PORT): number {
  if (value === undefined || value.trim() === '') {
    return DEFAULT_TCP_PORT;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > MAX_TCP_PORT) {
    throw new Error('TCP_PORT must be an integer between 1 and 65535');
  }

  return port;
}

export function getRedisUrl(value: string | undefined = process.env.REDIS_URL): string {
  if (value === undefined || value.trim() === '') {
    return DEFAULT_REDIS_URL;
  }

  return value;
}

export function getOrdersCreateQueueName(value: string | undefined = process.env.ORDERS_CREATE_QUEUE_NAME): string {
  if (value === undefined || value.trim() === '') {
    return DEFAULT_ORDERS_CREATE_QUEUE_NAME;
  }

  return value;
}

export function getOrdersCreateQueueAttempts(value: string | undefined = process.env.ORDERS_CREATE_QUEUE_ATTEMPTS): number {
  return readPositiveInteger(value, DEFAULT_ORDERS_CREATE_QUEUE_ATTEMPTS, 'ORDERS_CREATE_QUEUE_ATTEMPTS');
}

export function getOrdersCreateWorkerConcurrency(value: string | undefined = process.env.ORDERS_CREATE_WORKER_CONCURRENCY): number {
  return readPositiveInteger(value, DEFAULT_ORDERS_CREATE_WORKER_CONCURRENCY, 'ORDERS_CREATE_WORKER_CONCURRENCY');
}

function readPositiveInteger(value: string | undefined, defaultValue: number, name: string): number {
  if (value === undefined || value.trim() === '') {
    return defaultValue;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer`);
  }

  return parsed;
}
