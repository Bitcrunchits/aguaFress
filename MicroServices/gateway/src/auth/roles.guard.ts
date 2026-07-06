import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { UserRole } from '@agua/contracts';
import { ACTION_REGISTRY } from '../actions/action-registry';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Check static @Roles() decorator first (conventional usage)
    const staticRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 2. Check action registry for role requirements
    const request = context.switchToHttp().getRequest<Request>();
    const registryRoles = this.resolveRegistryRoles(request);

    // Merge both sources — static decorator takes precedence if set
    const requiredRoles = staticRoles ?? registryRoles;

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = request as unknown as { user?: { role: UserRole } };

    if (!user?.role) {
      throw new ForbiddenException('Missing user role');
    }

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException(`Access denied. Required role: ${requiredRoles.join(' or ')}`);
    }

    return true;
  }

  private resolveRegistryRoles(request: Request): UserRole[] | undefined {
    const service = request.params?.service as string | undefined;
    const action = request.params?.action as string | undefined;

    if (!service || !action) {
      return undefined;
    }

    const family = ACTION_REGISTRY[service];
    if (!family || family.status === 'unavailable') {
      return undefined;
    }

    const mapping = family.actions[action];
    return mapping?.roles as UserRole[] | undefined;
  }
}
