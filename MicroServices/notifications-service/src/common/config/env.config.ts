const DEFAULT_TCP_PORT = 3016;
const MAX_TCP_PORT = 65535;
const DEFAULT_MONGODB_URI = 'mongodb://localhost:27017/agua_notifications';
const DEFAULT_REDIS_URL = 'redis://localhost:6379';
const DEFAULT_STREAM_NAMES = ['auth.events', 'user.events', 'products.events', 'orders.events', 'deliveries.events'] as const;
const DEFAULT_STREAM_GROUP = 'notifications-service';
const DEFAULT_STREAM_CONSUMER = 'notifications-service-1';

export interface RedisStreamsConfig {
  readonly enabled: boolean;
  readonly redisUrl: string;
  readonly streamNames: readonly string[];
  readonly groupName: string;
  readonly consumerName: string;
}

export type RedisStreamsEnv = Partial<Record<'REDIS_URL' | 'NOTIFICATIONS_STREAMS_ENABLED' | 'NOTIFICATIONS_STREAM_NAMES' | 'NOTIFICATIONS_STREAM_GROUP' | 'NOTIFICATIONS_STREAM_CONSUMER', string>>;

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

export function getMongoUri(value: string | undefined = process.env.MONGODB_URI): string {
  if (value === undefined) {
    return DEFAULT_MONGODB_URI;
  }
  if (value.trim() === '') {
    throw new Error('MONGODB_URI is required');
  }

  return value;
}

export function getRedisStreamsConfig(env: RedisStreamsEnv = process.env): RedisStreamsConfig {
  const enabled = env.NOTIFICATIONS_STREAMS_ENABLED === 'true';
  const streamNames = parseStreamNames(env.NOTIFICATIONS_STREAM_NAMES);
  if (enabled && streamNames.length === 0) {
    throw new Error('NOTIFICATIONS_STREAM_NAMES is required when streams are enabled');
  }

  return {
    enabled,
    redisUrl: readOptionalEnv(env.REDIS_URL, DEFAULT_REDIS_URL, 'REDIS_URL'),
    streamNames: streamNames.length === 0 ? DEFAULT_STREAM_NAMES : streamNames,
    groupName: readOptionalEnv(env.NOTIFICATIONS_STREAM_GROUP, DEFAULT_STREAM_GROUP, 'NOTIFICATIONS_STREAM_GROUP'),
    consumerName: readOptionalEnv(env.NOTIFICATIONS_STREAM_CONSUMER, DEFAULT_STREAM_CONSUMER, 'NOTIFICATIONS_STREAM_CONSUMER'),
  };
}

function parseStreamNames(value: string | undefined): readonly string[] {
  if (value === undefined) return [];
  return value.split(',').map((item) => item.trim()).filter((item) => item !== '');
}

function readOptionalEnv(value: string | undefined, fallback: string, key: string): string {
  if (value === undefined) return fallback;
  if (value.trim() === '') throw new Error(`${key} is required`);
  return value;
}
