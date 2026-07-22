import Redis from 'ioredis';
import type { RedisStreamMessage, RedisStreamsClient } from './redis-streams.client';

const READ_COUNT = 10;
const BLOCK_MS = 100;
const PENDING_MIN_IDLE_MS = 60_000;
const STREAM_START_ID = '0-0';

export class IoredisStreamsClient implements RedisStreamsClient {
  private readonly redis: Redis;

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl);
  }

  async ensureGroup(streamName: string, groupName: string): Promise<void> {
    try {
      await this.redis.xgroup('CREATE', streamName, groupName, '0', 'MKSTREAM');
    } catch (error: unknown) {
      if (!isBusyGroupError(error)) throw error;
    }
  }

  async readGroup(streamNames: readonly string[], groupName: string, consumerName: string): Promise<readonly RedisStreamMessage[]> {
    const response = await this.redis.xreadgroup(
      'GROUP', groupName, consumerName,
      'COUNT', READ_COUNT,
      'BLOCK', BLOCK_MS,
      'STREAMS', ...streamNames, ...streamNames.map(() => '>'),
    );
    return parseStreamsResponse(response);
  }

  async recoverPending(streamNames: readonly string[], groupName: string, consumerName: string): Promise<readonly RedisStreamMessage[]> {
    const responses = await Promise.all(streamNames.map(async (streamName) => {
      const response = await this.redis.xautoclaim(streamName, groupName, consumerName, PENDING_MIN_IDLE_MS, STREAM_START_ID, 'COUNT', READ_COUNT);
      return parseAutoClaimResponse(streamName, response);
    }));
    return responses.flat();
  }

  async ack(streamName: string, groupName: string, id: string): Promise<void> {
    await this.redis.xack(streamName, groupName, id);
  }

  async disconnect(): Promise<void> {
    this.redis.disconnect();
  }
}

function parseStreamsResponse(response: unknown): readonly RedisStreamMessage[] {
  if (!Array.isArray(response)) return [];
  return response.flatMap(parseStreamEntry);
}

function parseStreamEntry(entry: unknown): readonly RedisStreamMessage[] {
  if (!Array.isArray(entry) || entry.length !== 2 || typeof entry[0] !== 'string' || !Array.isArray(entry[1])) return [];
  const streamName = entry[0];
  return entry[1].flatMap((message) => parseMessage(streamName, message));
}

function parseAutoClaimResponse(streamName: string, response: unknown): readonly RedisStreamMessage[] {
  if (!Array.isArray(response) || response.length < 2 || !Array.isArray(response[1])) return [];
  return response[1].flatMap((message) => parseMessage(streamName, message));
}

function parseMessage(streamName: string, message: unknown): readonly RedisStreamMessage[] {
  if (!Array.isArray(message) || message.length !== 2 || typeof message[0] !== 'string' || !Array.isArray(message[1])) return [];
  const event = parseFields(message[1]);
  return event === undefined ? [] : [{ streamName, id: message[0], event }];
}

function parseFields(fields: readonly unknown[]): unknown | undefined {
  const eventFieldIndex = fields.findIndex((field) => field === 'event');
  const eventJson = fields[eventFieldIndex + 1];
  if (typeof eventJson !== 'string') return undefined;
  try {
    return JSON.parse(eventJson) as unknown;
  } catch {
    return undefined;
  }
}

function isBusyGroupError(error: unknown): boolean {
  return error instanceof Error && error.message.includes('BUSYGROUP');
}
