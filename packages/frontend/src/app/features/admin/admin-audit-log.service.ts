import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, type Observable } from 'rxjs';
import { UserRole, type AuditLogEntry, type AuditLogListFilters, type AuditLogListResponse, type PaginationResponse } from '@agua/contracts';
import { API_CONFIG } from '../../core/config/api.config';

const AUDIT_LOG_URL = `${API_CONFIG.baseUrl}/api/v1/super-admin/audit-log`;

/**
 * The gateway exposes the audit actor's identity under the legacy wire names
 * `usuarioId`/`usuarioEmail`/`usuarioRole` (query param and response fields).
 * The domain contract uses `actorUserId`/`email`/`role` per the AGENTS.md
 * identity rule, so this service adapts the wire shape on both sides: the
 * request translates the filter key and `mapEntry` renames the response fields.
 */
type AuditLogEntryWire = Omit<AuditLogEntry, 'actorUserId' | 'email' | 'role'> & {
  usuarioId: string | null;
  usuarioEmail: string | null;
  usuarioRole: UserRole | null;
};

interface AuditLogListResponseWire {
  data: AuditLogEntryWire[];
  pagination: PaginationResponse;
}

/**
 * Super-admin audit log against the gateway `super-admin.audit-log` action.
 * This is a GET endpoint, so filters travel in the query string.
 */
@Injectable({ providedIn: 'root' })
export class AdminAuditLogService {
  private readonly http = inject(HttpClient);

  list(filters: AuditLogListFilters): Observable<AuditLogListResponse> {
    return this.http
      .get<AuditLogListResponseWire>(AUDIT_LOG_URL, {
        params: buildAuditLogQueryParams(filters),
      })
      .pipe(
        map(({ data, pagination }) => ({
          data: data.map(mapEntry),
          pagination,
        })),
      );
  }
}

function mapEntry(entry: AuditLogEntryWire): AuditLogEntry {
  const { usuarioId, usuarioEmail, usuarioRole, ...rest } = entry;
  return {
    ...rest,
    actorUserId: usuarioId,
    email: usuarioEmail,
    role: usuarioRole,
  };
}

function buildAuditLogQueryParams(filters: AuditLogListFilters): HttpParams {
  let params = new HttpParams();
  if (filters.page !== undefined) {
    params = params.set('page', String(filters.page));
  }
  if (filters.limit !== undefined) {
    params = params.set('limit', String(filters.limit));
  }
  if (filters.actorUserId !== undefined) {
    // Legacy wire name: the backend reads the actor filter as `usuarioId`.
    params = params.set('usuarioId', filters.actorUserId);
  }
  if (filters.accion !== undefined) {
    params = params.set('accion', filters.accion);
  }
  if (filters.targetId !== undefined) {
    params = params.set('targetId', filters.targetId);
  }
  if (filters.from !== undefined) {
    params = params.set('from', filters.from);
  }
  if (filters.to !== undefined) {
    params = params.set('to', filters.to);
  }
  return params;
}
