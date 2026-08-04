import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { type Observable } from 'rxjs';
import type { UserRole } from '@agua/contracts';
import { ACTION_REGISTRY } from '../actions/action-registry';

export const IS_PUBLIC_KEY = 'isPublic';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  jti?: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService, private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const actionMapping = this.resolveActionMapping(request);

    // Actions without authRequired: allow public access, but still try
    // to extract the JWT if present so downstream services can resolve
    // the authenticated user (e.g. resolve vendedorId from token).
    if (actionMapping && !actionMapping.authRequired) {
      const token = this.extractTokenFromHeader(request);
      if (token) {
        try {
          const payload = this.jwtService.verify<JwtPayload>(token);
          (request as unknown as Record<string, unknown>).user = payload;
        } catch {
          // Token present but invalid — ignore, public access is still allowed
        }
      }
      return true;
    }

    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      (request as unknown as Record<string, unknown>).user = payload;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    return true;
  }

  private resolveActionMapping(request: Request) {
    const service = request.params?.service as string | undefined;
    const action = request.params?.action as string | undefined;

    if (!service || !action) {
      return undefined;
    }

    const family = ACTION_REGISTRY[service];
    if (!family || family.status === 'unavailable') {
      return undefined;
    }

    return family.actions[action];
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authorization = request.headers.authorization;
    if (!authorization || typeof authorization !== 'string') {
      return undefined;
    }
    const [scheme, token] = authorization.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return undefined;
    }
    return token;
  }
}
