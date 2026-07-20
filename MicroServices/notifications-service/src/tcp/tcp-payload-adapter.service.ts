import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ActivityLogResult, UserRole, type GetActivityLogByIdRequestDTO, type ListActivityLogsRequestDTO } from '@agua/contracts';
import type { TcpAuthenticatedUser, TcpPayload } from './tcp-payload';

const VALID_ACTIVITY_LOG_RESULTS: readonly ActivityLogResult[] = Object.values(ActivityLogResult);

@Injectable()
export class TcpPayloadAdapter {
  requireRole(payload: TcpPayload, ...roles: readonly UserRole[]): TcpAuthenticatedUser {
    const user = this.requireUser(payload);
    if (!roles.includes(user.role)) {
      throw new ForbiddenException('Insufficient role for TCP handler');
    }

    return user;
  }

  listRequest(payload: TcpPayload): ListActivityLogsRequestDTO {
    const query = payload.query ?? {};
    return {
      source: this.readOptionalString(query, 'source'),
      action: this.readOptionalString(query, 'action'),
      actor: this.readOptionalString(query, 'actor'),
      result: this.readOptionalResult(query, 'result'),
      from: this.readOptionalString(query, 'from'),
      to: this.readOptionalString(query, 'to'),
      page: this.readOptionalPositiveInteger(query, 'page'),
      limit: this.readOptionalPositiveInteger(query, 'limit'),
    };
  }

  getByIdRequest(payload: TcpPayload): GetActivityLogByIdRequestDTO {
    const id = payload.params?.id ?? payload.query?.id;
    if (id === undefined || id.trim() === '') {
      throw new BadRequestException('Activity log id is required');
    }

    return { id };
  }

  private requireUser(payload: TcpPayload): TcpAuthenticatedUser {
    if (!this.isRecord(payload.user)) {
      throw new UnauthorizedException('Authenticated user is required');
    }

    const userId = this.readRequiredString(payload.user, 'sub') ?? this.readRequiredString(payload.user, 'userId');
    const email = this.readRequiredString(payload.user, 'email');
    const role = this.readUserRole(payload.user);

    if (!userId || !email || !role) {
      throw new UnauthorizedException('Authenticated user is required');
    }

    return { userId, email, role };
  }

  private readOptionalString(record: Record<string, string>, key: string): string | undefined {
    const value = record[key];
    return value !== undefined && value.trim() !== '' ? value : undefined;
  }

  private readRequiredString(record: Record<string, unknown>, key: string): string | undefined {
    const value = record[key];
    return typeof value === 'string' && value.trim() !== '' ? value : undefined;
  }

  private readOptionalPositiveInteger(record: Record<string, string>, key: string): number | undefined {
    const value = this.readOptionalString(record, key);
    if (value === undefined) return undefined;

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new BadRequestException(`${key} must be a positive integer`);
    }

    return parsed;
  }

  private readOptionalResult(record: Record<string, string>, key: string): ActivityLogResult | undefined {
    const value = this.readOptionalString(record, key);
    if (value === undefined) return undefined;
    if (!VALID_ACTIVITY_LOG_RESULTS.includes(value as ActivityLogResult)) {
      throw new BadRequestException('Invalid activity log result');
    }

    return value as ActivityLogResult;
  }

  private readUserRole(record: Record<string, unknown>): UserRole | undefined {
    const value = this.readRequiredString(record, 'role');
    return value !== undefined && this.isUserRole(value) ? value : undefined;
  }

  private isUserRole(value: string): value is UserRole {
    return Object.values(UserRole).includes(value as UserRole);
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
