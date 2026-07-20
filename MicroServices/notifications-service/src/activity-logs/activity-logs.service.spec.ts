import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ActivityLogResult, UserRole } from '@agua/contracts';
import { Types, type Model } from 'mongoose';
import { ActivityLogsService } from './activity-logs.service';
import type { ActivityLogModelRecord } from './activity-log.schema';

describe('ActivityLogsService', () => {
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
  return { find: jest.fn(() => findQuery), countDocuments: jest.fn(() => exec(total)), findById: jest.fn(() => leanExec(detail)), findQuery };
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
  return { _id: objectId('001'), createdAt: new Date('2026-07-19T10:00:00.000Z'), source: 'usuario-service', action: 'USER_LOGIN', actor: { userId: 'user-1', email: 'admin@aguafress.test', role: UserRole.SUPER_ADMIN }, entity: { type: 'USER', id: 'user-1' }, result: ActivityLogResult.SUCCESS, summary: 'Activity summary', metadata: {}, requestId: undefined, ...overrides };
}

function objectId(suffix: string): Types.ObjectId {
  return new Types.ObjectId(`64d000000000000000000${suffix}`);
}

interface ActivityLogModelMock { readonly find: jest.Mock; readonly countDocuments: jest.Mock; readonly findById: jest.Mock; readonly findQuery: ChainQueryMock<readonly ActivityLogModelRecord[]>; }
interface ChainQueryMock<T> extends LeanExecQueryMock<T> { readonly sort: jest.Mock; readonly skip: jest.Mock; readonly limit: jest.Mock; }
interface LeanExecQueryMock<T> extends ExecQueryMock<T> { readonly lean: jest.Mock; }
interface ExecQueryMock<T> { readonly exec: jest.Mock<Promise<T>, []>; }
