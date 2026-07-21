import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  ActivityLogAction,
  ActivityLogResult,
  ActivityLogSource,
  type ActivityLogDetailDTO,
  type ActivityLogDetailResponseDTO,
  type ActivityLogListResponseDTO,
  type ActivityLogRowDTO,
  type CreateActivityLogRequestDTO,
  type GetActivityLogByIdRequestDTO,
  type ListActivityLogsRequestDTO,
} from '@agua/contracts';
import { isValidObjectId, type Model } from 'mongoose';
import { ACTIVITY_LOG_MODEL, type ActivityLogModelRecord } from './activity-log.schema';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const VALID_SOURCES: readonly ActivityLogSource[] = Object.values(ActivityLogSource);
const VALID_ACTIONS: readonly ActivityLogAction[] = Object.values(ActivityLogAction);
const VALID_RESULTS: readonly ActivityLogResult[] = Object.values(ActivityLogResult);
const ISO_DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

@Injectable()
export class ActivityLogsService {
  constructor(@InjectModel(ACTIVITY_LOG_MODEL) private readonly activityLogModel: Model<ActivityLogModelRecord>) {}

  async create(request: CreateActivityLogRequestDTO): Promise<ActivityLogDetailResponseDTO> {
    const dedupeKey = resolveDedupeKey(request);
    const existingRecord = dedupeKey === undefined ? null : await this.findByDedupeKey(dedupeKey);
    if (existingRecord !== null) return { data: mapActivityLogDetail(existingRecord) };

    const createInput = buildCreateInput(request, dedupeKey);

    try {
      const createdRecord = await this.activityLogModel.create(createInput);
      return { data: mapActivityLogDetail(createdRecord) };
    } catch (error: unknown) {
      if (dedupeKey !== undefined && isDuplicateKeyError(error)) {
        const racedRecord = await this.findByDedupeKey(dedupeKey);
        if (racedRecord !== null) return { data: mapActivityLogDetail(racedRecord) };
      }
      throw error;
    }
  }

  async list(request: ListActivityLogsRequestDTO): Promise<ActivityLogListResponseDTO> {
    const page = normalizePage(request.page);
    const limit = normalizeLimit(request.limit);
    const filter = buildActivityLogFilter(request);
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      this.activityLogModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
      this.activityLogModel.countDocuments(filter).exec(),
    ]);

    return {
      data: records.map(mapActivityLogRow),
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async getById(request: GetActivityLogByIdRequestDTO): Promise<ActivityLogDetailResponseDTO> {
    if (!isValidObjectId(request.id)) {
      throw new BadRequestException('Invalid activity log id');
    }

    const record = await this.activityLogModel.findById(request.id).lean().exec();
    if (record === null) {
      throw new NotFoundException('Activity log not found');
    }

    return { data: mapActivityLogDetail(record) };
  }

  private async findByDedupeKey(dedupeKey: string): Promise<ActivityLogModelRecord | null> {
    return this.activityLogModel.findOne({ dedupeKey }).lean().exec();
  }
}

function buildCreateInput(request: CreateActivityLogRequestDTO, dedupeKey: string | undefined): ActivityLogCreateInput {
  if (!VALID_SOURCES.includes(request.source)) {
    throw new BadRequestException('Invalid activity log source');
  }
  if (!VALID_ACTIONS.includes(request.action)) {
    throw new BadRequestException('Invalid activity log action');
  }
  if (!VALID_RESULTS.includes(request.result)) {
    throw new BadRequestException('Invalid activity log result');
  }
  if (request.summary.trim() === '') {
    throw new BadRequestException('Activity log summary is required');
  }

  return {
    source: request.source,
    action: request.action,
    actor: request.actor ?? {},
    entity: request.entity ?? {},
    result: request.result,
    summary: request.summary,
    metadata: request.metadata ?? {},
    createdAt: request.createdAt === undefined ? new Date() : parseIsoDate(request.createdAt, 'createdAt'),
    requestId: request.requestId,
    dedupeKey,
  };
}

function resolveDedupeKey(request: CreateActivityLogRequestDTO): string | undefined {
  return request.requestId ?? request.eventId;
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

export function buildActivityLogFilter(request: ListActivityLogsRequestDTO): ActivityLogMongoFilter {
  const filter: ActivityLogMongoFilter = {};

  if (request.source !== undefined) filter.source = request.source;
  if (request.action !== undefined) filter.action = request.action;
  if (request.result !== undefined) {
    if (!VALID_RESULTS.includes(request.result)) {
      throw new BadRequestException('Invalid activity log result');
    }
    filter.result = request.result;
  }
  if (request.actor !== undefined) filter.$or = [{ 'actor.userId': request.actor }, { 'actor.email': request.actor }, { 'actor.role': request.actor }];

  const createdAt = buildCreatedAtFilter(request.from, request.to);
  if (createdAt !== undefined) filter.createdAt = createdAt;

  return filter;
}

function buildCreatedAtFilter(from?: string, to?: string): DateRangeFilter | undefined {
  const dateRange: DateRangeFilter = {};

  if (from !== undefined) dateRange.$gte = parseIsoDate(from, 'from');
  if (to !== undefined) dateRange.$lte = parseIsoDate(to, 'to');

  if (dateRange.$gte !== undefined && dateRange.$lte !== undefined && dateRange.$gte > dateRange.$lte) {
    throw new BadRequestException('Activity log from date must be before to date');
  }

  return Object.keys(dateRange).length === 0 ? undefined : dateRange;
}

function parseIsoDate(value: string, fieldName: string): Date {
  if (!ISO_DATE_TIME_PATTERN.test(value)) {
    throw new BadRequestException(`Invalid activity log ${fieldName} date`);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`Invalid activity log ${fieldName} date`);
  }
  return date;
}

function normalizePage(page?: number): number {
  const resolvedPage = page ?? DEFAULT_PAGE;
  if (!Number.isInteger(resolvedPage) || resolvedPage < 1) {
    throw new BadRequestException('Invalid activity log page');
  }
  return resolvedPage;
}

function normalizeLimit(limit?: number): number {
  const resolvedLimit = limit ?? DEFAULT_LIMIT;
  if (!Number.isInteger(resolvedLimit) || resolvedLimit < 1 || resolvedLimit > MAX_LIMIT) {
    throw new BadRequestException('Invalid activity log limit');
  }
  return resolvedLimit;
}

function mapActivityLogRow(record: ActivityLogModelRecord): ActivityLogRowDTO {
  const { source, action, actor, entity, result, summary } = record;
  return { id: record._id.toHexString(), createdAt: record.createdAt.toISOString(), source, action, actor, entity, result, summary };
}

function mapActivityLogDetail(record: ActivityLogModelRecord): ActivityLogDetailDTO {
  return { ...mapActivityLogRow(record), metadata: record.metadata, requestId: record.requestId };
}

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

interface DateRangeFilter { $gte?: Date; $lte?: Date; }

interface ActivityLogMongoFilter {
  source?: string; action?: string; result?: ActivityLogResult; createdAt?: DateRangeFilter;
  $or?: ActivityLogActorFilter[];
}

type ActivityLogActorFilter = { 'actor.userId': string } | { 'actor.email': string } | { 'actor.role': string };
