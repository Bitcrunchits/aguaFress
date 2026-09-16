import { Test, type TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { VendedorEstado } from '@agua/contracts';
import { VendedoresService } from './vendedores.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';

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
        { provide: AuditLogService, useValue: { record: jest.fn() } },
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

  // ═══════════════════════════════════════════════
  //  LIST — pagination + filter + search
  // ═══════════════════════════════════════════════

  describe('list', () => {
    it('devuelve lista paginada con valores por defecto', async () => {
      const mockVendedores = [
        {
          id: 'v-1',
          nombre: 'Juan',
          apellido: 'Pérez',
          telefono: '11-5555-0100',
          empresa: 'Empresa',
          estado: VendedorEstado.ACTIVO,
          ciudad_default: 'CABA',
          auth_user: { email: 'juan@email.com' },
          _count: { clientes: 3 },
          created_at: new Date('2024-01-01'),
        },
        {
          id: 'v-2',
          nombre: 'María',
          apellido: 'García',
          telefono: null,
          empresa: null,
          estado: VendedorEstado.PENDIENTE,
          ciudad_default: '',
          auth_user: { email: 'maria@email.com' },
          _count: { clientes: 0 },
          created_at: new Date('2024-01-02'),
        },
      ];

      prisma.vendedor.findMany.mockResolvedValue(mockVendedores);
      prisma.vendedor.count.mockResolvedValue(2);

      const result = await service.list({});

      expect(prisma.vendedor.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        where: {},
        orderBy: { created_at: 'desc' },
        include: {
          auth_user: { select: { email: true } },
          _count: { select: { clientes: true } },
        },
      });
      expect(prisma.vendedor.count).toHaveBeenCalledWith({ where: {} });
      expect(result).toEqual({
        data: expect.any(Array),
        pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
      });
      expect(result.data).toHaveLength(2);
    });

    it('filtra por estado cuando se provee', async () => {
      prisma.vendedor.findMany.mockResolvedValue([]);
      prisma.vendedor.count.mockResolvedValue(0);

      await service.list({ estado: VendedorEstado.ACTIVO });

      expect(prisma.vendedor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { estado: VendedorEstado.ACTIVO },
        }),
      );
      expect(prisma.vendedor.count).toHaveBeenCalledWith({
        where: { estado: VendedorEstado.ACTIVO },
      });
    });

    it('busca por texto en nombre, apellido y empresa (case-insensitive)', async () => {
      prisma.vendedor.findMany.mockResolvedValue([]);
      prisma.vendedor.count.mockResolvedValue(0);

      await service.list({ search: 'Acme' });

      expect(prisma.vendedor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { nombre: { contains: 'Acme', mode: 'insensitive' } },
              { apellido: { contains: 'Acme', mode: 'insensitive' } },
              { empresa: { contains: 'Acme', mode: 'insensitive' } },
            ],
          },
        }),
      );
    });

    it('combina filtro estado + search', async () => {
      prisma.vendedor.findMany.mockResolvedValue([]);
      prisma.vendedor.count.mockResolvedValue(0);

      await service.list({
        estado: VendedorEstado.ACTIVO,
        search: 'Pérez',
      });

      expect(prisma.vendedor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            estado: VendedorEstado.ACTIVO,
            OR: expect.any(Array),
          },
        }),
      );
    });

    it('pagina correctamente con page y limit personalizados', async () => {
      prisma.vendedor.findMany.mockResolvedValue([]);
      prisma.vendedor.count.mockResolvedValue(50);

      const result = await service.list({ page: 3, limit: 20 });

      expect(prisma.vendedor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 40,
          take: 20,
        }),
      );
      expect(result.pagination.page).toBe(3);
      expect(result.pagination.limit).toBe(20);
    });

    it('incluye _count de clientes en cada vendedor', async () => {
      prisma.vendedor.findMany.mockResolvedValue([
        {
          id: 'v-1',
          nombre: 'Juan',
          apellido: null,
          telefono: null,
          empresa: null,
          estado: VendedorEstado.ACTIVO,
          ciudad_default: '',
          auth_user: { email: 'juan@email.com' },
          _count: { clientes: 5 },
          created_at: new Date(),
        },
      ]);
      prisma.vendedor.count.mockResolvedValue(1);

      const result = await service.list({});

      expect(result.data[0]).toMatchObject({
        _count: { clientes: 5 },
      });
    });
  });

  // ═══════════════════════════════════════════════
  //  GET BY ID
  // ═══════════════════════════════════════════════

  describe('getById', () => {
    const fullVendedor = {
      id: 'vendedor-1',
      nombre: 'Juan Pérez',
      apellido: 'Pérez',
      telefono: '11-5555-0100',
      empresa: 'Acme SA',
      logo: 'https://img.com/logo.png',
      estado: VendedorEstado.ACTIVO,
      ciudad_default: 'CABA',
      zona_entrega: 'Palermo',
      qr_token: 'qr-abc',
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-06-01'),
      auth_user: {
        email: 'juan@test.com',
      },
      _count: {
        clientes: 7,
      },
    };

    it('devuelve vendedor completo con email y _count clientes', async () => {
      prisma.vendedor.findUnique.mockResolvedValue(fullVendedor);

      const result = await service.getById('vendedor-1');

      expect(prisma.vendedor.findUnique).toHaveBeenCalledWith({
        where: { id: 'vendedor-1' },
        include: {
          auth_user: { select: { email: true } },
          _count: { select: { clientes: true } },
        },
      });
      expect(result).toBeDefined();
      expect(result.id).toBe('vendedor-1');
      expect(result.auth_user.email).toBe('juan@test.com');
      expect(result._count.clientes).toBe(7);
    });

    it('lanza NotFoundException cuando no existe', async () => {
      prisma.vendedor.findUnique.mockResolvedValue(null);

      await expect(service.getById('fake-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getById('fake-id')).rejects.toThrow(
        'Vendedor not found',
      );
    });

    it('incluye datos completos del perfil del vendedor', async () => {
      prisma.vendedor.findUnique.mockResolvedValue(fullVendedor);

      const result = await service.getById('vendedor-1');

      expect(result.nombre).toBe('Juan Pérez');
      expect(result.empresa).toBe('Acme SA');
      expect(result.estado).toBe(VendedorEstado.ACTIVO);
      expect(result.ciudad_default).toBe('CABA');
      expect(result.zona_entrega).toBe('Palermo');
    });
  });

  // ═══════════════════════════════════════════════
  //  UPDATE
  // ═══════════════════════════════════════════════

  describe('update', () => {
    const existingVendedor = {
      id: 'vendedor-1',
      nombre: 'Juan Pérez',
      estado: VendedorEstado.ACTIVO,
    };

    const updatedVendedor = {
      ...existingVendedor,
      empresa: 'Nueva SA',
      telefono: '11-5555-0199',
    };

    it('actualiza solo los campos provistos', async () => {
      prisma.vendedor.findUnique.mockResolvedValue(existingVendedor);
      prisma.vendedor.update.mockResolvedValue(updatedVendedor);

      const result = await service.update('vendedor-1', {
        empresa: 'Nueva SA',
        telefono: '11-5555-0199',
      });

      expect(prisma.vendedor.update).toHaveBeenCalledWith({
        where: { id: 'vendedor-1' },
        data: {
          empresa: 'Nueva SA',
          telefono: '11-5555-0199',
        },
      });
      expect(result.empresa).toBe('Nueva SA');
      expect(result.telefono).toBe('11-5555-0199');
    });

    it('lanza NotFoundException si el vendedor no existe', async () => {
      prisma.vendedor.findUnique.mockResolvedValue(null);

      await expect(
        service.update('fake-id', { empresa: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('actualiza un solo campo parcialmente', async () => {
      prisma.vendedor.findUnique.mockResolvedValue(existingVendedor);
      prisma.vendedor.update.mockResolvedValue({
        ...existingVendedor,
        logo: 'https://img.com/new-logo.png',
      });

      const result = await service.update('vendedor-1', {
        logo: 'https://img.com/new-logo.png',
      });

      expect(prisma.vendedor.update).toHaveBeenCalledWith({
        where: { id: 'vendedor-1' },
        data: { logo: 'https://img.com/new-logo.png' },
      });
      expect(result.logo).toBe('https://img.com/new-logo.png');
    });
  });

  // ═══════════════════════════════════════════════
  //  GET MY PROFILE
  // ═══════════════════════════════════════════════

  describe('getMyProfile', () => {
    const activeVendedor = {
      id: 'vendedor-1',
      nombre: 'Juan Pérez',
      apellido: 'Pérez',
      telefono: '11-5555-0100',
      empresa: 'Acme SA',
      logo: 'https://img.com/logo.png',
      estado: VendedorEstado.ACTIVO,
      ciudad_default: 'CABA',
      zona_entrega: 'Palermo',
      qr_token: 'qr-abc',
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-06-01'),
      auth_user: {
        id: 'user-1',
        email: 'juan@test.com',
        role: 'vendedor',
        is_active: true,
      },
      _count: { clientes: 5 },
    };

    it('devuelve perfil completo para vendedor activo', async () => {
      prisma.vendedor.findUnique.mockResolvedValue(activeVendedor);

      const result = await service.getMyProfile('user-1');

      expect(prisma.vendedor.findUnique).toHaveBeenCalledWith({
        where: { auth_user_id: 'user-1' },
        include: {
          auth_user: {
            select: {
              id: true,
              email: true,
              role: true,
              is_active: true,
            },
          },
          _count: { select: { clientes: true } },
        },
      });
      expect(result).toBeDefined();
      expect(result.id).toBe('vendedor-1');
      expect(result.auth_user.email).toBe('juan@test.com');
    });

    it('lanza ForbiddenException si el vendedor está inactivo', async () => {
      prisma.vendedor.findUnique.mockResolvedValue({
        ...activeVendedor,
        estado: VendedorEstado.INACTIVO,
      });

      await expect(service.getMyProfile('user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('lanza ForbiddenException si el vendedor está bloqueado', async () => {
      prisma.vendedor.findUnique.mockResolvedValue({
        ...activeVendedor,
        estado: VendedorEstado.BLOQUEADO,
      });

      await expect(service.getMyProfile('user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('lanza NotFoundException si no hay vendedor para ese userId', async () => {
      prisma.vendedor.findUnique.mockResolvedValue(null);

      await expect(service.getMyProfile('user-nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ═══════════════════════════════════════════════
  //  UPDATE MY PROFILE
  // ═══════════════════════════════════════════════

  describe('updateMyProfile', () => {
    const baseVendedor = {
      id: 'vendedor-1',
      nombre: 'Juan',
      apellido: null,
      telefono: null,
      empresa: null,
      logo: null,
      estado: VendedorEstado.ACTIVO,
      ciudad_default: null,
      zona_entrega: null,
      auth_user: {
        id: 'user-1',
        email: 'juan@test.com',
        role: 'vendedor',
        is_active: true,
      },
      _count: { clientes: 3 },
    };

    it('actualiza campos del perfil para vendedor activo', async () => {
      prisma.vendedor.findUnique.mockResolvedValueOnce(baseVendedor);
      prisma.vendedor.update.mockResolvedValue({
        ...baseVendedor,
        nombre: 'Juan Updated',
        telefono: '11-5555-0200',
      });

      const result = await service.updateMyProfile('user-1', {
        nombre: 'Juan Updated',
        telefono: '11-5555-0200',
      });

      expect(prisma.vendedor.update).toHaveBeenCalledWith({
        where: { auth_user_id: 'user-1' },
        data: {
          nombre: 'Juan Updated',
          telefono: '11-5555-0200',
        },
      });
      expect(result).toBeDefined();
    });

    it('lanza ForbiddenException si el vendedor está inactivo', async () => {
      prisma.vendedor.findUnique.mockResolvedValue({
        ...baseVendedor,
        estado: VendedorEstado.INACTIVO,
      });

      await expect(
        service.updateMyProfile('user-1', { nombre: 'Test' }),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.vendedor.update).not.toHaveBeenCalled();
    });

    it('lanza ForbiddenException si el vendedor está bloqueado', async () => {
      prisma.vendedor.findUnique.mockResolvedValue({
        ...baseVendedor,
        estado: VendedorEstado.BLOQUEADO,
      });

      await expect(
        service.updateMyProfile('user-1', { nombre: 'Test' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rechaza actualizar logo si el vendedor está pendiente', async () => {
      prisma.vendedor.findUnique.mockResolvedValue({
        ...baseVendedor,
        estado: VendedorEstado.PENDIENTE,
      });

      await expect(
        service.updateMyProfile('user-1', { logo: 'logos/logo.webp' }),
      ).rejects.toThrow('El vendedor debe estar activo para actualizar el logo.');

      expect(prisma.vendedor.update).not.toHaveBeenCalled();
    });

    it('actualiza solo los campos provistos (parcial)', async () => {
      prisma.vendedor.findUnique.mockResolvedValue(baseVendedor);
      prisma.vendedor.update.mockResolvedValue({
        ...baseVendedor,
        empresa: 'Nueva Empresa',
      });

      await service.updateMyProfile('user-1', {
        empresa: 'Nueva Empresa',
      });

      expect(prisma.vendedor.update).toHaveBeenCalledWith({
        where: { auth_user_id: 'user-1' },
        data: { empresa: 'Nueva Empresa' },
      });
    });

    it('lanza NotFoundException si no hay vendedor para ese userId', async () => {
      prisma.vendedor.findUnique.mockResolvedValue(null);

      await expect(
        service.updateMyProfile('user-nonexistent', { nombre: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
