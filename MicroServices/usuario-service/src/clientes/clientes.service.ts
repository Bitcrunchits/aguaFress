import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { cleanUpdateInput } from '../common/utils/prisma.utils';

interface ListParams {
  page?: number;
  limit?: number;
  vendedorId?: string;
  search?: string;
}

interface UpdateClienteDto {
  nombre?: string;
  apellido?: string;
  dni?: string;
  telefono?: string;
  tipoFactura?: string;
  direccionCalle?: string;
  direccionNumero?: string;
  direccionPiso?: string;
  direccionReferencia?: string;
  direccionBarrio?: string;
  direccionCiudad?: string;
  direccionProvincia?: string;
  direccionCp?: string;
  latitud?: number;
  longitud?: number;
}

interface ReasignarVendedorDto {
  vendedorId: string;
}

interface UpdateClienteVendedorDto {
  nombre?: string;
  apellido?: string;
  telefono?: string;
  direccionCalle?: string;
  direccionNumero?: string;
  direccionPiso?: string;
  direccionReferencia?: string;
  direccionBarrio?: string;
  direccionCiudad?: string;
  direccionProvincia?: string;
  direccionCp?: string;
  latitud?: number;
  longitud?: number;
}

const CLIENTE_INCLUDE = {
  vendedor: {
    select: { id: true, nombre: true, apellido: true, empresa: true },
  },
  _count: { select: { cartera: true } },
};

const CARTERA_FILTER = (userId: string) => ({
  cartera: { some: { vendedor_id: userId, activo: true } },
});

@Injectable()
export class ClientesService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── ADMIN METHODS ─────────────────────────────────────────────

  async list(params: ListParams = {}) {
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

  async reassign(id: string, dto: ReasignarVendedorDto) {
    return this.prisma.$transaction(async (tx) => {
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

      const cliente = await tx.cliente.update({
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

      return cliente;
    });
  }

  // ─── VENDEDOR-SCOPED METHODS (cartera) ─────────────────────────

  async listMios(userId: string, params: ListParams = {}) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ClienteWhereInput = {
      ...CARTERA_FILTER(userId),
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

  async getByIdMio(id: string, userId: string) {
    const cliente = await this.prisma.cliente.findFirst({
      where: {
        id,
        ...CARTERA_FILTER(userId),
      },
      include: CLIENTE_INCLUDE,
    });

    if (!cliente) {
      throw new NotFoundException('Cliente not found');
    }

    return cliente;
  }

  async updateMio(id: string, userId: string, dto: UpdateClienteVendedorDto) {
    const existing = await this.prisma.cliente.findFirst({
      where: {
        id,
        ...CARTERA_FILTER(userId),
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
