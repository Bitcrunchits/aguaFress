import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';
import { PrismaService } from '../common/prisma/prisma.service';

const mockPrisma = {
  superAdmin: {
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  vendedor: {
    count: jest.fn(),
  },
  cliente: {
    count: jest.fn(),
  },
  cartera: {
    count: jest.fn(),
  },
};

describe('SuperAdminService', () => {
  let service: SuperAdminService;
  let prisma: typeof mockPrisma;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuperAdminService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SuperAdminService>(SuperAdminService);
    prisma = mockPrisma;
  });

  // ═══════════════════════════════════════════════
  //  GET PROFILE
  // ═══════════════════════════════════════════════

  describe('getProfile', () => {
    const mockAdmin = {
      id: 'sa-1',
      nombre: 'Admin',
      apellido: 'Root',
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-06-01'),
      auth_user: {
        id: 'user-1',
        email: 'admin@test.com',
        role: 'super_admin',
        is_active: true,
      },
    };

    it('devuelve perfil del super admin por auth_user_id', async () => {
      prisma.superAdmin.findUnique.mockResolvedValue(mockAdmin);

      const result = await service.getProfile('user-1');

      expect(prisma.superAdmin.findUnique).toHaveBeenCalledWith({
        where: { auth_user_id: 'user-1' },
        include: {
          auth_user: {
            select: {
              email: true,
              role: true,
            },
          },
        },
      });
      expect(result).toBeDefined();
      expect(result.id).toBe('sa-1');
      expect(result.nombre).toBe('Admin');
      expect(result.email).toBe('admin@test.com');
      expect(result.role).toBe('super_admin');
    });

    it('lanza NotFoundException cuando no existe perfil', async () => {
      prisma.superAdmin.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('user-nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getProfile('user-nonexistent')).rejects.toThrow(
        'Super admin profile not found',
      );
    });
  });

  // ═══════════════════════════════════════════════
  //  UPDATE PROFILE
  // ═══════════════════════════════════════════════

  describe('updateProfile', () => {
    const existingAdmin = {
      id: 'sa-1',
      auth_user_id: 'user-1',
      nombre: 'Admin',
      apellido: 'Root',
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-06-01'),
    };

    const mockUpdated = {
      id: 'sa-1',
      nombre: 'Super',
      apellido: 'Admin',
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-06-01'),
    };

    it('actualiza nombre y apellido', async () => {
      prisma.superAdmin.findUnique.mockResolvedValue(existingAdmin);
      prisma.superAdmin.update.mockResolvedValue(mockUpdated);

      const result = await service.updateProfile('user-1', {
        nombre: 'Super',
        apellido: 'Admin',
      });

      expect(prisma.superAdmin.update).toHaveBeenCalledWith({
        where: { auth_user_id: 'user-1' },
        data: { nombre: 'Super', apellido: 'Admin' },
        select: {
          id: true,
          nombre: true,
          apellido: true,
          created_at: true,
          updated_at: true,
        },
      });
      expect(result.nombre).toBe('Super');
      expect(result.apellido).toBe('Admin');
    });

    it('actualiza solo un campo (parcial)', async () => {
      prisma.superAdmin.findUnique.mockResolvedValue(existingAdmin);
      prisma.superAdmin.update.mockResolvedValue({
        ...existingAdmin,
        apellido: 'Nuevo',
      });

      const result = await service.updateProfile('user-1', {
        apellido: 'Nuevo',
      });

      expect(prisma.superAdmin.update).toHaveBeenCalledWith({
        where: { auth_user_id: 'user-1' },
        data: { apellido: 'Nuevo' },
        select: {
          id: true,
          nombre: true,
          apellido: true,
          created_at: true,
          updated_at: true,
        },
      });
      expect(result.apellido).toBe('Nuevo');
    });

    it('devuelve el registro existente si el body está vacío', async () => {
      prisma.superAdmin.findUnique.mockResolvedValue(existingAdmin);

      const result = await service.updateProfile('user-1', {});

      expect(prisma.superAdmin.update).not.toHaveBeenCalled();
      expect(result).toEqual(existingAdmin);
    });

    it('lanza NotFoundException si no existe perfil', async () => {
      prisma.superAdmin.findUnique.mockResolvedValue(null);

      await expect(
        service.updateProfile('user-nonexistent', { nombre: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════
  //  GET DASHBOARD
  // ═══════════════════════════════════════════════

  describe('getDashboard', () => {
    it('devuelve dashboard con forma plana y datos mezclados', async () => {
      prisma.vendedor.count
        .mockResolvedValueOnce(10)  // totalVendedores
        .mockResolvedValueOnce(6)   // vendedoresActivos
        .mockResolvedValueOnce(3);  // vendedoresPendientes
      prisma.cliente.count.mockResolvedValue(50);
      prisma.cartera.count.mockResolvedValue(40);
      prisma.superAdmin.count.mockResolvedValue(2);

      const result = await service.getDashboard('user-1');

      expect(result).toEqual({
        totalVendedores: 10,
        vendedoresActivos: 6,
        vendedoresPendientes: 3,
        totalClientes: 50,
        clientesConVendedor: 40,
        totalSuperAdmins: 2,
      });
    });

    it('devuelve ceros cuando no hay datos (plataforma vacía)', async () => {
      prisma.vendedor.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      prisma.cliente.count.mockResolvedValue(0);
      prisma.cartera.count.mockResolvedValue(0);
      prisma.superAdmin.count.mockResolvedValue(1);

      const result = await service.getDashboard('user-2');

      expect(result).toEqual({
        totalVendedores: 0,
        vendedoresActivos: 0,
        vendedoresPendientes: 0,
        totalClientes: 0,
        clientesConVendedor: 0,
        totalSuperAdmins: 1,
      });
    });

    it('NO consulta authUser (role check eliminado — confía en guards)', async () => {
      // El mock no expone authUser — si el service intentara usarlo, TS fallaría
      prisma.vendedor.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      prisma.cliente.count.mockResolvedValue(0);
      prisma.cartera.count.mockResolvedValue(0);
      prisma.superAdmin.count.mockResolvedValue(1);

      await service.getDashboard('user-1');

      // Solo debe llamar a los 3 count() de vendedor, 1 de cliente, 1 cartera, 1 superAdmin
      expect(prisma.vendedor.count).toHaveBeenCalledTimes(3);
      expect(prisma.cliente.count).toHaveBeenCalledTimes(1);
      expect(prisma.cartera.count).toHaveBeenCalledTimes(1);
      expect(prisma.superAdmin.count).toHaveBeenCalledTimes(1);
      // NO debe llamar a findUnique de superAdmin (eso era para role check redundante)
      expect(prisma.superAdmin.findUnique).not.toHaveBeenCalled();
    });
  });
});
