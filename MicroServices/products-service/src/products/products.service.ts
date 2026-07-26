import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { PaginatedResponse, ProductResponse } from '@agua/contracts';
import { Prisma } from '@prisma/client';
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
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async list(filters: ListProductsDto): Promise<PaginatedResponse<ProductResponse>> {
    const page = filters.page ?? DEFAULT_PAGE;
    const limit = filters.limit ?? DEFAULT_LIMIT;

    const where = {
      ...(filters.vendedorId ? { vendedorId: filters.vendedorId } : {}),
      ...(filters.categoriaId ? { categoriaId: filters.categoriaId } : {}),
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
        totalPages: Math.ceil(total / limit) || 0,
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

  async search(query: SearchProductDto): Promise<PaginatedResponse<ProductResponse>> {
    const page = query.page ?? DEFAULT_PAGE;
    const limit = query.limit ?? DEFAULT_LIMIT;

    const where = {
      activo: true,
      nombre: { contains: query.q, mode: Prisma.QueryMode.insensitive },
      ...(query.vendedorId ? { vendedorId: query.vendedorId } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.producto.findMany({
        where,
        include: { categoria: true, marca: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { nombre: 'asc' },
      }),
      this.prisma.producto.count({ where }),
    ]);

    return {
      data: items.map((p) => this.toResponse(p)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
      },
    };
  }

  async create(vendedorId: string, dto: CreateProductDto): Promise<{ id: string; created: boolean }> {
    const porcentajeIva = dto.porcentajeIva ?? 21;
    const porcentajeImpuestos = dto.porcentajeImpuestos ?? 0;
    const precioFinal = this.pricing.calcularPrecioFinal(
      dto.precioSinIva,
      porcentajeIva,
      porcentajeImpuestos,
    );

    const producto = await this.prisma.producto.create({
      data: {
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        precioSinIva: dto.precioSinIva,
        precioFinal,
        imagen: dto.imagen,
        stock: dto.stock,
        mostrarPrecio: dto.mostrarPrecio ?? true,
        porcentajeIva,
        porcentajeImpuestos,
        vendedorId,
        categoriaId: dto.categoriaId,
        marcaId: dto.marcaId,
      },
    });

    this.eventEmitter.emit('product.created', {
      type: 'ProductCreated' as const,
      productId: producto.id,
      vendedorId,
      nombre: producto.nombre,
      precioFinal: Number(producto.precioFinal),
      stock: producto.stock,
      timestamp: new Date().toISOString(),
    });

    return { id: producto.id, created: true };
  }

  async update(
    vendedorId: string,
    id: string,
    dto: UpdateProductDto,
  ): Promise<{ id: string; updated: boolean }> {
    // Transacción: ownership check + update atómicos, elimina
    // condición de carrera entre ambas operaciones.
    let updatedProduct: {
      nombre: string;
      precioSinIva: { toString(): string };
      precioFinal: { toString(): string };
      stock: number;
      activo: boolean;
      porcentajeIva: { toString(): string };
      porcentajeImpuestos: { toString(): string };
    } | undefined;

    let precioFinalCalculado: Prisma.Decimal | undefined;

    await this.prisma.$transaction(async (tx) => {
      const producto = await tx.producto.findUnique({
        where: { id },
        select: {
          vendedorId: true,
          nombre: true,
          precioSinIva: true,
          precioFinal: true,
          stock: true,
          activo: true,
          porcentajeIva: true,
          porcentajeImpuestos: true,
        },
      });
      if (!producto) throw new NotFoundException('Producto no encontrado');
      if (producto.vendedorId !== vendedorId) throw new ForbiddenException('No tenés permiso sobre este producto');

      // Recalcular precioFinal si cambia precioSinIva o algún porcentaje
      const recalcular =
        dto.precioSinIva !== undefined ||
        dto.porcentajeIva !== undefined ||
        dto.porcentajeImpuestos !== undefined;

      if (recalcular) {
        const nuevoPrecioSinIva = dto.precioSinIva ?? Number(producto.precioSinIva);
        const nuevoIva = dto.porcentajeIva ?? Number(producto.porcentajeIva);
        const nuevoImp = dto.porcentajeImpuestos ?? Number(producto.porcentajeImpuestos);
        precioFinalCalculado = this.pricing.calcularPrecioFinal(nuevoPrecioSinIva, nuevoIva, nuevoImp);
      }

      await tx.producto.update({
        where: { id },
        data: {
          ...(dto.nombre !== undefined ? { nombre: dto.nombre } : {}),
          ...(dto.descripcion !== undefined ? { descripcion: dto.descripcion } : {}),
          ...(dto.precioSinIva !== undefined ? { precioSinIva: dto.precioSinIva } : {}),
          ...(precioFinalCalculado !== undefined ? { precioFinal: precioFinalCalculado } : {}),
          ...(dto.porcentajeIva !== undefined ? { porcentajeIva: dto.porcentajeIva } : {}),
          ...(dto.porcentajeImpuestos !== undefined ? { porcentajeImpuestos: dto.porcentajeImpuestos } : {}),
          ...(dto.stock !== undefined ? { stock: dto.stock } : {}),
          ...(dto.imagen !== undefined ? { imagen: dto.imagen } : {}),
          ...(dto.activo !== undefined ? { activo: dto.activo } : {}),
          ...(dto.mostrarPrecio !== undefined ? { mostrarPrecio: dto.mostrarPrecio } : {}),
          ...(dto.categoriaId !== undefined ? { categoriaId: dto.categoriaId } : {}),
          ...(dto.marcaId !== undefined ? { marcaId: dto.marcaId } : {}),
        },
      });

      updatedProduct = producto;
    });

    this.eventEmitter.emit('product.updated', {
      type: 'ProductUpdated' as const,
      productId: id,
      vendedorId,
      nombre: dto.nombre ?? updatedProduct!.nombre,
      precioFinal: precioFinalCalculado !== undefined
        ? Number(precioFinalCalculado)
        : Number(updatedProduct!.precioFinal),
      stock: dto.stock ?? updatedProduct!.stock,
      activo: dto.activo ?? updatedProduct!.activo,
      timestamp: new Date().toISOString(),
    });

    return { id, updated: true };
  }

  async remove(vendedorId: string, id: string): Promise<{ deleted: boolean }> {
    const result = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.producto.updateMany({
        where: { id, vendedorId, activo: true },
        data: { activo: false },
      });

      if (count === 0) {
        const exists = await tx.producto.findUnique({
          where: { id },
          select: { id: true },
        });
        if (!exists) throw new NotFoundException('Producto no encontrado');
        throw new ForbiddenException('No tenés permiso sobre este producto');
      }

      return { deleted: true };
    });

    if (result.deleted) {
      this.eventEmitter.emit('product.deleted', {
        type: 'ProductDeleted' as const,
        productId: id,
        vendedorId,
        timestamp: new Date().toISOString(),
      });
    }

    return result;
  }

  private toResponse(producto: {
    id: string;
    nombre: string;
    descripcion: string | null;
    precioSinIva: { toString(): string };
    precioFinal: { toString(): string };
    porcentajeIva: { toString(): string };
    porcentajeImpuestos: { toString(): string };
    imagen: string | null;
    stock: number;
    activo: boolean;
    mostrarPrecio: boolean;
    vendedorId: string;
    categoria?: { nombre: string } | null;
    marca?: { nombre: string } | null;
  }): ProductResponse {
    const precioSinIva = Number(producto.precioSinIva);
    const pctIva = Number(producto.porcentajeIva);
    const pctImp = Number(producto.porcentajeImpuestos);

    return {
      id: producto.id,
      nombre: producto.nombre,
      descripcion: producto.descripcion ?? undefined,
      precioSinIva,
      porcentajeIva: pctIva,
      porcentajeImpuestos: pctImp,
      costoIva: Number(new Prisma.Decimal(precioSinIva).times(pctIva).div(100).toDecimalPlaces(2)),
      costoImpuestos: Number(new Prisma.Decimal(precioSinIva).times(pctImp).div(100).toDecimalPlaces(2)),
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
