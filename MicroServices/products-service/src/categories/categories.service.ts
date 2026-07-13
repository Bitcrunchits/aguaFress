import { Injectable } from '@nestjs/common';
import type { CategoriaResponse, MarcaResponse } from '@agua/contracts';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async listCategorias(vendedorId: string): Promise<CategoriaResponse[]> {
    const categorias = await this.prisma.categoria.findMany({
      where: { vendedorId },
      orderBy: { orden: 'asc' },
    });

    return categorias.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      orden: c.orden,
      vendedorId: c.vendedorId,
    }));
  }

  async listMarcas(vendedorId: string): Promise<MarcaResponse[]> {
    const marcas = await this.prisma.marca.findMany({
      where: { vendedorId },
      orderBy: { nombre: 'asc' },
    });

    return marcas.map((m) => ({
      id: m.id,
      nombre: m.nombre,
      vendedorId: m.vendedorId,
    }));
  }
}
