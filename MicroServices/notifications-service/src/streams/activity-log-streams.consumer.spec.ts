import { ActivityLogStreamsConsumer } from './activity-log-streams.consumer';
import type { RedisStreamsClient } from './redis-streams.client';
import { ActivityLogAction, ActivityLogResult, ActivityLogSource, UserRole, type ActivityLogDetailResponseDTO, type CreateActivityLogRequestDTO } from '@agua/contracts';
import { Types, type Model } from 'mongoose';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import type { ActivityLogModelRecord } from '../activity-logs/activity-log.schema';

describe('ActivityLogStreamsConsumer', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not start a Redis client when stream ingestion is disabled', async () => {
    const client = redisClientMock();
    const service = activityLogsServiceMock();
    const consumer = new ActivityLogStreamsConsumer({ enabled: false, redisUrl: 'redis://localhost:6379', streamNames: ['auth.events'], groupName: 'group', consumerName: 'consumer' }, client, service as unknown as ActivityLogsService);

    await consumer.onModuleInit();

    expect(client.ensureGroup).not.toHaveBeenCalled();
    expect(client.readGroup).not.toHaveBeenCalled();
    expect(service.create).not.toHaveBeenCalled();
  });

  it('consumes mapped stream events through ActivityLogsService.create and acknowledges them', async () => {
    const client = redisClientMock();
    client.readGroup.mockResolvedValue([{ streamName: 'auth.events', id: '1-0', event: { type: 'UserCreated', timestamp: '2026-07-20T12:00:00.000Z', userId: 'user-1', email: 'user@aguafress.test', role: UserRole.CLIENTE } }]);
    const service = activityLogsServiceMock();
    const consumer = new ActivityLogStreamsConsumer({ enabled: true, redisUrl: 'redis://localhost:6379', streamNames: ['auth.events'], groupName: 'group', consumerName: 'consumer' }, client, service as unknown as ActivityLogsService);

    await consumer.pollOnce();

    expect(client.ensureGroup).toHaveBeenCalledWith('auth.events', 'group');
    expect(service.create).toHaveBeenCalledWith(expect.objectContaining({ eventId: 'auth.events:1-0' }));
    expect(client.ack).toHaveBeenCalledWith('auth.events', 'group', '1-0');
  });

  it('recovers pending stream entries before reading new messages and acknowledges them', async () => {
    const client = redisClientMock();
    client.recoverPending.mockResolvedValue([
      { streamName: 'auth.events', id: '2-0', event: { type: 'UserCreated', timestamp: '2026-07-20T12:00:00.000Z', userId: 'user-2', email: 'pending@aguafress.test', role: UserRole.CLIENTE } },
    ]);
    const service = activityLogsServiceMock();
    const consumer = new ActivityLogStreamsConsumer({ enabled: true, redisUrl: 'redis://localhost:6379', streamNames: ['auth.events'], groupName: 'group', consumerName: 'consumer' }, client, service as unknown as ActivityLogsService);

    await consumer.pollOnce();

    expect(client.recoverPending).toHaveBeenCalledWith(['auth.events'], 'group', 'consumer');
    expect(service.create).toHaveBeenCalledWith(expect.objectContaining({ eventId: 'auth.events:2-0' }));
    expect(client.ack).toHaveBeenCalledWith('auth.events', 'group', '2-0');
    expect(client.readGroup).toHaveBeenCalledWith(['auth.events'], 'group', 'consumer');
  });

  it('persists events from different streams when Redis reuses the same message id', async () => {
    const client = redisClientMock();
    client.readGroup.mockResolvedValue([
      { streamName: 'auth.events', id: '1-0', event: { type: 'UserCreated', timestamp: '2026-07-20T12:00:00.000Z', userId: 'user-1', email: 'user@aguafress.test', role: UserRole.CLIENTE } },
      { streamName: 'orders.events', id: '1-0', event: { type: 'OrderCreated', timestamp: '2026-07-20T12:01:00.000Z', orderId: 'order-1', vendedorId: 'vendedor-1' } },
    ]);
    const model = dedupeModelMock();
    const activityLogsService = new ActivityLogsService(model as unknown as Model<ActivityLogModelRecord>);
    const consumer = new ActivityLogStreamsConsumer(
      { enabled: true, redisUrl: 'redis://localhost:6379', streamNames: ['auth.events', 'orders.events'], groupName: 'group', consumerName: 'consumer' },
      client,
      activityLogsService,
    );

    await consumer.pollOnce();

    expect(model.create).toHaveBeenCalledTimes(2);
    expect(model.create).toHaveBeenNthCalledWith(1, expect.objectContaining({ dedupeKey: 'auth.events:1-0' }));
    expect(model.create).toHaveBeenNthCalledWith(2, expect.objectContaining({ dedupeKey: 'orders.events:1-0' }));
    expect(client.ack).toHaveBeenCalledWith('auth.events', 'group', '1-0');
    expect(client.ack).toHaveBeenCalledWith('orders.events', 'group', '1-0');
  });

  it('continues polling while enabled until module destroy', async () => {
    jest.useFakeTimers();
    const client = redisClientMock();
    const service = activityLogsServiceMock();
    const consumer = new ActivityLogStreamsConsumer({ enabled: true, redisUrl: 'redis://localhost:6379', streamNames: ['auth.events'], groupName: 'group', consumerName: 'consumer' }, client, service as unknown as ActivityLogsService);

    await consumer.onModuleInit();
    expect(client.readGroup).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(5000);
    expect(client.readGroup).toHaveBeenCalledTimes(2);

    await consumer.onModuleDestroy();
    await jest.advanceTimersByTimeAsync(5000);
    expect(client.readGroup).toHaveBeenCalledTimes(2);
  });
});

function redisClientMock(): RedisClientMock {
  return {
    ensureGroup: jest.fn().mockResolvedValue(undefined),
    recoverPending: jest.fn().mockResolvedValue([]),
    readGroup: jest.fn().mockResolvedValue([]),
    ack: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
  };
}

function activityLogsServiceMock(): ActivityLogsServiceMock {
  return { create: jest.fn().mockResolvedValue({
    data: {
      id: 'activity-log-1',
      createdAt: '2026-07-20T12:00:00.000Z',
      source: ActivityLogSource.USUARIO_SERVICE,
      action: ActivityLogAction.USER_CREATED,
      actor: {},
      entity: {},
      result: ActivityLogResult.SUCCESS,
      summary: 'User created',
      metadata: {},
    },
  }) };
}

function dedupeModelMock(): DedupeActivityLogModelMock {
  const records = new Map<string, ActivityLogModelRecord>();
  let sequence = 1;
  const model = {
    findOne: jest.fn((filter: DedupeFilter) => leanExec(filter.dedupeKey === undefined ? null : records.get(filter.dedupeKey) ?? null)),
    create: jest.fn((input: ActivityLogCreateInput) => {
      const createdRecord = recordFromCreateInput(input, sequence);
      sequence += 1;
      if (input.dedupeKey !== undefined) records.set(input.dedupeKey, createdRecord);
      return Promise.resolve(createdRecord);
    }),
  };
  return model;
}

function leanExec<T>(value: T): LeanExecQueryMock<T> {
  const query = { lean: jest.fn(), exec: jest.fn().mockResolvedValue(value) } as LeanExecQueryMock<T>;
  query.lean.mockReturnValue(query);
  return query;
}

function recordFromCreateInput(input: ActivityLogCreateInput, sequence: number): ActivityLogModelRecord {
  return {
    _id: new Types.ObjectId(`64d000000000000000000${sequence.toString().padStart(3, '0')}`),
    createdAt: input.createdAt,
    source: input.source,
    action: input.action,
    actor: input.actor,
    entity: input.entity,
    result: input.result,
    summary: input.summary,
    metadata: input.metadata,
    requestId: input.requestId,
    dedupeKey: input.dedupeKey,
  };
}

interface RedisClientMock extends RedisStreamsClient {
  readonly ensureGroup: jest.Mock<Promise<void>, [string, string]>;
  readonly recoverPending: jest.Mock<Promise<readonly { readonly streamName: string; readonly id: string; readonly event: unknown }[]>, [readonly string[], string, string]>;
  readonly readGroup: jest.Mock<Promise<readonly { readonly streamName: string; readonly id: string; readonly event: unknown }[]>, [readonly string[], string, string]>;
  readonly ack: jest.Mock<Promise<void>, [string, string, string]>;
  readonly disconnect: jest.Mock<Promise<void>, []>;
}

interface ActivityLogsServiceMock {
  readonly create: jest.Mock<Promise<ActivityLogDetailResponseDTO>, [CreateActivityLogRequestDTO]>;
}

interface DedupeFilter { readonly dedupeKey?: string; }
interface LeanExecQueryMock<T> { readonly lean: jest.Mock; readonly exec: jest.Mock<Promise<T>, []>; }
interface DedupeActivityLogModelMock { readonly findOne: jest.Mock; readonly create: jest.Mock; }
interface ActivityLogCreateInput {
  readonly source: ActivityLogSource;
  readonly action: ActivityLogAction;
  readonly actor: ActivityLogModelRecord['actor'];
  readonly entity: ActivityLogModelRecord['entity'];
  readonly result: ActivityLogResult;
  readonly summary: string;
  readonly metadata: Record<string, unknown>;
  readonly createdAt: Date;
  readonly requestId?: string;
  readonly dedupeKey?: string;
}
