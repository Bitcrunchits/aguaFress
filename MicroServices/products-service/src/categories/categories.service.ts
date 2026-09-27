import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { CategoriaResponse, MarcaResponse } from '@agua/contracts';
import { PrismaService } from '../common/prisma/prisma.service';
import type { CreateCategoriaDto } from './dto/create-categoria.dto';
import type { UpdateCategoriaDto } from './dto/update-categoria.dto';
import type { CreateMarcaDto } from './dto/create-marca.dto';
import type { UpdateMarcaDto } from './dto/update-marca.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async listCategorias(vendedorId: string): Promise<CategoriaResponse[]> {
    const categorias = await this.prisma.categoria.findMany({
      where: { vendedorId, activo: true },
      orderBy: { orden: 'asc' },
    });

    return categorias.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      orden: c.orden,
      vendedorId: c.vendedorId,
      activo: c.activo,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));
  }

  async listInactiveCategorias(vendedorId?: string): Promise<CategoriaResponse[]> {
    const categorias = await this.prisma.categoria.findMany({
      where: {
        activo: false,
        ...(vendedorId ? { vendedorId } : {}),
      },
      orderBy: [{ updatedAt: 'desc' }, { nombre: 'asc' }],
    });

    return categorias.map((c) => this.toCategoriaResponse(c));
  }

  async createCategoria(vendedorId: string, dto: CreateCategoriaDto) {
    await this.assertUniqueActiveCategoriaName(vendedorId, dto.nombre);

    const max = await this.prisma.categoria.aggregate({
      where: { vendedorId, activo: true },
      _max: { orden: true },
    });
    const orden = (max._max.orden ?? 0) + 1;

    return this.prisma.categoria.create({
      data: { nombre: dto.nombre, orden, vendedorId },
    });
  }

  async updateCategoria(vendedorId: string, id: string, dto: UpdateCategoriaDto) {
    const cat = await this.prisma.categoria.findFirst({
      where: { id, vendedorId, activo: true },
    });

    if (!cat) {
      throw new NotFoundException('Categoría no encontrada');
    }

    if (dto.nombre !== undefined) {
      await this.assertUniqueActiveCategoriaName(vendedorId, dto.nombre, id);
    }

    return this.prisma.categoria.update({
      where: { id },
      data: {
        ...(dto.nombre !== undefined ? { nombre: dto.nombre } : {}),
        ...(dto.orden !== undefined ? { orden: dto.orden } : {}),
      },
    });
  }

  async deleteCategoria(vendedorId: string, id: string) {
    const cat = await this.prisma.categoria.findFirst({
      where: { id, vendedorId },
    });

    if (!cat) {
      throw new NotFoundException('Categoría no encontrada');
    }

    if (!cat.activo) {
      return { deactivated: true };
    }

    await this.prisma.categoria.update({
      where: { id },
      data: { activo: false },
    });
    return { deactivated: true };
  }

  async reactivateCategoria(vendedorId: string, id: string): Promise<CategoriaResponse> {
    const cat = await this.prisma.categoria.findFirst({
      where: { id, vendedorId },
    });

    if (!cat) {
      throw new NotFoundException('Categoría no encontrada');
    }

    if (cat.activo) {
      return this.toCategoriaResponse(cat);
    }

    await this.assertUniqueActiveCategoriaName(vendedorId, cat.nombre, id);

    const reactivated = await this.prisma.categoria.update({
      where: { id },
      data: { activo: true },
    });

    return this.toCategoriaResponse(reactivated);
  }

  async listMarcas(vendedorId: string): Promise<MarcaResponse[]> {
    const marcas = await this.prisma.marca.findMany({
      where: { vendedorId, activo: true },
      orderBy: { nombre: 'asc' },
    });

    return marcas.map((m) => ({
      id: m.id,
      nombre: m.nombre,
      vendedorId: m.vendedorId,
      activo: m.activo,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    }));
  }

  async createMarca(vendedorId: string, dto: CreateMarcaDto) {
    await this.assertUniqueActiveMarcaName(vendedorId, dto.nombre);

    return this.prisma.marca.create({
      data: { nombre: dto.nombre, vendedorId },
    });
  }

  async updateMarca(vendedorId: string, id: string, dto: UpdateMarcaDto) {
    const marca = await this.prisma.marca.findFirst({
      where: { id, vendedorId },
    });

    if (!marca) {
      throw new NotFoundException('Marca no encontrada');
    }

    if (dto.nombre !== undefined) {
      await this.assertUniqueActiveMarcaName(vendedorId, dto.nombre, id);
    }

    return this.prisma.marca.update({
      where: { id },
      data: {
        ...(dto.nombre !== undefined ? { nombre: dto.nombre } : {}),
      },
    });
  }

  async deleteMarca(vendedorId: string, id: string) {
    const marca = await this.prisma.marca.findFirst({
      where: { id, vendedorId },
    });

    if (!marca) {
      throw new NotFoundException('Marca no encontrada');
    }

    if (!marca.activo) {
      return { deactivated: true };
    }

    await this.prisma.marca.update({
      where: { id },
      data: { activo: false },
    });
    return { deactivated: true };
  }

  async reactivateMarca(vendedorId: string, id: string): Promise<MarcaResponse> {
    const marca = await this.prisma.marca.findFirst({
      where: { id, vendedorId },
    });

    if (!marca) {
      throw new NotFoundException('Marca no encontrada');
    }

    if (marca.activo) {
      return this.toMarcaResponse(marca);
    }

    await this.assertUniqueActiveMarcaName(vendedorId, marca.nombre, id);

    const reactivated = await this.prisma.marca.update({
      where: { id },
      data: { activo: true },
    });

    return this.toMarcaResponse(reactivated);
  }

  private async assertUniqueActiveCategoriaName(vendedorId: string, nombre: string, excludingId?: string): Promise<void> {
    const existing = await this.prisma.categoria.findFirst({
      where: {
        vendedorId,
        nombre,
        activo: true,
        ...(excludingId ? { NOT: { id: excludingId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Ya existe una categoría activa con ese nombre');
    }
  }

  private async assertUniqueActiveMarcaName(vendedorId: string, nombre: string, excludingId?: string): Promise<void> {
    const existing = await this.prisma.marca.findFirst({
      where: {
        vendedorId,
        nombre,
        activo: true,
        ...(excludingId ? { NOT: { id: excludingId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Ya existe una marca activa con ese nombre');
    }
  }

  private toCategoriaResponse(c: {
    id: string;
    nombre: string;
    orden: number;
    vendedorId: string;
    activo: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): CategoriaResponse {
    return {
      id: c.id,
      nombre: c.nombre,
      orden: c.orden,
      vendedorId: c.vendedorId,
      activo: c.activo,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    };
  }

  private toMarcaResponse(m: {
    id: string;
    nombre: string;
    vendedorId: string;
    activo: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): MarcaResponse {
    return {
      id: m.id,
      nombre: m.nombre,
      vendedorId: m.vendedorId,
      activo: m.activo,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    };
  }
}
