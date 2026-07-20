import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  ActivityLogResult,
  type ActivityLogDetailDTO,
  type ActivityLogDetailResponseDTO,
  type ActivityLogListResponseDTO,
  type ActivityLogRowDTO,
  type GetActivityLogByIdRequestDTO,
  type ListActivityLogsRequestDTO,
} from '@agua/contracts';
import { isValidObjectId, type Model } from 'mongoose';
import { ACTIVITY_LOG_MODEL, type ActivityLogModelRecord } from './activity-log.schema';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const VALID_RESULTS: readonly ActivityLogResult[] = Object.values(ActivityLogResult);
const ISO_DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

@Injectable()
export class ActivityLogsService {
  constructor(@InjectModel(ACTIVITY_LOG_MODEL) private readonly activityLogModel: Model<ActivityLogModelRecord>) {}

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

interface DateRangeFilter { $gte?: Date; $lte?: Date; }

interface ActivityLogMongoFilter {
  source?: string; action?: string; result?: ActivityLogResult; createdAt?: DateRangeFilter;
  $or?: ActivityLogActorFilter[];
}

type ActivityLogActorFilter = { 'actor.userId': string } | { 'actor.email': string } | { 'actor.role': string };
