import { UserRole } from '../enums';
import type {
  ActivityLogDetailDTO,
  ActivityLogDetailResponseDTO,
  ActivityLogListResponseDTO,
  ActivityLogRowDTO,
  CreateActivityLogRequestDTO,
  GetActivityLogByIdRequestDTO,
  ListActivityLogsRequestDTO,
} from '../index';
import { ActivityLogAction, ActivityLogResult, ActivityLogSource } from '../index';

const listRequestCheck: ListActivityLogsRequestDTO = {
  source: 'usuario-service',
  action: 'USER_LOGIN',
  actor: 'admin@aguafress.test',
  result: ActivityLogResult.SUCCESS,
  from: '2026-07-18T00:00:00.000Z',
  to: '2026-07-18T23:59:59.999Z',
  page: 1,
  limit: 20,
};

const rowCheck: ActivityLogRowDTO = {
  id: '507f1f77bcf86cd799439011',
  createdAt: '2026-07-18T12:00:00.000Z',
  source: 'usuario-service',
  action: 'USER_LOGIN',
  actor: {
    userId: '550e8400-e29b-41d4-a716-446655440000',
    email: 'admin@aguafress.test',
    role: UserRole.SUPER_ADMIN,
  },
  entity: {
    type: 'user',
    id: '550e8400-e29b-41d4-a716-446655440000',
  },
  result: ActivityLogResult.SUCCESS,
  summary: 'Super admin logged in',
};

const detailCheck: ActivityLogDetailDTO = {
  ...rowCheck,
  requestId: 'request-1',
  metadata: {
    ip: '127.0.0.1',
    userAgent: 'contract-check',
  },
};

const createRequestCheck: CreateActivityLogRequestDTO = {
  source: ActivityLogSource.USUARIO_SERVICE,
  action: ActivityLogAction.USER_LOGIN,
  actor: rowCheck.actor,
  entity: rowCheck.entity,
  result: ActivityLogResult.SUCCESS,
  summary: 'Super admin logged in',
  metadata: detailCheck.metadata,
  createdAt: rowCheck.createdAt,
  requestId: detailCheck.requestId,
  eventId: '1753032000000-0',
};

const getByIdRequestCheck: GetActivityLogByIdRequestDTO = {
  id: detailCheck.id,
};

const detailResponseCheck: ActivityLogDetailResponseDTO = {
  data: detailCheck,
};

const listResponseCheck: ActivityLogListResponseDTO = {
  data: [rowCheck],
  meta: {
    page: listRequestCheck.page ?? 1,
    limit: listRequestCheck.limit ?? 20,
    total: 1,
    totalPages: 1,
  },
};

void listRequestCheck;
void rowCheck;
void detailCheck;
void createRequestCheck;
void getByIdRequestCheck;
void detailResponseCheck;
void listResponseCheck;
