import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma';
import { AuditAction } from '@agua/contracts';
import { PrismaService } from '../common/prisma/prisma.service';
import { cleanUpdateInput } from '../common/utils/prisma.utils';
import { AuditLogService } from '../audit-log/audit-log.service';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { ReasignarVendedorDto } from './dto/reasignar-vendedor.dto';
import { UpdateClienteVendedorDto } from './dto/update-cliente-vendedor.dto';
import { ListClientesDto } from './dto/list-clientes.dto';

const CLIENTE_INCLUDE = {
  vendedor: {
    select: { id: true, nombre: true, apellido: true, empresa: true },
  },
  _count: { select: { cartera: true } },
};

const CARTERA_FILTER = (vendedorId: string) => ({
  vendedor_id: vendedorId,
});

@Injectable()
export class ClientesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ─── ADMIN METHODS ─────────────────────────────────────────────

  async list(params: ListClientesDto = {}) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ClienteWhereInput = {};

    if (params.vendedorId) {
      where.vendedor_id = params.vendedorId;
    }

    if (params.search) {
      where.OR = [
        { nombre: { contains: params.search, mode: 'insensitive' } },
        { apellido: { contains: params.search, mode: 'insensitive' } },
        { dni: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.cliente.findMany({
        skip,
        take: limit,
        where,
        orderBy: { created_at: 'desc' },
        include: CLIENTE_INCLUDE,
      }),
      this.prisma.cliente.count({ where }),
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
    const cliente = await this.prisma.cliente.findUnique({
      where: { id },
      include: CLIENTE_INCLUDE,
    });

    if (!cliente) {
      throw new NotFoundException('Cliente not found');
    }

    return cliente;
  }

  async update(id: string, dto: UpdateClienteDto) {
    const existing = await this.prisma.cliente.findUnique({
      where: { id },
      select: { id: true, auth_user_id: true },
    });

    if (!existing) {
      throw new NotFoundException('Cliente not found');
    }

    const data = cleanUpdateInput(dto) as Prisma.ClienteUpdateInput;

    const result = await this.prisma.cliente.update({
      where: { id },
      data,
      include: CLIENTE_INCLUDE,
    });

    await this.auditLogService.record(AuditAction.CLIENTE_UPDATED, existing.auth_user_id, {
      targetId: id,
    });

    return result;
  }

  async reassign(id: string, dto: ReasignarVendedorDto) {
    const current = await this.prisma.cliente.findUnique({
      where: { id },
      select: { vendedor_id: true, auth_user_id: true },
    });

    if (!current) {
      throw new NotFoundException('Cliente not found');
    }

    const vendedorAnteriorId = current.vendedor_id;

    const cliente = await this.prisma.$transaction(async (tx) => {
      const targetVendedor = await tx.vendedor.findUnique({
        where: { id: dto.vendedorId },
        select: { id: true },
      });

      if (!targetVendedor) {
        throw new NotFoundException('Vendedor not found');
      }

      // Deactivate all current active cartera entries first
      await tx.cartera.updateMany({
        where: { cliente_id: id, activo: true },
        data: { activo: false },
      });

      const updated = await tx.cliente.update({
        where: { id },
        data: { vendedor_id: dto.vendedorId },
        include: CLIENTE_INCLUDE,
      });

      await tx.cartera.upsert({
        where: {
          vendedor_id_cliente_id: {
            vendedor_id: dto.vendedorId,
            cliente_id: id,
          },
        },
        create: {
          vendedor_id: dto.vendedorId,
          cliente_id: id,
          activo: true,
        },
        update: { activo: true },
      });

      return updated;
    });

    await this.auditLogService.record(AuditAction.CLIENTE_REASSIGNED, current.auth_user_id, {
      targetId: id,
      detail: { vendedorAnteriorId, vendedorNuevoId: dto.vendedorId },
    });

    return cliente;
  }

  // ─── VENDEDOR-SCOPED METHODS (cartera) ─────────────────────────

  async listOwn(vendedorId: string, params: ListClientesDto = {}) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ClienteWhereInput = {
      ...CARTERA_FILTER(vendedorId),
    };

    if (params.search) {
      where.OR = [
        { nombre: { contains: params.search, mode: 'insensitive' } },
        { apellido: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.cliente.findMany({
        skip,
        take: limit,
        where,
        orderBy: { created_at: 'desc' },
        include: CLIENTE_INCLUDE,
      }),
      this.prisma.cliente.count({ where }),
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

  async getOwnById(id: string, vendedorId: string) {
    const cliente = await this.prisma.cliente.findFirst({
      where: {
        id,
        ...CARTERA_FILTER(vendedorId),
      },
      include: CLIENTE_INCLUDE,
    });

    if (!cliente) {
      throw new NotFoundException('Cliente not found');
    }

    return cliente;
  }

  async updateOwn(id: string, vendedorId: string, dto: UpdateClienteVendedorDto) {
    const existing = await this.prisma.cliente.findFirst({
      where: {
        id,
        ...CARTERA_FILTER(vendedorId),
      },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Cliente not found');
    }

    const data = cleanUpdateInput(dto) as Prisma.ClienteUpdateInput;

    return this.prisma.cliente.update({
      where: { id },
      data,
      include: CLIENTE_INCLUDE,
    });
  }
}
