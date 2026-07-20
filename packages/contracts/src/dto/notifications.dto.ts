import type { PaginationRequest, PaginationResponse } from './common.dto';
import type { UserRole } from '../enums';

// ─── Notifications Service ───
// TCP-only activity-log read contracts owned by notifications-service.

export const ActivityLogResult = {
  SUCCESS: 'success',
  FAILURE: 'failure',
} as const;

export type ActivityLogResult =
  (typeof ActivityLogResult)[keyof typeof ActivityLogResult];

export interface ActivityLogActorDTO {
  userId?: string;
  email?: string;
  role?: UserRole;
}

export interface ActivityLogEntityDTO {
  type?: string;
  id?: string;
}

export interface ListActivityLogsRequestDTO extends PaginationRequest {
  source?: string;
  action?: string;
  actor?: string;
  result?: ActivityLogResult;
  from?: string;
  to?: string;
}

export interface GetActivityLogByIdRequestDTO {
  id: string;
}

export interface ActivityLogRowDTO {
  id: string;
  createdAt: string;
  source: string;
  action: string;
  actor: ActivityLogActorDTO;
  entity: ActivityLogEntityDTO;
  result: ActivityLogResult;
  summary: string;
}

export interface ActivityLogDetailDTO extends ActivityLogRowDTO {
  metadata: Record<string, unknown>;
  requestId?: string;
}

export interface ActivityLogListResponseDTO {
  data: ActivityLogRowDTO[];
  meta: PaginationResponse;
}

export interface ActivityLogDetailResponseDTO {
  data: ActivityLogDetailDTO;
}
