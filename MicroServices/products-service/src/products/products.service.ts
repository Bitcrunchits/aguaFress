import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { PaginatedResponse, ProductResponse } from '@agua/contracts';
import { PrismaService } from '../common/prisma/prisma.service';
import { PricingService } from '../common/prisma/pricing.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ListProductsDto } from './dto/list-products.dto';
import { SearchProductDto } from './dto/search-product.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
  ) {}

  async list(filters: ListProductsDto): Promise<PaginatedResponse<ProductResponse>> {
    const page = filters.page ?? DEFAULT_PAGE;
    const limit = filters.limit ?? DEFAULT_LIMIT;

    const where = {
      ...(filters.vendedorId ? { vendedorId: filters.vendedorId } : {}),
      ...(filters.categoria ? { categoria: { nombre: filters.categoria } } : {}),
      ...(filters.disponibles ? { activo: true, stock: { gt: 0 } } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.producto.findMany({
        where,
        include: { categoria: true, marca: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.producto.count({ where }),
    ]);

    return {
      data: items.map((p) => this.toResponse(p)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findById(id: string): Promise<ProductResponse> {
    const producto = await this.prisma.producto.findUnique({
      where: { id },
      include: { categoria: true, marca: true },
    });

    if (!producto) {
      throw new NotFoundException('Producto no encontrado');
    }

    return this.toResponse(producto);
  }

  async search(query: SearchProductDto): Promise<ProductResponse[]> {
    const items = await this.prisma.producto.findMany({
      where: {
        activo: true,
        nombre: { contains: query.q, mode: 'insensitive' },
        ...(query.vendedorId ? { vendedorId: query.vendedorId } : {}),
      },
      include: { categoria: true, marca: true },
      take: 20,
      orderBy: { nombre: 'asc' },
    });

    return items.map((p) => this.toResponse(p));
  }

  async create(vendedorId: string, dto: CreateProductDto): Promise<{ id: string; created: boolean }> {
    const precioFinal = this.pricing.calcularPrecioFinal(dto.precioSinIva);

    const producto = await this.prisma.producto.create({
      data: {
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        precioSinIva: dto.precioSinIva,
        precioFinal,
        imagen: dto.imagen,
        stock: dto.stock,
        mostrarPrecio: dto.mostrarPrecio ?? true,
        vendedorId,
        categoriaId: dto.categoriaId,
        marcaId: dto.marcaId,
      },
    });

    return { id: producto.id, created: true };
  }

  async update(
    vendedorId: string,
    id: string,
    dto: UpdateProductDto,
  ): Promise<{ id: string; updated: boolean }> {
    const precioFinal =
      dto.precioSinIva !== undefined
        ? this.pricing.calcularPrecioFinal(dto.precioSinIva)
        : undefined;

    // Transacción: ownership check + update atómicos, elimina
    // condición de carrera entre ambas operaciones.
    await this.prisma.$transaction(async (tx) => {
      const producto = await tx.producto.findUnique({
        where: { id },
        select: { vendedorId: true },
      });
      if (!producto) throw new NotFoundException('Producto no encontrado');
      if (producto.vendedorId !== vendedorId) throw new ForbiddenException('No tenés permiso sobre este producto');

      await tx.producto.update({
        where: { id },
        data: {
          ...(dto.nombre !== undefined ? { nombre: dto.nombre } : {}),
          ...(dto.descripcion !== undefined ? { descripcion: dto.descripcion } : {}),
          ...(dto.precioSinIva !== undefined ? { precioSinIva: dto.precioSinIva, precioFinal } : {}),
          ...(dto.stock !== undefined ? { stock: dto.stock } : {}),
          ...(dto.imagen !== undefined ? { imagen: dto.imagen } : {}),
          ...(dto.activo !== undefined ? { activo: dto.activo } : {}),
          ...(dto.mostrarPrecio !== undefined ? { mostrarPrecio: dto.mostrarPrecio } : {}),
        },
      });
    });

    return { id, updated: true };
  }

  async remove(vendedorId: string, id: string): Promise<{ deleted: boolean }> {
    // deleteMany con id + vendedorId: ownership check y borrado en un solo
    // query atómico, sin condición de carrera.
    const { count } = await this.prisma.producto.deleteMany({
      where: { id, vendedorId },
    });

    if (count === 0) {
      // Determinar si falló por inexistencia o por ownership
      const exists = await this.prisma.producto.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!exists) throw new NotFoundException('Producto no encontrado');
      throw new ForbiddenException('No tenés permiso sobre este producto');
    }

    return { deleted: true };
  }

  private toResponse(producto: {
    id: string;
    nombre: string;
    descripcion: string | null;
    precioSinIva: { toString(): string };
    precioFinal: { toString(): string };
    imagen: string | null;
    stock: number;
    activo: boolean;
    mostrarPrecio: boolean;
    vendedorId: string;
    categoria?: { nombre: string } | null;
    marca?: { nombre: string } | null;
  }): ProductResponse {
    return {
      id: producto.id,
      nombre: producto.nombre,
      descripcion: producto.descripcion ?? undefined,
      precioSinIva: Number(producto.precioSinIva),
      precioFinal: Number(producto.precioFinal),
      imagen: producto.imagen ?? undefined,
      stock: producto.stock,
      marca: producto.marca?.nombre,
      categoria: producto.categoria?.nombre,
      vendedorId: producto.vendedorId,
      activo: producto.activo,
      mostrarPrecio: producto.mostrarPrecio,
    };
  }
}
