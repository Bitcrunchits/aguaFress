import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import type { ArgumentMetadata } from '@nestjs/common';
import { UserRole } from '@agua/contracts';
import type { TcpAuthenticatedUser, TcpPayload } from './tcp-payload';

type ClassType<T> = new () => T;

@Injectable()
export class TcpPayloadAdapter {
  private readonly validationPipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });

  userId(payload: TcpPayload): string {
    const user = this.requireUser(payload);
    const userId = user.sub ?? user.userId;

    if (!userId) {
      throw new UnauthorizedException('Authenticated user is required');
    }

    return userId;
  }

  requireUser(payload: TcpPayload): TcpAuthenticatedUser {
    const userId = payload.user?.sub ?? payload.user?.userId;
    if (!payload.user || !userId) {
      throw new UnauthorizedException('Authenticated user is required');
    }

    return payload.user;
  }

  requireRole(payload: TcpPayload, ...roles: UserRole[]): TcpAuthenticatedUser {
    const user = this.requireUser(payload);
    if (!roles.includes(user.role as UserRole)) {
      throw new ForbiddenException('Insufficient role for TCP handler');
    }

    return user;
  }

  async body<T extends object>(payload: TcpPayload, dtoType: ClassType<T>): Promise<T> {
    return this.validate(payload.body ?? {}, dtoType, 'body');
  }

  async query<T extends object>(payload: TcpPayload, dtoType: ClassType<T>): Promise<T> {
    return this.validate(payload.query ?? {}, dtoType, 'query');
  }

  private async validate<T extends object>(
    value: unknown,
    dtoType: ClassType<T>,
    type: ArgumentMetadata['type'],
  ): Promise<T> {
    if (!this.isRecord(value)) {
      throw new BadRequestException(`${type} must be an object`);
    }

    const transformed = await this.validationPipe.transform(value, {
      type,
      metatype: dtoType,
    });

    return transformed as T;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
