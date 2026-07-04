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
      (cb: (tx: typeof mockTx) => Promise<any>) => cb(mockTx),
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

  describe('Scenario 1: Cliente full flow — register → login → refresh → get profile', () => {
    const mockClienteUser = {
      id: 'cliente-user-1',
      email: 'cliente@test.com',
      password: 'hashed-cliente-pw',
      role: 'cliente',
      is_active: true,
      is_verified: false,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const mockClienteProfile = {
      nombre: 'Ana',
      apellido: 'Lopez',
      telefono: '11-5555-0100',
      dni: '87654321',
      tipo_factura: 'B',
      direccion_calle: 'Calle Falsa',
      direccion_numero: '123',
      direccion_piso: null,
      direccion_referencia: null,
      direccion_barrio: null,
      direccion_ciudad: null,
      direccion_provincia: null,
      direccion_cp: null,
    };

    it('completa el ciclo completo: register → login → refresh → profile', async () => {
      // --- REGISTER ---
      mockPrisma.authUser.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-cliente-pw');
      mockTx.authUser.create.mockResolvedValue(mockClienteUser);
      mockTx.qrCode.findFirst.mockResolvedValue({
        codigo: 'qr-vendedor-1',
        activo: true,
        vendedor_id: 'vendedor-1',
      });
      mockTx.cliente.create.mockResolvedValue({ id: 'cliente-1' });

      const registerResult = await authService.register({
        email: 'cliente@test.com',
        password: 'SecurePass1',
        nombre: 'Ana',
        role: 'cliente' as any,
        qrToken: 'qr-vendedor-1',
      });

      expect(registerResult.user.id).toBe('cliente-user-1');
      expect(registerResult.user.email).toBe('cliente@test.com');
      expect(registerResult.token).toBeDefined();
      expect(registerResult.refreshToken).toBeDefined();

      // --- LOGIN ---
      mockPrisma.authUser.findUnique.mockResolvedValue(mockClienteUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrisma.cliente.findUnique.mockResolvedValue(mockClienteProfile);

      const loginResult = await authService.login({
        email: 'cliente@test.com',
        password: 'SecurePass1',
      });

      expect(loginResult.token).toBeDefined();
      expect(loginResult.user.nombre).toBe('Ana');
      expect(loginResult.user.email).toBe('cliente@test.com');

      // --- REFRESH ---
      const refreshResult = await authService.refresh(loginResult.refreshToken);

      expect(refreshResult.token).toBeDefined();
      expect(typeof refreshResult.token).toBe('string');
      expect(refreshResult.token.split('.')).toHaveLength(3); // valid JWT format

      // --- PROFILE ---
      mockPrisma.authUser.findUnique.mockResolvedValue({
        id: 'cliente-user-1',
        email: 'cliente@test.com',
        role: 'cliente',
        is_active: true,
        vendedor: null,
        cliente: mockClienteProfile,
      });

      const profileResult = await usersService.getProfile('cliente-user-1');

      expect(profileResult.email).toBe('cliente@test.com');
      expect(profileResult.role).toBe('cliente');
      expect(profileResult.profile).toBeDefined();
      expect(profileResult.profile!.nombre).toBe('Ana');
      expect(profileResult.profile!.direccionEntrega.calle).toBe('Calle Falsa');
    });
  });

  describe('Scenario 2: Vendedor register + login + update profile', () => {
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
      // --- REGISTER VENDEDOR ---
      mockPrisma.authUser.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-vendor-pw');
      mockTx.authUser.create.mockResolvedValue(mockVendedorUser);
      mockTx.vendedor.create.mockResolvedValue({ id: 'vendedor-1' });

      const registerResult = await authService.registerVendedor({
        email: 'vendedor@test.com',
        password: 'VendorPass1',
        nombre: 'Carlos',
        telefono: '11-5555-0200',
        ciudad: 'Capital Federal',
        zonaEntrega: 'Palermo',
      });

      expect(registerResult.status).toBe('pendiente');
      expect(registerResult.vendedorId).toBe('vendedor-1');

      // --- LOGIN ---
      mockPrisma.authUser.findUnique.mockResolvedValue(mockVendedorUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrisma.vendedor.findUnique.mockResolvedValue({
        nombre: 'Carlos',
        apellido: null,
      });

      const loginResult = await authService.login({
        email: 'vendedor@test.com',
        password: 'VendorPass1',
      });

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
            apellido: null,
            empresa: null,
            logo: null,
            estado: 'activo',
            qr_token: null,
            ciudad_default: 'Capital Federal',
            zona_entrega: 'Palermo',
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

  describe('Scenario 3: QR expirado o inválido en register', () => {
    it('rechaza register con qrToken expirado', async () => {
      mockPrisma.authUser.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-cliente-pw');
      mockTx.authUser.create.mockResolvedValue({
        id: 'cliente-user-2',
        email: 'expirado@test.com',
        password: 'hashed',
        role: 'cliente',
      } as any);
      // findFirst con expires_at: { gt: new Date() } filtra en DB — devuelve null para expirados
      mockTx.qrCode.findFirst.mockResolvedValue(null);

      await expect(
        authService.register({
          email: 'expirado@test.com',
          password: 'SecurePass1',
          nombre: 'Test',
          role: 'cliente' as any,
          qrToken: 'qr-expirado',
        }),
      ).rejects.toThrow('Invalid or expired QR token');

      expect(mockTx.qrCode.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            expires_at: { gt: expect.any(Date) },
          }),
        }),
      );
    });
  });

  describe('Scenario 4: Error cases — invalid login and unauthorised profile', () => {
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
