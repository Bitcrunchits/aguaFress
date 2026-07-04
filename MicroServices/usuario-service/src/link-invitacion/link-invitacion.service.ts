import * as crypto from 'crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditAction } from '@agua/contracts';
import { PrismaService } from '../common/prisma/prisma.service';
import type { ListLinkInvitacionDto } from './dto/list-link-invitacion.dto';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class LinkInvitacionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private generateToken(): string {
    return crypto.randomUUID().slice(0, 8);
  }

  async create(vendedorId: string) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const link = await this.prisma.linkInvitacion.create({
          data: {
            vendedor_id: vendedorId,
            token: this.generateToken(),
            expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000),
          },
        });

        await this.auditLogService.record(AuditAction.LINK_CREATED, link.vendedor_id, {
          targetId: link.id,
        });

        return link;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          if (attempt === 2) {
            throw new ConflictException(
              'Could not generate unique invitation link',
            );
          }
          continue;
        }
        throw error;
      }
    }
    // TypeScript guard — loop always returns or throws
    throw new ConflictException('Could not generate unique invitation link');
  }

  async list(vendedorId: string, dto: ListLinkInvitacionDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.LinkInvitacionWhereInput = {
      vendedor_id: vendedorId,
    };

    const [data, total] = await Promise.all([
      this.prisma.linkInvitacion.findMany({
        skip,
        take: limit,
        where,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          token: true,
          activo: true,
          expires_at: true,
          created_at: true,
        },
      }),
      this.prisma.linkInvitacion.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async listByVendedor(vendedorId: string, dto: ListLinkInvitacionDto) {
    return this.list(vendedorId, dto);
  }

  async deactivate(id: string, vendedorId: string) {
    return this.deactivateInternal(id, vendedorId);
  }

  async deactivateAdmin(id: string) {
    return this.deactivateInternal(id);
  }

  private async deactivateInternal(
    id: string,
    vendedorId?: string,
  ): Promise<void> {
    const where: Prisma.LinkInvitacionWhereInput = {
      id,
      activo: true,
      ...(vendedorId ? { vendedor_id: vendedorId } : {}),
    };

    const result = await this.prisma.linkInvitacion.updateMany({
      where,
      data: { activo: false },
    });

    if (result.count === 0) {
      const exists = vendedorId
        ? await this.prisma.linkInvitacion.findFirst({
            where: { id, vendedor_id: vendedorId },
          })
        : await this.prisma.linkInvitacion.findUnique({ where: { id } });

      if (!exists) throw new NotFoundException('LinkInvitacion not found');
      throw new BadRequestException('LinkInvitacion is already inactive');
    }

    await this.auditLogService.record(AuditAction.LINK_DEACTIVATED, vendedorId ?? 'system', {
      targetId: id,
    });
  }
}
