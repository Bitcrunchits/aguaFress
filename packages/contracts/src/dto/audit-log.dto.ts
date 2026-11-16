// ─── Super-admin audit log ───
// Endpoint: GET /super-admin/audit-log
// Access: SUPER_ADMIN only

import { AuditAction, UserRole } from '../enums';
import type { PaginationRequest, PaginationResponse } from './common.dto';

/**
 * Query filters for the `super-admin.audit-log` list endpoint. All fields are
 * optional; `from`/`to` are ISO 8601 date strings applied to `created_at`.
 * `actorUserId` is the AUTH_USER.id of the actor that performed the action.
 */
export interface AuditLogListFilters extends PaginationRequest {
  actorUserId?: string;
  accion?: AuditAction;
  targetId?: string;
  from?: string;
  to?: string;
}

/**
 * A single audit-log row. The gateway exposes the actor's identity under the
 * legacy wire names `usuarioId`/`usuarioEmail`/`usuarioRole`; the consumer
 * service renames them to the domain names below (`actorUserId` per the
 * AGENTS.md identity rule, `email`, `role`). `accion` holds an `AuditAction`
 * enum value; consumers should map it to a label with a fallback for values
 * not yet in the enum.
 */
export interface AuditLogEntry {
  id: string;
  accion: AuditAction;
  actorUserId: string | null;
  email: string | null;
  role: UserRole | null;
  targetId: string | null;
  /** Arbitrary JSON recorded by the service that performed the action. */
  detalle: unknown;
  ip: string | null;
  createdAt: string;
}

export interface AuditLogListResponse {
  data: AuditLogEntry[];
  pagination: PaginationResponse;
}
