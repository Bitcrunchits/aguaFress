import { Test, type TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { VendedorEstado } from '@agua/contracts';
import { VendedoresService } from './vendedores.service';
import { PrismaService } from '../common/prisma/prisma.service';

const mockPrisma = {
  vendedor: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  authUser: {
    findUnique: jest.fn(),
  },
};

describe('VendedoresService', () => {
  let service: VendedoresService;
  let prisma: typeof mockPrisma;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendedoresService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<VendedoresService>(VendedoresService);
    prisma = mockPrisma;
  });

  // ═══════════════════════════════════════════════
  //  STATUS TRANSITIONS (changeEstado)
  // ═══════════════════════════════════════════════

  describe('changeEstado — valid transitions', () => {
    const vendedorBase = {
      id: 'vendedor-1',
      nombre: 'Juan Pérez',
      estado: VendedorEstado.PENDIENTE,
    };

    function mockCurrentVendedor(estado: VendedorEstado) {
      prisma.vendedor.findUnique.mockResolvedValue({
        ...vendedorBase,
        estado,
      });
    }

    function mockUpdate() {
      prisma.vendedor.update.mockImplementation(
        (_args: { where: { id: string }; data: { estado: string } }) =>
          Promise.resolve({
            ...vendedorBase,
            estado: _args.data.estado as VendedorEstado,
          }),
      );
    }

    it('PENDIENTE → ACTIVO es válida', async () => {
      mockCurrentVendedor(VendedorEstado.PENDIENTE);
      mockUpdate();

      const result = await service.changeEstado('vendedor-1', {
        estado: VendedorEstado.ACTIVO,
      });

      expect(prisma.vendedor.update).toHaveBeenCalledWith({
        where: { id: 'vendedor-1' },
        data: { estado: VendedorEstado.ACTIVO },
      });
      expect(result).toBeDefined();
    });

    it('ACTIVO → INACTIVO es válida', async () => {
      mockCurrentVendedor(VendedorEstado.ACTIVO);
      mockUpdate();

      const result = await service.changeEstado('vendedor-1', {
        estado: VendedorEstado.INACTIVO,
      });

      expect(prisma.vendedor.update).toHaveBeenCalledWith({
        where: { id: 'vendedor-1' },
        data: { estado: VendedorEstado.INACTIVO },
      });
      expect(result).toBeDefined();
    });

    it('ACTIVO → BLOQUEADO es válida', async () => {
      mockCurrentVendedor(VendedorEstado.ACTIVO);
      mockUpdate();

      const result = await service.changeEstado('vendedor-1', {
        estado: VendedorEstado.BLOQUEADO,
      });

      expect(prisma.vendedor.update).toHaveBeenCalledWith({
        where: { id: 'vendedor-1' },
        data: { estado: VendedorEstado.BLOQUEADO },
      });
      expect(result).toBeDefined();
    });

    it('INACTIVO → ACTIVO es válida', async () => {
      mockCurrentVendedor(VendedorEstado.INACTIVO);
      mockUpdate();

      const result = await service.changeEstado('vendedor-1', {
        estado: VendedorEstado.ACTIVO,
      });

      expect(prisma.vendedor.update).toHaveBeenCalledWith({
        where: { id: 'vendedor-1' },
        data: { estado: VendedorEstado.ACTIVO },
      });
      expect(result).toBeDefined();
    });

    it('BLOQUEADO → INACTIVO es válida', async () => {
      mockCurrentVendedor(VendedorEstado.BLOQUEADO);
      mockUpdate();

      const result = await service.changeEstado('vendedor-1', {
        estado: VendedorEstado.INACTIVO,
      });

      expect(prisma.vendedor.update).toHaveBeenCalledWith({
        where: { id: 'vendedor-1' },
        data: { estado: VendedorEstado.INACTIVO },
      });
      expect(result).toBeDefined();
    });
  });

  describe('changeEstado — invalid transitions', () => {
    const vendedorBase = {
      id: 'vendedor-1',
      nombre: 'Juan Pérez',
      estado: VendedorEstado.PENDIENTE,
    };

    function mockCurrentVendedor(estado: VendedorEstado) {
      prisma.vendedor.findUnique.mockResolvedValue({
        ...vendedorBase,
        estado,
      });
    }

    async function expectInvalidTransition(
      current: VendedorEstado,
      target: VendedorEstado,
    ) {
      mockCurrentVendedor(current);

      await expect(
        service.changeEstado('vendedor-1', { estado: target }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.vendedor.update).not.toHaveBeenCalled();
    }

    it('PENDIENTE → INACTIVO lanza 400', async () => {
      await expectInvalidTransition(
        VendedorEstado.PENDIENTE,
        VendedorEstado.INACTIVO,
      );
    });

    it('PENDIENTE → BLOQUEADO lanza 400', async () => {
      await expectInvalidTransition(
        VendedorEstado.PENDIENTE,
        VendedorEstado.BLOQUEADO,
      );
    });

    it('PENDIENTE → PENDIENTE (mismo estado) lanza 400', async () => {
      await expectInvalidTransition(
        VendedorEstado.PENDIENTE,
        VendedorEstado.PENDIENTE,
      );
    });

    it('ACTIVO → PENDIENTE lanza 400', async () => {
      await expectInvalidTransition(
        VendedorEstado.ACTIVO,
        VendedorEstado.PENDIENTE,
      );
    });

    it('ACTIVO → ACTIVO (mismo estado) lanza 400', async () => {
      await expectInvalidTransition(
        VendedorEstado.ACTIVO,
        VendedorEstado.ACTIVO,
      );
    });

    it('INACTIVO → BLOQUEADO lanza 400', async () => {
      await expectInvalidTransition(
        VendedorEstado.INACTIVO,
        VendedorEstado.BLOQUEADO,
      );
    });

    it('INACTIVO → PENDIENTE lanza 400', async () => {
      await expectInvalidTransition(
        VendedorEstado.INACTIVO,
        VendedorEstado.PENDIENTE,
      );
    });

    it('BLOQUEADO → ACTIVO lanza 400', async () => {
      await expectInvalidTransition(
        VendedorEstado.BLOQUEADO,
        VendedorEstado.ACTIVO,
      );
    });

    it('BLOQUEADO → PENDIENTE lanza 400', async () => {
      await expectInvalidTransition(
        VendedorEstado.BLOQUEADO,
        VendedorEstado.PENDIENTE,
      );
    });

    it('lanza 400 con mensaje que incluye las transiciones válidas', async () => {
      mockCurrentVendedor(VendedorEstado.PENDIENTE);

      try {
        await service.changeEstado('vendedor-1', {
          estate: VendedorEstado.INACTIVO,
        } as any);
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
        expect((err as BadRequestException).message).toContain('pendiente');
        expect((err as BadRequestException).message).toContain('activo');
      }
    });

    it('lanza 404 si el vendedor no existe en changeEstado', async () => {
      prisma.vendedor.findUnique.mockResolvedValue(null);

      await expect(
        service.changeEstado('fake-id', { estado: VendedorEstado.ACTIVO }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
