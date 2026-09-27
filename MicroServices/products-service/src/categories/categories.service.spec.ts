import { Test, type TestingModule } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../common/prisma/prisma.service';
import type { CreateCategoriaDto } from './dto/create-categoria.dto';

const mockPrisma = {
  categoria: { findMany: jest.fn(), aggregate: jest.fn(), create: jest.fn() },
  marca: { findMany: jest.fn() },
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
      mockPrisma.categoria.aggregate.mockResolvedValue({ _max: { orden: null } });
      mockPrisma.categoria.create.mockResolvedValue({ id: 'c1', nombre: 'Aguas', orden: 1, vendedorId: 'vendedor-1' });

      await service.createCategoria('vendedor-1', { nombre: 'Aguas' });

      expect(mockPrisma.categoria.create).toHaveBeenCalledWith({
        data: { nombre: 'Aguas', orden: 1, vendedorId: 'vendedor-1' },
      });
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
});
