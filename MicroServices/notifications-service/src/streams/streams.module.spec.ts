import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import type { RedisStreamsConfig } from '../common/config/env.config';
import { ACTIVITY_LOG_MODEL } from '../activity-logs/activity-log.schema';
import { IoredisStreamsClient } from './ioredis-streams.client';
import { ActivityLogStreamsConsumer, REDIS_STREAMS_CLIENT, REDIS_STREAMS_CONFIG } from './activity-log-streams.consumer';
import { StreamsModule, createRedisStreamsClient } from './streams.module';

jest.mock('./ioredis-streams.client', () => ({
  IoredisStreamsClient: jest.fn().mockImplementation(() => ({
    ensureGroup: jest.fn().mockResolvedValue(undefined),
    readGroup: jest.fn().mockResolvedValue([]),
    ack: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('StreamsModule provider selection', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('selects a disabled no-op Redis streams client when stream ingestion is disabled', async () => {
    const client = createRedisStreamsClient(redisConfig({ enabled: false }));

    await expect(client.readGroup(['auth.events'], 'group', 'consumer')).resolves.toEqual([]);
    await expect(client.ensureGroup('auth.events', 'group')).resolves.toBeUndefined();
    await expect(client.ack('auth.events', 'group', '1-0')).resolves.toBeUndefined();
    await expect(client.disconnect()).resolves.toBeUndefined();
    expect(IoredisStreamsClient).not.toHaveBeenCalled();
  });

  it('selects the ioredis client when stream ingestion is enabled', () => {
    const client = createRedisStreamsClient(redisConfig({ enabled: true, redisUrl: 'redis://redis:6379' }));

    expect(client).toEqual(expect.objectContaining({ ensureGroup: expect.any(Function) }));
    expect(IoredisStreamsClient).toHaveBeenCalledWith('redis://redis:6379');
  });

  it('compiles the real StreamsModule with ActivityLogsModule provider wiring', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [StreamsModule] })
      .overrideProvider(REDIS_STREAMS_CONFIG)
      .useValue(redisConfig({ enabled: false }))
      .overrideProvider(REDIS_STREAMS_CLIENT)
      .useValue(redisStreamsClientMock())
      .overrideProvider(getModelToken(ACTIVITY_LOG_MODEL))
      .useValue(activityLogModelMock())
      .compile();

    expect(moduleRef.get(ActivityLogStreamsConsumer)).toBeInstanceOf(ActivityLogStreamsConsumer);

    await moduleRef.close();
  });
});

function redisConfig(overrides: Partial<RedisStreamsConfig>): RedisStreamsConfig {
  return {
    enabled: false,
    redisUrl: 'redis://localhost:6379',
    streamNames: ['auth.events'],
    groupName: 'notifications-service',
    consumerName: 'notifications-service-1',
    ...overrides,
  };
}

function redisStreamsClientMock(): RedisStreamsClientMock {
  return {
    ensureGroup: jest.fn().mockResolvedValue(undefined),
    readGroup: jest.fn().mockResolvedValue([]),
    ack: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
  };
}

function activityLogModelMock(): ActivityLogModelMock {
  return {
    find: jest.fn(),
    countDocuments: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  };
}

interface RedisStreamsClientMock {
  readonly ensureGroup: jest.Mock<Promise<void>, [string, string]>;
  readonly readGroup: jest.Mock<Promise<readonly unknown[]>, [readonly string[], string, string]>;
  readonly ack: jest.Mock<Promise<void>, [string, string, string]>;
  readonly disconnect: jest.Mock<Promise<void>, []>;
}

interface ActivityLogModelMock {
  readonly find: jest.Mock;
  readonly countDocuments: jest.Mock;
  readonly findById: jest.Mock;
  readonly findOne: jest.Mock;
  readonly create: jest.Mock;
}
