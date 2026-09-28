import { Test, type TestingModule } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../common/prisma/prisma.service';
import type { CreateCategoriaDto } from './dto/create-categoria.dto';

const mockPrisma = {
  categoria: { findMany: jest.fn(), findFirst: jest.fn(), aggregate: jest.fn(), create: jest.fn(), update: jest.fn() },
  marca: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
};

describe('CategoriesService', () => {
  let service: CategoriesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [CategoriesService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  describe('listCategorias', () => {
    it('filtra por vendedorId y ordena por orden asc', async () => {
      const now = new Date('2025-01-01T00:00:00Z');
      mockPrisma.categoria.findMany.mockResolvedValue([
        { id: 'c1', nombre: 'Bebidas', orden: 1, activo: true, vendedorId: 'vendedor-1', createdAt: now, updatedAt: now },
      ]);

      const result = await service.listCategorias('vendedor-1');

      expect(mockPrisma.categoria.findMany).toHaveBeenCalledWith({
        where: { vendedorId: 'vendedor-1', activo: true },
        orderBy: { orden: 'asc' },
      });
      expect(result).toEqual([{ id: 'c1', nombre: 'Bebidas', orden: 1, activo: true, vendedorId: 'vendedor-1', createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' }]);
    });
  });

  describe('createCategoria', () => {
    it('asigna el siguiente orden activo del vendedor e ignora orden del cliente', async () => {
      mockPrisma.categoria.findFirst.mockResolvedValue(null);
      mockPrisma.categoria.aggregate.mockResolvedValue({ _max: { orden: 4 } });
      mockPrisma.categoria.create.mockResolvedValue({ id: 'c2', nombre: 'Sodas', orden: 5, vendedorId: 'vendedor-1' });

      await service.createCategoria('vendedor-1', { nombre: 'Sodas', orden: 99 } as CreateCategoriaDto & { orden: number });

      expect(mockPrisma.categoria.aggregate).toHaveBeenCalledWith({
        where: { vendedorId: 'vendedor-1', activo: true },
        _max: { orden: true },
      });
      expect(mockPrisma.categoria.create).toHaveBeenCalledWith({
        data: { nombre: 'Sodas', orden: 5, vendedorId: 'vendedor-1' },
      });
    });

    it('asigna orden 1 cuando el vendedor no tiene categorías activas', async () => {
      mockPrisma.categoria.findFirst.mockResolvedValue(null);
      mockPrisma.categoria.aggregate.mockResolvedValue({ _max: { orden: null } });
      mockPrisma.categoria.create.mockResolvedValue({ id: 'c1', nombre: 'Aguas', orden: 1, vendedorId: 'vendedor-1' });

      await service.createCategoria('vendedor-1', { nombre: 'Aguas' });

      expect(mockPrisma.categoria.create).toHaveBeenCalledWith({
        data: { nombre: 'Aguas', orden: 1, vendedorId: 'vendedor-1' },
      });
    });

    it('rechaza nombre duplicado aunque la categoría esté inactiva con ConflictException', async () => {
      mockPrisma.categoria.findFirst.mockResolvedValue({ id: 'existente' });

      await expect(service.createCategoria('vendedor-1', { nombre: 'Aguas' })).rejects.toThrow(
        'Ya existe una categoría con ese nombre. Elegí un nombre diferente.',
      );
      expect(mockPrisma.categoria.create).not.toHaveBeenCalled();
    });
  });

  describe('deleteCategoria', () => {
    it('marca la categoría como inactiva sin borrar la fila', async () => {
      mockPrisma.categoria.findFirst.mockResolvedValue({ id: 'c1', vendedorId: 'vendedor-1', activo: true });
      mockPrisma.categoria.update.mockResolvedValue({});

      await expect(service.deleteCategoria('vendedor-1', 'c1')).resolves.toEqual({ deactivated: true });

      expect(mockPrisma.categoria.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: { activo: false },
      });
    });

    it('es idempotente cuando la categoría ya está inactiva', async () => {
      mockPrisma.categoria.findFirst.mockResolvedValue({ id: 'c1', vendedorId: 'vendedor-1', activo: false });

      await expect(service.deleteCategoria('vendedor-1', 'c1')).resolves.toEqual({ deactivated: true });
      expect(mockPrisma.categoria.update).not.toHaveBeenCalled();
    });
  });

  describe('reactivateCategoria', () => {
    it('reactiva una categoría inactiva sin validar duplicados imposibles por hard unique', async () => {
      const now = new Date('2025-01-01T00:00:00Z');
      mockPrisma.categoria.findFirst.mockResolvedValueOnce({ id: 'c1', nombre: 'Bidones', orden: 1, vendedorId: 'vendedor-1', activo: false, createdAt: now, updatedAt: now });
      mockPrisma.categoria.update.mockResolvedValue({ id: 'c1', nombre: 'Bidones', orden: 1, vendedorId: 'vendedor-1', activo: true, createdAt: now, updatedAt: now });

      const result = await service.reactivateCategoria('vendedor-1', 'c1');

      expect(mockPrisma.categoria.update).toHaveBeenCalledWith({ where: { id: 'c1' }, data: { activo: true } });
      expect(mockPrisma.categoria.findFirst).toHaveBeenCalledTimes(1);
      expect(result.activo).toBe(true);
    });
  });

  describe('listInactiveCategorias', () => {
    it('lista categorías inactivas para auditoría y permite filtrar por vendedor', async () => {
      const now = new Date('2025-01-01T00:00:00Z');
      mockPrisma.categoria.findMany.mockResolvedValue([
        { id: 'c1', nombre: 'Archivada', orden: 1, activo: false, vendedorId: 'vendedor-1', createdAt: now, updatedAt: now },
      ]);

      const result = await service.listInactiveCategorias('vendedor-1');

      expect(mockPrisma.categoria.findMany).toHaveBeenCalledWith({
        where: { activo: false, vendedorId: 'vendedor-1' },
        orderBy: [{ updatedAt: 'desc' }, { nombre: 'asc' }],
      });
      expect(result[0].activo).toBe(false);
    });
  });

  describe('listMarcas', () => {
    it('filtra por vendedorId y ordena por nombre asc', async () => {
      const now = new Date('2025-01-01T00:00:00Z');
      mockPrisma.marca.findMany.mockResolvedValue([
        { id: 'm1', nombre: 'AguaFress', activo: true, vendedorId: 'vendedor-1', createdAt: now, updatedAt: now },
      ]);

      const result = await service.listMarcas('vendedor-1');

      expect(mockPrisma.marca.findMany).toHaveBeenCalledWith({
        where: { vendedorId: 'vendedor-1', activo: true },
        orderBy: { nombre: 'asc' },
      });
      expect(result).toEqual([{ id: 'm1', nombre: 'AguaFress', activo: true, vendedorId: 'vendedor-1', createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' }]);
    });
  });

  describe('createMarca', () => {
    it('rechaza nombre duplicado aunque la marca esté inactiva con ConflictException', async () => {
      mockPrisma.marca.findFirst.mockResolvedValue({ id: 'existente' });

      await expect(service.createMarca('vendedor-1', { nombre: 'AguaFress' })).rejects.toThrow(
        'Ya existe una marca con ese nombre. Elegí un nombre diferente.',
      );
      expect(mockPrisma.marca.create).not.toHaveBeenCalled();
    });
  });

  describe('reactivateMarca', () => {
    it('reactiva una marca inactiva sin validar duplicados imposibles por hard unique', async () => {
      const now = new Date('2025-01-01T00:00:00Z');
      mockPrisma.marca.findFirst.mockResolvedValueOnce({ id: 'm1', nombre: 'AguaFress', vendedorId: 'vendedor-1', activo: false, createdAt: now, updatedAt: now });
      mockPrisma.marca.update.mockResolvedValue({ id: 'm1', nombre: 'AguaFress', vendedorId: 'vendedor-1', activo: true, createdAt: now, updatedAt: now });

      const result = await service.reactivateMarca('vendedor-1', 'm1');

      expect(mockPrisma.marca.update).toHaveBeenCalledWith({ where: { id: 'm1' }, data: { activo: true } });
      expect(mockPrisma.marca.findFirst).toHaveBeenCalledTimes(1);
      expect(result.activo).toBe(true);
    });
  });
});
