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

export const ActivityLogSource = {
  USUARIO_SERVICE: 'usuario-service',
  GATEWAY: 'gateway',
  PRODUCTS_SERVICE: 'products-service',
  ORDERS_SERVICE: 'orders-service',
  ENTREGAS_SERVICE: 'entregas-service',
} as const;

export type ActivityLogSource =
  (typeof ActivityLogSource)[keyof typeof ActivityLogSource];

export const ActivityLogAction = {
  USER_CREATED: 'USER_CREATED',
  USER_LOGIN: 'USER_LOGIN',
  VENDEDOR_STATUS_CHANGED: 'VENDEDOR_STATUS_CHANGED',
  CARTERA_CLIENTE_ADDED: 'CARTERA_CLIENTE_ADDED',
  PRODUCT_UPDATED: 'PRODUCT_UPDATED',
  PRODUCT_DELETED: 'PRODUCT_DELETED',
  ORDER_CREATED: 'ORDER_CREATED',
  ORDER_STATUS_CHANGED: 'ORDER_STATUS_CHANGED',
  DELIVERY_STARTED: 'DELIVERY_STARTED',
  DELIVERY_COMPLETED: 'DELIVERY_COMPLETED',
  DELIVERY_STATUS_CHANGED: 'DELIVERY_STATUS_CHANGED',
} as const;

export type ActivityLogAction =
  (typeof ActivityLogAction)[keyof typeof ActivityLogAction];

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

export interface CreateActivityLogRequestDTO {
  source: ActivityLogSource;
  action: ActivityLogAction;
  actor?: ActivityLogActorDTO;
  entity?: ActivityLogEntityDTO;
  result: ActivityLogResult;
  summary: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  requestId?: string;
  eventId?: string;
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
