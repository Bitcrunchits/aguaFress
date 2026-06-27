import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { UserRole } from '@agua/contracts';

@Injectable()
export class VendedorGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    return user?.role === UserRole.VENDEDOR;
  }
}
