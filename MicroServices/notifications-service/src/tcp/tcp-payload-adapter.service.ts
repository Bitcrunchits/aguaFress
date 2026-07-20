import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ActivityLogResult, UserRole, type GetActivityLogByIdRequestDTO, type ListActivityLogsRequestDTO } from '@agua/contracts';
import type { TcpAuthenticatedUser } from './tcp-payload';

const VALID_ACTIVITY_LOG_RESULTS: readonly ActivityLogResult[] = Object.values(ActivityLogResult);

@Injectable()
export class TcpPayloadAdapter {
  requireRole(payload: unknown, ...roles: readonly UserRole[]): TcpAuthenticatedUser {
    const user = this.requireUser(payload);
    if (!roles.includes(user.role)) {
      throw new ForbiddenException('Insufficient role for TCP handler');
    }

    return user;
  }

  listRequest(payload: unknown): ListActivityLogsRequestDTO {
    const payloadRecord = this.readPayloadRecord(payload);
    const query = this.readOptionalRecord(payloadRecord, 'query') ?? {};
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

  getByIdRequest(payload: unknown): GetActivityLogByIdRequestDTO {
    const payloadRecord = this.readPayloadRecord(payload);
    const params = this.readOptionalRecord(payloadRecord, 'params');
    const query = this.readOptionalRecord(payloadRecord, 'query');
    const id = params?.id ?? query?.id;
    if (id === undefined) {
      throw new BadRequestException('Activity log id is required');
    }
    if (typeof id !== 'string') {
      throw new BadRequestException('Activity log id must be a string');
    }
    if (id.trim() === '') {
      throw new BadRequestException('Activity log id is required');
    }

    return { id };
  }

  private requireUser(payload: unknown): TcpAuthenticatedUser {
    const payloadRecord = this.readPayloadRecord(payload);
    const userRecord = payloadRecord.user;
    if (!this.isRecord(userRecord)) {
      throw new UnauthorizedException('Authenticated user is required');
    }

    const userId = this.readRequiredString(userRecord, 'sub') ?? this.readRequiredString(userRecord, 'userId');
    const email = this.readRequiredString(userRecord, 'email');
    const role = this.readUserRole(userRecord);

    if (!userId || !email || !role) {
      throw new UnauthorizedException('Authenticated user is required');
    }

    return { userId, email, role };
  }

  private readOptionalString(record: Record<string, unknown>, key: string): string | undefined {
    const value = record[key];
    if (value !== undefined && typeof value !== 'string') {
      throw new BadRequestException(`${key} must be a string`);
    }

    return value !== undefined && value.trim() !== '' ? value : undefined;
  }

  private readPayloadRecord(payload: unknown): Record<string, unknown> {
    if (!this.isRecord(payload)) {
      throw new BadRequestException('TCP payload must be an object');
    }

    return payload;
  }

  private readOptionalRecord(record: Record<string, unknown>, key: string): Record<string, unknown> | undefined {
    const value = record[key];
    if (value === undefined) return undefined;
    if (!this.isRecord(value)) {
      throw new BadRequestException(`${key} must be an object`);
    }

    return value;
  }

  private readRequiredString(record: Record<string, unknown>, key: string): string | undefined {
    const value = record[key];
    return typeof value === 'string' && value.trim() !== '' ? value : undefined;
  }

  private readOptionalPositiveInteger(record: Record<string, unknown>, key: string): number | undefined {
    const value = this.readOptionalString(record, key);
    if (value === undefined) return undefined;

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new BadRequestException(`${key} must be a positive integer`);
    }

    return parsed;
  }

  private readOptionalResult(record: Record<string, unknown>, key: string): ActivityLogResult | undefined {
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
