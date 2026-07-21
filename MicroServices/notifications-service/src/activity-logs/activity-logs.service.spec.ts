import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  ActivityLogAction,
  ActivityLogResult,
  ActivityLogSource,
  UserRole,
  type CreateActivityLogRequestDTO,
} from '@agua/contracts';
import { Types, type Model } from 'mongoose';
import { ActivityLogsService } from './activity-logs.service';
import type { ActivityLogModelRecord } from './activity-log.schema';

describe('ActivityLogsService', () => {
  it('creates a valid activity log with ISO createdAt and requestId dedupe key', async () => {
    const createdAt = '2026-07-20T10:30:00.000Z';
    const model = modelMock([], 0);
    model.create.mockResolvedValue(record({
      _id: objectId('010'),
      source: ActivityLogSource.USUARIO_SERVICE,
      action: ActivityLogAction.USER_LOGIN,
      createdAt: new Date(createdAt),
      requestId: 'request-1',
      dedupeKey: 'request-1',
    }));

    const response = await service(model).create(createRequest({ createdAt, requestId: 'request-1' }));

    expect(model.create).toHaveBeenCalledWith(expect.objectContaining({
      source: ActivityLogSource.USUARIO_SERVICE,
      action: ActivityLogAction.USER_LOGIN,
      createdAt: new Date(createdAt),
      requestId: 'request-1',
      dedupeKey: 'request-1',
    }));
    expect(response.data).toEqual(expect.objectContaining({ id: objectId('010').toHexString(), createdAt, requestId: 'request-1' }));
  });

  it('defaults missing producer timestamps to an ISO string and allows keyless duplicate creates', async () => {
    const model = modelMock([], 0);
    model.create
      .mockResolvedValueOnce(record({ _id: objectId('011'), createdAt: new Date('2026-07-20T11:00:00.000Z'), requestId: undefined, dedupeKey: undefined }))
      .mockResolvedValueOnce(record({ _id: objectId('012'), createdAt: new Date('2026-07-20T11:00:01.000Z'), requestId: undefined, dedupeKey: undefined }));

    const firstResponse = await service(model).create(createRequest({ requestId: undefined, eventId: undefined, createdAt: undefined }));
    const secondResponse = await service(model).create(createRequest({ requestId: undefined, eventId: undefined, createdAt: undefined }));

    expect(model.findOne).not.toHaveBeenCalled();
    expect(model.create).toHaveBeenCalledTimes(2);
    expect(firstResponse.data.createdAt).toBe('2026-07-20T11:00:00.000Z');
    expect(secondResponse.data.id).toBe(objectId('012').toHexString());
  });

  it('rejects invalid create enum values and non-ISO timestamps without persistence', async () => {
    const model = modelMock([], 0);
    const activityLogsService = service(model);

    await expect(activityLogsService.create(createRequest({ source: 'bad-source' as ActivityLogSource }))).rejects.toThrow(BadRequestException);
    await expect(activityLogsService.create(createRequest({ action: 'bad-action' as ActivityLogAction }))).rejects.toThrow(BadRequestException);
    await expect(activityLogsService.create(createRequest({ result: 'bad-result' as ActivityLogResult }))).rejects.toThrow(BadRequestException);
    await expect(activityLogsService.create(createRequest({ createdAt: '2026-07-20 10:30:00' }))).rejects.toThrow(BadRequestException);
    expect(model.create).not.toHaveBeenCalled();
  });

  it('returns an existing activity log when requestId or eventId has already been ingested', async () => {
    const existing = record({ _id: objectId('013'), requestId: 'event-1', dedupeKey: 'event-1' });
    const model = modelMock([], 0);
    model.findOne.mockReturnValue(leanExec(existing));

    const response = await service(model).create(createRequest({ requestId: undefined, eventId: 'event-1' }));

    expect(model.findOne).toHaveBeenCalledWith({ dedupeKey: 'event-1' });
    expect(model.create).not.toHaveBeenCalled();
    expect(response.data.id).toBe(objectId('013').toHexString());
  });

  it('returns the existing activity log after a duplicate-key race during create', async () => {
    const existing = record({ _id: objectId('014'), requestId: 'request-race', dedupeKey: 'request-race' });
    const model = modelMock([], 0);
    model.findOne
      .mockReturnValueOnce(leanExec(null))
      .mockReturnValueOnce(leanExec(existing));
    model.create.mockRejectedValue({ code: 11000 });

    const response = await service(model).create(createRequest({ requestId: 'request-race' }));

    expect(model.findOne).toHaveBeenCalledTimes(2);
    expect(response.data.id).toBe(objectId('014').toHexString());
  });

  it('lists logs newest first with pagination metadata and row DTO mapping', async () => {
    const newest = record({ _id: objectId('002'), createdAt: new Date('2026-07-19T12:00:00.000Z'), summary: 'Newest' });
    const older = record({ _id: objectId('001'), createdAt: new Date('2026-07-19T11:00:00.000Z'), summary: 'Older' });
    const model = modelMock([newest, older], 22);
    const response = await service(model).list({ page: 2, limit: 2 });
    expect(model.find).toHaveBeenCalledWith({});
    expect(model.findQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(model.findQuery.skip).toHaveBeenCalledWith(2);
    expect(model.findQuery.limit).toHaveBeenCalledWith(2);
    expect(response).toEqual({
      data: [
        expect.objectContaining({ id: objectId('002').toHexString(), createdAt: '2026-07-19T12:00:00.000Z', summary: 'Newest' }),
        expect.objectContaining({ id: objectId('001').toHexString(), createdAt: '2026-07-19T11:00:00.000Z', summary: 'Older' }),
      ],
      meta: { page: 2, limit: 2, total: 22, totalPages: 11 },
    });
  });

  it('builds filters and defaults pagination for list requests', async () => {
    const model = modelMock([record({})], 1);

    await service(model).list({
      source: 'usuario-service', action: 'USER_LOGIN', actor: 'admin@aguafress.test', result: ActivityLogResult.FAILURE,
      from: '2026-07-01T00:00:00.000Z', to: '2026-07-31T23:59:59.999Z',
    });
    expect(model.find).toHaveBeenCalledWith({
      source: 'usuario-service', action: 'USER_LOGIN', result: ActivityLogResult.FAILURE,
      createdAt: { $gte: new Date('2026-07-01T00:00:00.000Z'), $lte: new Date('2026-07-31T23:59:59.999Z') },
      $or: [{ 'actor.userId': 'admin@aguafress.test' }, { 'actor.email': 'admin@aguafress.test' }, { 'actor.role': 'admin@aguafress.test' }],
    });
    expect(model.findQuery.skip).toHaveBeenCalledWith(0);
    expect(model.findQuery.limit).toHaveBeenCalledWith(20);
  });

  it('rejects invalid filters, pagination, ObjectIds, and missing records', async () => {
    const activityLogsService = service(modelMock([], 0, null));
    await expect(activityLogsService.list({ from: 'not-a-date' })).rejects.toThrow(BadRequestException);
    await expect(activityLogsService.list({ from: '1' })).rejects.toThrow(BadRequestException);
    await expect(activityLogsService.list({ from: '2026-07-19 10:00:00' })).rejects.toThrow(BadRequestException);
    await expect(activityLogsService.list({ from: '2026-07-20T00:00:00.000Z', to: '2026-07-19T00:00:00.000Z' })).rejects.toThrow(BadRequestException);
    await expect(activityLogsService.list({ page: 0 })).rejects.toThrow(BadRequestException);
    await expect(activityLogsService.list({ limit: 101 })).rejects.toThrow(BadRequestException);
    await expect(activityLogsService.list({ result: 'unknown' as ActivityLogResult })).rejects.toThrow(BadRequestException);
    await expect(activityLogsService.getById({ id: 'invalid-id' })).rejects.toThrow(BadRequestException);
    await expect(activityLogsService.getById({ id: objectId('004').toHexString() })).rejects.toThrow(NotFoundException);
  });

  it('returns a detail DTO by ObjectId with metadata and request id', async () => {
    const id = objectId('003');
    const model = modelMock([], 0, record({ _id: id, metadata: { ip: '127.0.0.1' }, requestId: 'req-1' }));
    const response = await service(model).getById({ id: id.toHexString() });
    expect(model.findById).toHaveBeenCalledWith(id.toHexString());
    expect(response.data).toEqual(expect.objectContaining({ id: id.toHexString(), metadata: { ip: '127.0.0.1' }, requestId: 'req-1' }));
  });
});

function service(model: ActivityLogModelMock): ActivityLogsService {
  return new ActivityLogsService(model as unknown as Model<ActivityLogModelRecord>);
}

function modelMock(records: readonly ActivityLogModelRecord[], total: number, detail: ActivityLogModelRecord | null = records[0] ?? null): ActivityLogModelMock {
  const findQuery = chain(records);
  return { find: jest.fn(() => findQuery), countDocuments: jest.fn(() => exec(total)), findById: jest.fn(() => leanExec(detail)), findOne: jest.fn(() => leanExec(null)), create: jest.fn(), findQuery };
}
function chain<T>(value: T): ChainQueryMock<T> {
  const query = { sort: jest.fn(), skip: jest.fn(), limit: jest.fn(), lean: jest.fn(), exec: jest.fn().mockResolvedValue(value) } as ChainQueryMock<T>;
  query.sort.mockReturnValue(query); query.skip.mockReturnValue(query); query.limit.mockReturnValue(query); query.lean.mockReturnValue(query);
  return query;
}
function leanExec<T>(value: T): LeanExecQueryMock<T> {
  const query = { lean: jest.fn(), exec: jest.fn().mockResolvedValue(value) } as LeanExecQueryMock<T>;
  query.lean.mockReturnValue(query);
  return query;
}
function exec<T>(value: T): ExecQueryMock<T> {
  return { exec: jest.fn().mockResolvedValue(value) };
}
function record(overrides: Partial<ActivityLogModelRecord>): ActivityLogModelRecord {
  return { _id: objectId('001'), createdAt: new Date('2026-07-19T10:00:00.000Z'), source: ActivityLogSource.USUARIO_SERVICE, action: ActivityLogAction.USER_LOGIN, actor: { userId: 'user-1', email: 'admin@aguafress.test', role: UserRole.SUPER_ADMIN }, entity: { type: 'USER', id: 'user-1' }, result: ActivityLogResult.SUCCESS, summary: 'Activity summary', metadata: {}, requestId: undefined, dedupeKey: undefined, ...overrides };
}

function createRequest(overrides: Partial<CreateActivityLogRequestDTO>): CreateActivityLogRequestDTO {
  return {
    source: ActivityLogSource.USUARIO_SERVICE,
    action: ActivityLogAction.USER_LOGIN,
    actor: { userId: 'user-1', email: 'admin@aguafress.test', role: UserRole.SUPER_ADMIN },
    entity: { type: 'USER', id: 'user-1' },
    result: ActivityLogResult.SUCCESS,
    summary: 'Super admin logged in',
    metadata: { ip: '127.0.0.1' },
    ...overrides,
  };
}

function objectId(suffix: string): Types.ObjectId {
  return new Types.ObjectId(`64d000000000000000000${suffix}`);
}

interface ActivityLogModelMock { readonly find: jest.Mock; readonly countDocuments: jest.Mock; readonly findById: jest.Mock; readonly findOne: jest.Mock; readonly create: jest.Mock; readonly findQuery: ChainQueryMock<readonly ActivityLogModelRecord[]>; }
interface ChainQueryMock<T> extends LeanExecQueryMock<T> { readonly sort: jest.Mock; readonly skip: jest.Mock; readonly limit: jest.Mock; }
interface LeanExecQueryMock<T> extends ExecQueryMock<T> { readonly lean: jest.Mock; }
interface ExecQueryMock<T> { readonly exec: jest.Mock<Promise<T>, []>; }
