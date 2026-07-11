import { Injectable, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  type ThrottlerModuleOptions,
  type ThrottlerStorage,
} from '@nestjs/throttler';
import type { Request } from 'express';
import { ACTION_REGISTRY } from '../actions/action-registry';
import { GatewayRateLimitGuard } from './gateway-rate-limit.guard';

@Injectable()
export class ProtectedRouteRateLimitGuard extends GatewayRateLimitGuard {
  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storageService: ThrottlerStorage,
    reflector: Reflector,
    private readonly jwtService: JwtService,
  ) {
    super(options, storageService, reflector);
  }

  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    if (!this.isProtectedAction(request)) {
      return true;
    }

    const token = this.extractBearerToken(request);
    if (token === undefined) {
      return false;
    }

    try {
      this.jwtService.verify(token);
      return true;
    } catch {
      return false;
    }
  }

  private isProtectedAction(request: Request): boolean {
    const service = request.params?.service as string | undefined;
    const action = request.params?.action as string | undefined;

    if (service === undefined || action === undefined) {
      return false;
    }

    const family = ACTION_REGISTRY[service];
    if (family?.status !== 'available') {
      return false;
    }

    return family.actions[action]?.authRequired === true;
  }

  private extractBearerToken(request: Request): string | undefined {
    const authorization = request.headers.authorization;
    if (typeof authorization !== 'string') {
      return undefined;
    }

    const [scheme, token] = authorization.split(' ');
    if (scheme !== 'Bearer' || token === undefined || token.length === 0) {
      return undefined;
    }

    return token;
  }
}
