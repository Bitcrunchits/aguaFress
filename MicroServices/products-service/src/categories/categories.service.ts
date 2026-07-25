import { Injectable, NotFoundException } from '@nestjs/common';
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
    }));
  }

  async createCategoria(vendedorId: string, dto: CreateCategoriaDto) {
    return this.prisma.categoria.create({
      data: { nombre: dto.nombre, orden: dto.orden ?? 0, vendedorId },
    });
  }

  async updateCategoria(vendedorId: string, id: string, dto: UpdateCategoriaDto) {
    const cat = await this.prisma.categoria.findFirst({
      where: { id, vendedorId },
    });

    if (!cat) {
      throw new NotFoundException('Categoría no encontrada');
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
      where: { id, vendedorId, activo: true },
    });

    if (!cat) {
      throw new NotFoundException('Categoría no encontrada');
    }

    await this.prisma.categoria.update({
      where: { id },
      data: { activo: false },
    });
    return { deleted: true };
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
    }));
  }

  async createMarca(vendedorId: string, dto: CreateMarcaDto) {
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

    return this.prisma.marca.update({
      where: { id },
      data: {
        ...(dto.nombre !== undefined ? { nombre: dto.nombre } : {}),
      },
    });
  }

  async deleteMarca(vendedorId: string, id: string) {
    const marca = await this.prisma.marca.findFirst({
      where: { id, vendedorId, activo: true },
    });

    if (!marca) {
      throw new NotFoundException('Marca no encontrada');
    }

    await this.prisma.marca.update({
      where: { id },
      data: { activo: false },
    });
    return { deleted: true };
  }
}
