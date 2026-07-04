import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { VendedorEstado, AuditAction } from '@agua/contracts';
import { PrismaService } from '../common/prisma/prisma.service';
import { cleanUpdateInput } from '../common/utils/prisma.utils';
import { AuditLogService } from '../audit-log/audit-log.service';

interface ListParams {
  page?: number;
  limit?: number;
  estado?: VendedorEstado;
  search?: string;
}

interface ChangeEstadoDto {
  estado: VendedorEstado;
  motivo?: string;
}

interface UpdateVendedorDto {
  empresa?: string;
  telefono?: string;
  logo?: string;
  ciudadDefault?: string;
  zonaEntrega?: string;
}

interface UpdateVendedorProfileDto {
  nombre?: string;
  apellido?: string;
  telefono?: string;
  empresa?: string;
  logo?: string;
  ciudadDefault?: string;
  zonaEntrega?: string;
}

const VALID_TRANSITIONS: Record<VendedorEstado, VendedorEstado[]> = {
  [VendedorEstado.PENDIENTE]: [VendedorEstado.ACTIVO],
  [VendedorEstado.ACTIVO]: [VendedorEstado.INACTIVO, VendedorEstado.BLOQUEADO],
  [VendedorEstado.INACTIVO]: [VendedorEstado.ACTIVO],
  [VendedorEstado.BLOQUEADO]: [VendedorEstado.INACTIVO],
};

@Injectable()
export class VendedoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async list(params: ListParams = {}) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.VendedorWhereInput = {};

    if (params.estado) {
      where.estado = params.estado as any;
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

    const currentEstado = vendedor.estado as unknown as VendedorEstado;
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
      data: { estado: targetEstado as any },
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

    const estado = vendedor.estado as unknown as VendedorEstado;
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

    const estado = vendedor.estado as unknown as VendedorEstado;
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
