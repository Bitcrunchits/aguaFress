import { Test, type TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('Auth Integration: register → login → refresh → profile', () => {
  let authService: AuthService;
  let usersService: UsersService;

  const mockTx = {
    authUser: { create: jest.fn() },
    cliente: { create: jest.fn() },
    vendedor: { create: jest.fn() },
    qrCode: { findFirst: jest.fn() },
  };

  const mockPrisma = {
    authUser: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    cliente: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    vendedor: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeAll(async () => {
    // Real JWT tokens with fixed secret
    process.env.JWT_SECRET = 'test-secret-key-for-integration-test';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key';
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    mockPrisma.$transaction.mockImplementation(
      (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        TokenService,
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditLogService, useValue: { record: jest.fn() } },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const map: Record<string, string> = {
                'jwt.secret': 'test-secret-key-for-integration-test',
                'jwt.refreshSecret': 'test-secret-key-for-integration-test',
                'jwt.expiresIn': '1d',
                'jwt.refreshExpiresIn': '7d',
              };
              return map[key] ?? null;
            }),
          },
        },
        {
          provide: JwtService,
          useFactory: () =>
            new JwtService({
              secret: 'test-secret-key-for-integration-test',
              signOptions: { expiresIn: '1d' },
            }),
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
  });

  describe('Scenario 1: Vendedor register → login → profile update', () => {
    const mockVendedorUser = {
      id: 'vendor-user-1',
      email: 'vendedor@test.com',
      password: 'hashed-vendor-pw',
      role: 'vendedor',
      is_active: true,
      is_verified: false,
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('registra vendedor, loguea y actualiza perfil', async () => {
      // --- REGISTER ---
      mockPrisma.authUser.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-vendor-pw');
      mockTx.authUser.create.mockResolvedValue(mockVendedorUser);
      mockTx.vendedor.create.mockResolvedValue({ id: 'vendedor-1' });

      const registerResult = await authService.register({
        email: 'vendedor@test.com',
        emailConfirmation: 'vendedor@test.com',
        password: 'VendorPass1',
        nombre: 'Carlos',
        apellido: 'García',
        dni: '12345678',
        telefono: '11-5555-0200',
        ciudad: 'Capital Federal',
        empresa: 'Ruta Capital',
      });

      expect(registerResult.status).toBe('pendiente');
      expect(registerResult.vendedorId).toBe('vendedor-1');
      expect(mockTx.vendedor.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ empresa: 'Ruta Capital' }),
      });

      // --- LOGIN ---
      mockPrisma.authUser.findUnique.mockResolvedValue(mockVendedorUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrisma.vendedor.findUnique.mockResolvedValue({
        nombre: 'Carlos',
        apellido: 'García',
        estado: 'activo',
      });

      const loginResult = await authService.login({
        email: 'vendedor@test.com',
        password: 'VendorPass1',
      });

      expect(loginResult.token).toBeDefined();
      expect(loginResult.user.nombre).toBe('Carlos');

      // --- UPDATE PROFILE ---
      mockPrisma.authUser.findUnique
        .mockResolvedValueOnce({ id: 'vendor-user-1', role: 'vendedor' })
        .mockResolvedValueOnce({
          id: 'vendor-user-1',
          email: 'vendedor@test.com',
          role: 'vendedor',
          is_active: true,
          vendedor: {
            nombre: 'Carlos Updated',
            apellido: 'García',
            empresa: null,
            logo: null,
            estado: 'pendiente',
            qr_token: null,
            ciudad_default: 'Capital Federal',
            zona_entrega: null,
          },
          cliente: null,
        });

      const updateResult = await usersService.updateProfile('vendor-user-1', {
        nombre: 'Carlos Updated',
        telefono: '11-5555-0300',
      });

      expect(updateResult.nombre).toBe('Carlos Updated');
      expect(mockPrisma.vendedor.update).toHaveBeenCalledWith({
        where: { auth_user_id: 'vendor-user-1' },
        data: { nombre: 'Carlos Updated', telefono: '11-5555-0300' },
      });
    });
  });

  describe('Scenario 2: Error cases — invalid login and unauthorised profile', () => {
    it('rechaza login con credenciales inválidas', async () => {
      mockPrisma.authUser.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'noexiste@test.com',
          password: 'wrongpass',
        }),
      ).rejects.toThrow('Invalid credentials');
    });

    it('lanza NotFoundException al obtener perfil de usuario inexistente', async () => {
      mockPrisma.authUser.findUnique.mockResolvedValue(null);

      await expect(
        usersService.getProfile('nonexistent-user-id'),
      ).rejects.toThrow('User not found');
    });
  });
});
