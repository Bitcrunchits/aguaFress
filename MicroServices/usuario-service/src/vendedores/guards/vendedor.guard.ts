import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole, VendedorEstado } from '@agua/contracts';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class VendedorGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user || user.role !== UserRole.VENDEDOR) return false;

    // Also check that vendedor is active
    const vendedor = await this.prisma.vendedor.findUnique({
      where: { auth_user_id: user.userId },
      select: { estado: true },
    });

    if (
      !vendedor ||
      vendedor.estado === VendedorEstado.INACTIVO ||
      vendedor.estado === VendedorEstado.BLOQUEADO
    ) {
      throw new ForbiddenException('Vendedor is not active');
    }

    return true;
  }
}
