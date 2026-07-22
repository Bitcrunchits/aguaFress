import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@agua/contracts';
import type { TcpAuthenticatedUser, TcpPayload } from './tcp-payload';

@Injectable()
export class TcpPayloadAdapter {
  requireUser(payload: TcpPayload): TcpAuthenticatedUser {
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

  userId(payload: TcpPayload): string {
    return this.requireUser(payload).userId;
  }

  private readRequiredString(record: Record<string, unknown>, key: string): string | undefined {
    const value = record[key];
    return typeof value === 'string' && value.trim() !== '' ? value : undefined;
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
