import { Test, type TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProductsService } from './products.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { PricingService } from '../common/prisma/pricing.service';

const mockTx = {
  producto: {
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
};

const mockPrisma = {
  producto: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockPricing = {
  calcularPrecioFinal: jest.fn(),
};

const baseProducto = {
  id: 'prod-1',
  nombre: 'Bidón 20L',
  descripcion: null,
  precioSinIva: new Prisma.Decimal(100),
  precioFinal: new Prisma.Decimal(121),
  porcentajeIva: new Prisma.Decimal(21),
  porcentajeImpuestos: new Prisma.Decimal(0),
  imagen: null,
  stock: 10,
  activo: true,
  mostrarPrecio: true,
  vendedorId: 'vendedor-1',
  categoria: null,
  marca: null,
};

describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PricingService, useValue: mockPricing },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  describe('list', () => {
    it('devuelve data paginada con el shape { data, pagination }', async () => {
      (mockPrisma.$transaction as jest.Mock).mockResolvedValue([[baseProducto], 1]);

      const result = await service.list({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.pagination).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
    });

    it('usa page=1 y limit=20 por defecto si no se pasan', async () => {
      (mockPrisma.$transaction as jest.Mock).mockResolvedValue([[], 0]);

      const result = await service.list({});

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
    });
  });

  describe('findById', () => {
    it('devuelve el producto si existe', async () => {
      mockPrisma.producto.findUnique.mockResolvedValue(baseProducto);

      const result = await service.findById('prod-1');

      expect(result.id).toBe('prod-1');
    });

    it('lanza NotFoundException si no existe', async () => {
      mockPrisma.producto.findUnique.mockResolvedValue(null);

      await expect(service.findById('no-existe')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('calcula precioFinal via PricingService y crea el producto con el vendedorId dado', async () => {
      mockPricing.calcularPrecioFinal.mockReturnValue(new Prisma.Decimal(121));
      mockPrisma.producto.create.mockResolvedValue({ id: 'prod-nuevo' });

      const result = await service.create('vendedor-1', {
        nombre: 'Bidón 20L',
        precioSinIva: 100,
        categoriaId: 'cat-1',
        stock: 5,
      });

      expect(mockPricing.calcularPrecioFinal).toHaveBeenCalledWith(100, 21, 0);
      expect(mockPrisma.producto.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            vendedorId: 'vendedor-1',
            porcentajeIva: 21,
            porcentajeImpuestos: 0,
          }),
        }),
      );
      expect(result).toEqual({ id: 'prod-nuevo', created: true });
    });
  });

  describe('update', () => {
    beforeEach(() => {
      // Configurar $transaction para ejecutar callbacks con un proxy transaccional
      (mockPrisma.$transaction as jest.Mock).mockImplementation(
        (cb: (tx: typeof mockTx) => unknown) => cb(mockTx),
      );
    });

    it('lanza ForbiddenException si el producto no pertenece al vendedor', async () => {
      mockTx.producto.findUnique.mockResolvedValue({ vendedorId: 'otro-vendedor' });

      await expect(
        service.update('vendedor-1', 'prod-1', { nombre: 'Nuevo nombre' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('lanza NotFoundException si el producto no existe', async () => {
      mockTx.producto.findUnique.mockResolvedValue(null);

      await expect(
        service.update('vendedor-1', 'no-existe', { nombre: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('recalcula precioFinal si cambia precioSinIva', async () => {
      mockTx.producto.findUnique.mockResolvedValue({
        vendedorId: 'vendedor-1',
        precioSinIva: new Prisma.Decimal(100),
        precioFinal: new Prisma.Decimal(121),
        porcentajeIva: new Prisma.Decimal(21),
        porcentajeImpuestos: new Prisma.Decimal(0),
      });
      mockPricing.calcularPrecioFinal.mockReturnValue(new Prisma.Decimal(60.5));
      mockTx.producto.update.mockResolvedValue({});

      await service.update('vendedor-1', 'prod-1', { precioSinIva: 50 });

      expect(mockPricing.calcularPrecioFinal).toHaveBeenCalledWith(50, 21, 0);
    });

    it('recalcula precioFinal si cambia porcentajeIva', async () => {
      mockTx.producto.findUnique.mockResolvedValue({
        vendedorId: 'vendedor-1',
        precioSinIva: new Prisma.Decimal(100),
        precioFinal: new Prisma.Decimal(121),
        porcentajeIva: new Prisma.Decimal(21),
        porcentajeImpuestos: new Prisma.Decimal(0),
      });
      mockPricing.calcularPrecioFinal.mockReturnValue(new Prisma.Decimal(110));
      mockTx.producto.update.mockResolvedValue({});

      await service.update('vendedor-1', 'prod-1', { porcentajeIva: 10 });

      expect(mockPricing.calcularPrecioFinal).toHaveBeenCalledWith(100, 10, 0);
    });

    it('recalcula precioFinal si cambia porcentajeImpuestos', async () => {
      mockTx.producto.findUnique.mockResolvedValue({
        vendedorId: 'vendedor-1',
        precioSinIva: new Prisma.Decimal(100),
        precioFinal: new Prisma.Decimal(121),
        porcentajeIva: new Prisma.Decimal(21),
        porcentajeImpuestos: new Prisma.Decimal(0),
      });
      mockPricing.calcularPrecioFinal.mockReturnValue(new Prisma.Decimal(130));
      mockTx.producto.update.mockResolvedValue({});

      await service.update('vendedor-1', 'prod-1', { porcentajeImpuestos: 9 });

      expect(mockPricing.calcularPrecioFinal).toHaveBeenCalledWith(100, 21, 9);
    });
  });

  describe('remove', () => {
    beforeEach(() => {
      // remove usa $transaction con callback (heredado del describe('update'))
      (mockPrisma.$transaction as jest.Mock).mockImplementation(
        (cb: (tx: typeof mockTx) => unknown) => cb(mockTx),
      );
    });

    it('lanza ForbiddenException si el producto no pertenece al vendedor', async () => {
      mockTx.producto.updateMany.mockResolvedValue({ count: 0 });
      mockTx.producto.findUnique.mockResolvedValue({ id: 'prod-1' }); // existe pero no es suyo

      await expect(service.remove('vendedor-1', 'prod-1')).rejects.toThrow(ForbiddenException);
    });

    it('lanza NotFoundException si el producto no existe', async () => {
      mockTx.producto.updateMany.mockResolvedValue({ count: 0 });
      mockTx.producto.findUnique.mockResolvedValue(null);

      await expect(service.remove('vendedor-1', 'no-existe')).rejects.toThrow(NotFoundException);
    });

    it('desactiva el producto si pertenece al vendedor', async () => {
      mockTx.producto.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.remove('vendedor-1', 'prod-1');

      expect(mockTx.producto.updateMany).toHaveBeenCalledWith({
        where: { id: 'prod-1', vendedorId: 'vendedor-1', activo: true },
        data: { activo: false },
      });
      expect(result).toEqual({ deleted: true });
    });
  });
});
