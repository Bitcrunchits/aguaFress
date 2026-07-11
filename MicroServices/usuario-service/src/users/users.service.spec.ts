import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

const mockPrisma = {
  authUser: { findUnique: jest.fn() },
  cliente: { update: jest.fn() },
  vendedor: { update: jest.fn() },
};

describe('UsersService', () => {
  let usersService: UsersService;
  let prisma: typeof mockPrisma;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogService, useValue: { record: jest.fn() } },
      ],
    }).compile();

    usersService = module.get<UsersService>(UsersService);
    prisma = mockPrisma;
  });

  describe('getProfile', () => {
    it('devuelve perfil de vendedor con datos específicos del rol', async () => {
      const mockVendedorUser = {
        id: 'user-1',
        email: 'vendor@test.com',
        role: 'vendedor',
        is_active: true,
        vendedor: {
          nombre: 'Carlos',
          apellido: 'Lopez',
          empresa: 'Agua Pureza',
          logo: 'logo.png',
          estado: 'activo',
          qr_token: 'qr-abc',
          ciudad_default: 'Capital Federal',
          zona_entrega: 'Palermo',
        },
        cliente: null,
      };

      mockPrisma.authUser.findUnique.mockResolvedValue(mockVendedorUser);

      const result = await usersService.getProfile('user-1');

      expect(mockPrisma.authUser.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: expect.any(Object),
      });
      expect(result).toEqual({
        id: 'user-1',
        email: 'vendor@test.com',
        role: 'vendedor',
        isActive: true,
        nombre: 'Carlos',
        apellido: 'Lopez',
        telefono: undefined,
        profile: {
          nombre: 'Carlos',
          apellido: 'Lopez',
          empresa: 'Agua Pureza',
          logo: 'logo.png',
          estado: 'activo',
          ciudadDefault: 'Capital Federal',
          zonaEntrega: 'Palermo',
        },
      });
    });

    it('devuelve perfil de cliente con dirección de entrega', async () => {
      const mockClienteUser = {
        id: 'user-2',
        email: 'client@test.com',
        role: 'cliente',
        is_active: true,
        vendedor: null,
        cliente: {
          nombre: 'Maria',
          apellido: 'Garcia',
          telefono: '11-5555-0100',
          dni: '12345678',
          tipo_factura: 'B',
          direccion_calle: 'Av. Siempre Viva',
          direccion_numero: '742',
          direccion_piso: '3B',
          direccion_referencia: 'Junto al kiosco',
          direccion_barrio: 'Centro',
          direccion_ciudad: 'Cordoba',
          direccion_provincia: 'Cordoba',
          direccion_cp: '5000',
        },
      };

      mockPrisma.authUser.findUnique.mockResolvedValue(mockClienteUser);

      const result = await usersService.getProfile('user-2');

      expect(result).toEqual({
        id: 'user-2',
        email: 'client@test.com',
        role: 'cliente',
        isActive: true,
        nombre: 'Maria',
        apellido: 'Garcia',
        telefono: '11-5555-0100',
        profile: {
          nombre: 'Maria',
          apellido: 'Garcia',
          telefono: '11-5555-0100',
          dni: '12345678',
          tipoFactura: 'B',
          direccionEntrega: {
            calle: 'Av. Siempre Viva',
            numero: '742',
            pisoDepto: '3B',
            referencia: 'Junto al kiosco',
            barrio: 'Centro',
            ciudad: 'Cordoba',
            provincia: 'Cordoba',
            codigoPostal: '5000',
          },
        },
      });
    });

    it('lanza NotFoundException cuando el usuario no existe', async () => {
      mockPrisma.authUser.findUnique.mockResolvedValue(null);

      await expect(usersService.getProfile('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(usersService.getProfile('nonexistent')).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('updateProfile', () => {
    const mockBaseUser = {
      id: 'user-1',
      role: 'cliente' as const,
    };

    it('actualiza campos del cliente (nombre, apellido, telefono)', async () => {
      mockPrisma.authUser.findUnique.mockResolvedValue(mockBaseUser);
      mockPrisma.cliente.update.mockResolvedValue({ id: 'cliente-1' });
      // getProfile is called internally after update
      mockPrisma.authUser.findUnique
        .mockResolvedValueOnce(mockBaseUser) // first call in updateProfile
        .mockResolvedValueOnce({              // second call in this.getProfile
          id: 'user-1',
          email: 'client@test.com',
          role: 'cliente',
          is_active: true,
          vendedor: null,
          cliente: {
            nombre: 'Maria Updated',
            apellido: 'Garcia',
            telefono: '11-5555-0199',
            dni: '12345678',
            tipo_factura: 'B',
            direccion_calle: null,
            direccion_numero: null,
            direccion_piso: null,
            direccion_referencia: null,
            direccion_barrio: null,
            direccion_ciudad: null,
            direccion_provincia: null,
            direccion_cp: null,
          },
        });

      const dto: UpdateProfileDto = {
        nombre: 'Maria Updated',
        telefono: '11-5555-0199',
      };

      const result = await usersService.updateProfile('user-1', dto);

      expect(mockPrisma.cliente.update).toHaveBeenCalledWith({
        where: { auth_user_id: 'user-1' },
        data: { nombre: 'Maria Updated', telefono: '11-5555-0199' },
      });
      expect(result).toBeDefined();
      expect(result.nombre).toBe('Maria Updated');
      expect(result.telefono).toBe('11-5555-0199');
    });

    it('actualiza dirección del cliente cuando se proveen address fields', async () => {
      const mockClienteUser = { id: 'user-2', role: 'cliente' as const };
      mockPrisma.authUser.findUnique
        .mockResolvedValueOnce(mockClienteUser)
        .mockResolvedValueOnce({
          id: 'user-2',
          email: 'client@test.com',
          role: 'cliente',
          is_active: true,
          vendedor: null,
          cliente: {
            nombre: 'Maria',
            apellido: 'Garcia',
            telefono: null,
            dni: null,
            tipo_factura: null,
            direccion_calle: 'Av. Nueva',
            direccion_numero: '123',
            direccion_piso: null,
            direccion_referencia: null,
            direccion_barrio: null,
            direccion_ciudad: null,
            direccion_provincia: null,
            direccion_cp: null,
          },
        });

      const dto: UpdateProfileDto = {
        address: {
          calle: 'Av. Nueva',
          numero: '123',
        },
      };

      await usersService.updateProfile('user-2', dto);

      expect(mockPrisma.cliente.update).toHaveBeenCalledWith({
        where: { auth_user_id: 'user-2' },
        data: {
          direccion_calle: 'Av. Nueva',
          direccion_numero: '123',
        },
      });
    });

    it('actualiza campos del vendedor (nombre, telefono)', async () => {
      const mockVendedorUser = { id: 'user-3', role: 'vendedor' as const };
      mockPrisma.authUser.findUnique
        .mockResolvedValueOnce(mockVendedorUser)
        .mockResolvedValueOnce({
          id: 'user-3',
          email: 'vendor@test.com',
          role: 'vendedor',
          is_active: true,
          vendedor: {
            nombre: 'Carlos Updated',
            apellido: null,
            empresa: null,
            logo: null,
            estado: 'activo',
            qr_token: null,
            ciudad_default: null,
            zona_entrega: null,
          },
          cliente: null,
        });

      const dto: UpdateProfileDto = {
        nombre: 'Carlos Updated',
        telefono: '11-5555-0200',
      };

      const result = await usersService.updateProfile('user-3', dto);

      expect(mockPrisma.vendedor.update).toHaveBeenCalledWith({
        where: { auth_user_id: 'user-3' },
        data: { nombre: 'Carlos Updated', telefono: '11-5555-0200' },
      });
      expect(result.nombre).toBe('Carlos Updated');
    });

    it('lanza NotFoundException cuando el usuario no existe', async () => {
      mockPrisma.authUser.findUnique.mockResolvedValue(null);

      const dto: UpdateProfileDto = { nombre: 'Test' };

      await expect(usersService.updateProfile('nonexistent', dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
