import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, $Enums } from '@prisma/client';
import { VendedorEstado, AuditAction } from '@agua/contracts';
import { PrismaService } from '../common/prisma/prisma.service';
import { cleanUpdateInput } from '../common/utils/prisma.utils';
import { AuditLogService } from '../audit-log/audit-log.service';
import { ChangeEstadoDto } from './dto/change-estado.dto';
import { UpdateVendedorDto } from './dto/update-vendedor.dto';
import { UpdateVendedorProfileDto } from './dto/update-vendedor-profile.dto';
import { ListVendedoresDto } from './dto/list-vendedores.dto';

const VALID_TRANSITIONS: Record<VendedorEstado, VendedorEstado[]> = {
  [VendedorEstado.PENDIENTE]: [VendedorEstado.ACTIVO],
  [VendedorEstado.ACTIVO]: [VendedorEstado.INACTIVO, VendedorEstado.BLOQUEADO],
  [VendedorEstado.INACTIVO]: [VendedorEstado.ACTIVO],
  [VendedorEstado.BLOQUEADO]: [VendedorEstado.INACTIVO],
};

@Injectable()
export class VendedoresService {
  private mapEstado(state: VendedorEstado): $Enums.VendedorEstado {
    return state as unknown as $Enums.VendedorEstado;
  }

  private mapPrismaEstado(state: $Enums.VendedorEstado): VendedorEstado {
    return state as unknown as VendedorEstado;
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async list(params: ListVendedoresDto = {}) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.VendedorWhereInput = {};

    if (params.estado) {
      where.estado = this.mapEstado(params.estado);
    }

    if (params.search) {
      where.OR = [
        { nombre: { contains: params.search, mode: 'insensitive' } },
        { apellido: { contains: params.search, mode: 'insensitive' } },
        { empresa: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.vendedor.findMany({
        skip,
        take: limit,
        where,
        orderBy: { created_at: 'desc' },
        include: {
          _count: { select: { clientes: true } },
        },
      }),
      this.prisma.vendedor.count({ where }),
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

  async getById(id: string) {
    const vendedor = await this.prisma.vendedor.findUnique({
      where: { id },
      include: {
        auth_user: { select: { email: true } },
        _count: { select: { clientes: true } },
      },
    });

    if (!vendedor) {
      throw new NotFoundException('Vendedor not found');
    }

    return vendedor;
  }

  async update(id: string, dto: UpdateVendedorDto) {
    const existing = await this.prisma.vendedor.findUnique({
      where: { id },
      select: { id: true, auth_user_id: true },
    });

    if (!existing) {
      throw new NotFoundException('Vendedor not found');
    }

    const data = cleanUpdateInput(dto) as Prisma.VendedorUpdateInput;

    const result = await this.prisma.vendedor.update({
      where: { id },
      data,
    });

    await this.auditLogService.record(AuditAction.VENDEDOR_UPDATED, existing.auth_user_id, {
      targetId: id,
    });

    return result;
  }

  async changeEstado(id: string, dto: ChangeEstadoDto) {
    const vendedor = await this.prisma.vendedor.findUnique({
      where: { id },
      select: { id: true, estado: true, auth_user_id: true },
    });

    if (!vendedor) {
      throw new NotFoundException('Vendedor not found');
    }

    const currentEstado = this.mapPrismaEstado(vendedor.estado);
    const targetEstado = dto.estado;
    const allowed = VALID_TRANSITIONS[currentEstado];

    if (!allowed || !allowed.includes(targetEstado)) {
      const validTransitions = allowed?.join(', ') ?? 'none';
      throw new BadRequestException(
        `Invalid status transition from ${currentEstado} to ${targetEstado}. Valid transitions: ${validTransitions}`,
      );
    }

    const result = await this.prisma.vendedor.update({
      where: { id },
      data: { estado: this.mapEstado(targetEstado) },
    });

    await this.auditLogService.record(AuditAction.VENDEDOR_STATUS_CHANGED, vendedor.auth_user_id, {
      targetId: id,
      detail: { estadoAnterior: currentEstado, estadoNuevo: targetEstado },
    });

    return result;
  }

  async getMyProfile(userId: string) {
    const vendedor = await this.prisma.vendedor.findUnique({
      where: { auth_user_id: userId },
      include: {
        auth_user: {
          select: {
            id: true,
            email: true,
            role: true,
            is_active: true,
          },
        },
        _count: { select: { clientes: true } },
      },
    });

    if (!vendedor) {
      throw new NotFoundException('Vendedor not found');
    }

    const estado = this.mapPrismaEstado(vendedor.estado);
    if (estado === VendedorEstado.INACTIVO || estado === VendedorEstado.BLOQUEADO) {
      throw new ForbiddenException(
        `Vendedor is ${estado}. Access denied.`,
      );
    }

    return vendedor;
  }

  async updateMyProfile(userId: string, dto: UpdateVendedorProfileDto) {
    const vendedor = await this.prisma.vendedor.findUnique({
      where: { auth_user_id: userId },
      select: { id: true, estado: true },
    });

    if (!vendedor) {
      throw new NotFoundException('Vendedor not found');
    }

    const estado = this.mapPrismaEstado(vendedor.estado);
    if (estado === VendedorEstado.INACTIVO || estado === VendedorEstado.BLOQUEADO) {
      throw new ForbiddenException(
        `Vendedor is ${estado}. Access denied.`,
      );
    }

    const data = cleanUpdateInput(dto) as Prisma.VendedorUpdateInput;

    return this.prisma.vendedor.update({
      where: { auth_user_id: userId },
      data,
    });
  }
}
