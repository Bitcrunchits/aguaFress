import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@agua/contracts';

export const ROLES_KEY = 'agua:roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
