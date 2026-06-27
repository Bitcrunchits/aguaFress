import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { VendedorEstado } from '@agua/contracts';
import { PrismaService } from '../common/prisma/prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

  async list(params: ListParams = {}) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.estado) {
      where.estado = params.estado;
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

    return { data, total, page, limit };
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
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Vendedor not found');
    }

    const data: any = {};
    if (dto.empresa !== undefined) data.empresa = dto.empresa;
    if (dto.telefono !== undefined) data.telefono = dto.telefono;
    if (dto.logo !== undefined) data.logo = dto.logo;
    if (dto.ciudadDefault !== undefined) data.ciudad_default = dto.ciudadDefault;
    if (dto.zonaEntrega !== undefined) data.zona_entrega = dto.zonaEntrega;

    return this.prisma.vendedor.update({
      where: { id },
      data,
    });
  }

  async changeEstado(id: string, dto: ChangeEstadoDto) {
    const vendedor = await this.prisma.vendedor.findUnique({
      where: { id },
      select: { id: true, estado: true },
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

    return this.prisma.vendedor.update({
      where: { id },
      data: { estado: targetEstado as any },
    });
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

    const data: any = {};
    if (dto.nombre !== undefined) data.nombre = dto.nombre;
    if (dto.apellido !== undefined) data.apellido = dto.apellido;
    if (dto.telefono !== undefined) data.telefono = dto.telefono;
    if (dto.empresa !== undefined) data.empresa = dto.empresa;
    if (dto.logo !== undefined) data.logo = dto.logo;
    if (dto.ciudadDefault !== undefined) data.ciudad_default = dto.ciudadDefault;
    if (dto.zonaEntrega !== undefined) data.zona_entrega = dto.zonaEntrega;

    return this.prisma.vendedor.update({
      where: { auth_user_id: userId },
      data,
    });
  }
}
