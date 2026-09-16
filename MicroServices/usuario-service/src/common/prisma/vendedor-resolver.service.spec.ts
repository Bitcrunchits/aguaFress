import { Test, type TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { VendedorEstado } from '@agua/contracts';
import { VendedorResolver } from './vendedor-resolver.service';
import { PrismaService } from './prisma.service';

const mockPrisma = {
  vendedor: {
    findUnique: jest.fn(),
  },
};

describe('VendedorResolver', () => {
  let resolver: VendedorResolver;
  let prisma: typeof mockPrisma;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendedorResolver,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    resolver = module.get<VendedorResolver>(VendedorResolver);
    prisma = mockPrisma;
  });

  describe('resolve', () => {
    it('devuelve vendedor.id cuando existe el authUserId', async () => {
      prisma.vendedor.findUnique.mockResolvedValue({ id: 'vendedor-id' });

      const result = await resolver.resolve('valid-auth-user-id');

      expect(prisma.vendedor.findUnique).toHaveBeenCalledWith({
        where: { auth_user_id: 'valid-auth-user-id' },
        select: { id: true },
      });
      expect(result).toBe('vendedor-id');
    });

    it('lanza NotFoundException cuando no existe el authUserId', async () => {
      prisma.vendedor.findUnique.mockResolvedValue(null);

      await expect(
        resolver.resolve('non-existent-auth-user-id'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        resolver.resolve('non-existent-auth-user-id'),
      ).rejects.toThrow('Vendedor profile not found');
    });

    it('selects solo { id: true } (minimal query)', async () => {
      prisma.vendedor.findUnique.mockResolvedValue({ id: 'vendedor-id' });

      await resolver.resolve('valid-auth-user-id');

      expect(prisma.vendedor.findUnique).toHaveBeenCalledWith({
        where: { auth_user_id: 'valid-auth-user-id' },
        select: { id: true },
      });
    });
  });

  describe('resolveActive', () => {
    it('devuelve vendedor.id cuando el vendedor está activo', async () => {
      prisma.vendedor.findUnique.mockResolvedValue({ id: 'vendedor-id', estado: VendedorEstado.ACTIVO });

      const result = await resolver.resolveActive('valid-auth-user-id');

      expect(prisma.vendedor.findUnique).toHaveBeenCalledWith({
        where: { auth_user_id: 'valid-auth-user-id' },
        select: { id: true, estado: true },
      });
      expect(result).toBe('vendedor-id');
    });

    it('lanza ForbiddenException cuando el vendedor no está activo', async () => {
      prisma.vendedor.findUnique.mockResolvedValue({ id: 'vendedor-id', estado: VendedorEstado.PENDIENTE });

      await expect(resolver.resolveActive('pending-auth-user-id')).rejects.toThrow(ForbiddenException);
    });
  });
});
