import Redis from 'ioredis';
import { IoredisStreamsClient } from './ioredis-streams.client';

jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn(() => mockRedisInstance),
}));

let mockRedisInstance: RedisInstanceMock;

describe('IoredisStreamsClient', () => {
  beforeEach(() => {
    mockRedisInstance = redisInstanceMock();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates the Redis client from the configured URL and ignores existing consumer groups', async () => {
    mockRedisInstance.xgroup.mockRejectedValueOnce(new Error('BUSYGROUP Consumer Group name already exists'));

    const client = new IoredisStreamsClient('redis://localhost:6379');
    await client.ensureGroup('auth.events', 'notifications-service');

    expect(Redis).toHaveBeenCalledWith('redis://localhost:6379');
    expect(mockRedisInstance.xgroup).toHaveBeenCalledWith('CREATE', 'auth.events', 'notifications-service', '0', 'MKSTREAM');
  });

  it('rethrows Redis group creation errors that are not BUSYGROUP idempotency responses', async () => {
    mockRedisInstance.xgroup.mockRejectedValueOnce(new Error('NOAUTH Authentication required'));

    const client = new IoredisStreamsClient('redis://localhost:6379');

    await expect(client.ensureGroup('auth.events', 'notifications-service')).rejects.toThrow('NOAUTH Authentication required');
  });

  it('parses xreadgroup event fields into stream messages and skips malformed entries', async () => {
    mockRedisInstance.xreadgroup.mockResolvedValueOnce([
      ['auth.events', [['1-0', ['event', JSON.stringify({ type: 'UserCreated', timestamp: '2026-07-20T12:00:00.000Z' })]]]],
      ['orders.events', [['2-0', ['other', 'ignored']], ['2-1', ['event', '{not-json']]]],
    ]);

    const client = new IoredisStreamsClient('redis://localhost:6379');
    const messages = await client.readGroup(['auth.events', 'orders.events'], 'notifications-service', 'consumer-1');

    expect(mockRedisInstance.xreadgroup).toHaveBeenCalledWith(
      'GROUP', 'notifications-service', 'consumer-1',
      'COUNT', 10,
      'BLOCK', 100,
      'STREAMS', 'auth.events', 'orders.events', '>', '>',
    );
    expect(messages).toEqual([
      { streamName: 'auth.events', id: '1-0', event: { type: 'UserCreated', timestamp: '2026-07-20T12:00:00.000Z' } },
    ]);
  });

  it('recovers bounded pending entries with xautoclaim for each configured stream', async () => {
    mockRedisInstance.xautoclaim
      .mockResolvedValueOnce(['0-0', [['3-0', ['event', JSON.stringify({ type: 'UserCreated', timestamp: '2026-07-20T12:00:00.000Z' })]]]])
      .mockResolvedValueOnce(['0-0', []]);

    const client = new IoredisStreamsClient('redis://localhost:6379');
    const messages = await client.recoverPending(['auth.events', 'orders.events'], 'notifications-service', 'consumer-1');

    expect(mockRedisInstance.xautoclaim).toHaveBeenCalledWith('auth.events', 'notifications-service', 'consumer-1', 60000, '0-0', 'COUNT', 10);
    expect(mockRedisInstance.xautoclaim).toHaveBeenCalledWith('orders.events', 'notifications-service', 'consumer-1', 60000, '0-0', 'COUNT', 10);
    expect(messages).toEqual([
      { streamName: 'auth.events', id: '3-0', event: { type: 'UserCreated', timestamp: '2026-07-20T12:00:00.000Z' } },
    ]);
  });

  it('returns no recovered messages when xautoclaim finds no pending entries', async () => {
    mockRedisInstance.xautoclaim.mockResolvedValueOnce(['0-0', []]);

    const client = new IoredisStreamsClient('redis://localhost:6379');
    const messages = await client.recoverPending(['auth.events'], 'notifications-service', 'consumer-1');

    expect(mockRedisInstance.xautoclaim).toHaveBeenCalledTimes(1);
    expect(messages).toEqual([]);
  });

  it('acknowledges processed messages and disconnects the underlying Redis client', async () => {
    const client = new IoredisStreamsClient('redis://localhost:6379');

    await client.ack('auth.events', 'notifications-service', '1-0');
    await client.disconnect();

    expect(mockRedisInstance.xack).toHaveBeenCalledWith('auth.events', 'notifications-service', '1-0');
    expect(mockRedisInstance.disconnect).toHaveBeenCalledTimes(1);
  });
});

function redisInstanceMock(): RedisInstanceMock {
  return {
    xgroup: jest.fn().mockResolvedValue('OK'),
    xautoclaim: jest.fn().mockResolvedValue(['0-0', []]),
    xreadgroup: jest.fn().mockResolvedValue([]),
    xack: jest.fn().mockResolvedValue(1),
    disconnect: jest.fn(),
  };
}

interface RedisInstanceMock {
  readonly xgroup: jest.Mock<Promise<string>, [string, string, string, string, string]>;
  readonly xautoclaim: jest.Mock<Promise<unknown>, unknown[]>;
  readonly xreadgroup: jest.Mock<Promise<unknown>, unknown[]>;
  readonly xack: jest.Mock<Promise<number>, [string, string, string]>;
  readonly disconnect: jest.Mock<void, []>;
}
