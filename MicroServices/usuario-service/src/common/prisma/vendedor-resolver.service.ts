import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { VendedorEstado } from '@agua/contracts';
import { PrismaService } from './prisma.service';

@Injectable()
export class VendedorResolver {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(authUserId: string): Promise<string> {
    const vendedor = await this.prisma.vendedor.findUnique({
      where: { auth_user_id: authUserId },
      select: { id: true },
    });

    if (!vendedor) {
      throw new NotFoundException('Vendedor profile not found');
    }

    return vendedor.id;
  }

  async resolveActive(authUserId: string): Promise<string> {
    const vendedor = await this.prisma.vendedor.findUnique({
      where: { auth_user_id: authUserId },
      select: { id: true, estado: true },
    });

    if (!vendedor) {
      throw new NotFoundException('Vendedor profile not found');
    }

    if (vendedor.estado !== VendedorEstado.ACTIVO) {
      throw new ForbiddenException('El vendedor debe estar activo para subir imágenes.');
    }

    return vendedor.id;
  }
}
