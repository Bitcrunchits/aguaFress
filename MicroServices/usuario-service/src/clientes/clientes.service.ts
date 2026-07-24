import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma';
import { AuditAction, type ClienteProviderResponse, type ClienteProvidersResponse, type SelectClienteProviderResponse } from '@agua/contracts';
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
  cartera: { some: { vendedor_id: vendedorId, activo: true } },
});

const PROVIDER_SELECT = {
  id: true,
  nombre: true,
  apellido: true,
  empresa: true,
  logo: true,
  telefono: true,
  ciudad_default: true,
};

interface ProviderSource {
  vendedor_id: string;
  vendedor: {
    id: string;
    nombre: string;
    apellido: string;
    empresa: string | null;
    logo: string | null;
    telefono: string;
    ciudad_default: string;
  };
}

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
      Object.assign(where, CARTERA_FILTER(params.vendedorId));
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

  async reassign(id: string, dto: ReasignarVendedorDto, actorUserId?: string) {
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

    await this.auditLogService.record(AuditAction.CLIENTE_REASSIGNED, actorUserId ?? current.auth_user_id, {
      targetId: id,
      detail: { vendedorAnteriorId, vendedorNuevoId: dto.vendedorId },
    });

    return cliente;
  }

  async addProvider(id: string, dto: ReasignarVendedorDto, actorUserId?: string) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id },
      select: { id: true, auth_user_id: true },
    });

    if (!cliente) {
      throw new NotFoundException('Cliente not found');
    }

    const vendedor = await this.prisma.vendedor.findUnique({
      where: { id: dto.vendedorId },
      select: { id: true },
    });

    if (!vendedor) {
      throw new NotFoundException('Vendedor not found');
    }

    await this.prisma.cartera.upsert({
      where: {
        vendedor_id_cliente_id: {
          vendedor_id: dto.vendedorId,
          cliente_id: id,
        },
      },
      create: { vendedor_id: dto.vendedorId, cliente_id: id, activo: true },
      update: { activo: true },
    });

    await this.auditLogService.record(AuditAction.CLIENTE_UPDATED, actorUserId ?? cliente.auth_user_id, {
      targetId: id,
      detail: { vendedorId: dto.vendedorId },
    });

    return this.getById(id);
  }

  async listProvidersForClienteUser(userId: string): Promise<ClienteProvidersResponse> {
    const cliente = await this.prisma.cliente.findUnique({
      where: { auth_user_id: userId },
      select: {
        id: true,
        vendedor_id: true,
        cartera: {
          where: { activo: true },
          orderBy: { created_at: 'asc' },
          include: { vendedor: { select: PROVIDER_SELECT } },
        },
      },
    });

    if (!cliente) {
      throw new NotFoundException('Cliente not found');
    }

    const providers = cliente.cartera.map((relation) => this.toProviderResponse(relation, cliente.vendedor_id));
    const defaultIsActive = providers.some((provider) => provider.id === cliente.vendedor_id);

    return {
      providers,
      defaultVendedorId: defaultIsActive ? cliente.vendedor_id : undefined,
      requiresSelection: providers.length > 1,
    };
  }

  async selectProviderForClienteUser(userId: string, vendedorId: string): Promise<SelectClienteProviderResponse> {
    const cliente = await this.prisma.cliente.findUnique({
      where: { auth_user_id: userId },
      select: { id: true, vendedor_id: true },
    });

    if (!cliente) {
      throw new NotFoundException('Cliente not found');
    }

    const relation = await this.prisma.cartera.findFirst({
      where: { cliente_id: cliente.id, vendedor_id: vendedorId, activo: true },
      include: { vendedor: { select: PROVIDER_SELECT } },
    });

    if (!relation) {
      throw new NotFoundException('Active provider relation not found');
    }

    return {
      selectedProvider: this.toProviderResponse(relation, cliente.vendedor_id),
    };
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

  private toProviderResponse(relation: ProviderSource, defaultVendedorId: string): ClienteProviderResponse {
    return {
      id: relation.vendedor.id,
      nombre: relation.vendedor.nombre,
      apellido: relation.vendedor.apellido || undefined,
      empresa: relation.vendedor.empresa ?? undefined,
      logo: relation.vendedor.logo ?? undefined,
      telefono: relation.vendedor.telefono || undefined,
      ciudad: relation.vendedor.ciudad_default || undefined,
      isDefault: relation.vendedor_id === defaultVendedorId,
    };
  }
}
