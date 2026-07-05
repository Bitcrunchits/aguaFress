import * as crypto from 'crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditAction, VendedorEstado } from '@agua/contracts';
import { PrismaService } from '../common/prisma/prisma.service';
import type { ListQrCodesDto } from './dto/list-qr-codes.dto';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class QrCodesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private generateCodigo(): string {
    return crypto.randomUUID().slice(0, 8);
  }

  async create(vendedorId: string, userId?: string) {
    const vendedor = await this.prisma.vendedor.findUnique({
      where: { id: vendedorId },
      select: { estado: true },
    });

    if (!vendedor) {
      throw new NotFoundException('Vendedor not found');
    }

    if (vendedor.estado === VendedorEstado.INACTIVO || vendedor.estado === VendedorEstado.BLOQUEADO) {
      throw new ForbiddenException('Cannot create QR codes: vendedor is not active');
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const qr = await this.prisma.qrCode.create({
          data: {
            vendedor_id: vendedorId,
            codigo: this.generateCodigo(),
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });

        await this.auditLogService.record(AuditAction.QR_CREATED, userId ?? qr.vendedor_id, {
          targetId: qr.id,
        });

        return qr;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          if (attempt === 2) {
            throw new ConflictException('Could not generate unique QR code');
          }
          continue;
        }
        throw error;
      }
    }
    // TypeScript guard — loop always returns or throws
    throw new ConflictException('Could not generate unique QR code');
  }

  async list(vendedorId: string, dto: ListQrCodesDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.QrCodeWhereInput = { vendedor_id: vendedorId };

    const [data, total] = await Promise.all([
      this.prisma.qrCode.findMany({
        skip,
        take: limit,
        where,
        orderBy: { created_at: 'desc' },
        select: { id: true, codigo: true, activo: true, expires_at: true, created_at: true },
      }),
      this.prisma.qrCode.count({ where }),
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

  async listByVendedor(vendedorId: string, dto: ListQrCodesDto) {
    return this.list(vendedorId, dto);
  }

  async deactivate(id: string, vendedorId: string) {
    return this.deactivateInternal(id, vendedorId);
  }

  async deactivateAdmin(id: string) {
    return this.deactivateInternal(id);
  }

  private async deactivateInternal(id: string, vendedorId?: string): Promise<void> {
    const where: Prisma.QrCodeWhereInput = {
      id,
      activo: true,
      ...(vendedorId ? { vendedor_id: vendedorId } : {}),
    };

    const result = await this.prisma.qrCode.updateMany({
      where,
      data: { activo: false },
    });

    if (result.count === 0) {
      const exists = vendedorId
        ? await this.prisma.qrCode.findFirst({ where: { id, vendedor_id: vendedorId } })
        : await this.prisma.qrCode.findUnique({ where: { id } });

      if (!exists) throw new NotFoundException('QR code not found');
      throw new BadRequestException('QR code is already inactive');
    }

    await this.auditLogService.record(AuditAction.QR_DEACTIVATED, vendedorId ?? 'system', {
      targetId: id,
    });
  }
}
