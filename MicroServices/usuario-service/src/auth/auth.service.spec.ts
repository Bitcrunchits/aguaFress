import { Test, type TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@agua/contracts';
import { TokenService } from './token.service';
import { AuthService } from './auth.service';
import { PrismaService } from '../common/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

const mockTx = {
  authUser: { create: jest.fn() },
  cliente: { create: jest.fn() },
  vendedor: { create: jest.fn() },
  qrCode: { findFirst: jest.fn() },
};

const mockPrisma = {
  authUser: { findUnique: jest.fn() },
  cliente: { findUnique: jest.fn() },
  vendedor: { findUnique: jest.fn() },
  $transaction: jest.fn(),
};

const mockTokenService = {
  generateTokens: jest.fn(),
  generateAccessToken: jest.fn(),
  verifyToken: jest.fn(),
  verifyRefreshToken: jest.fn(),
};

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockPrisma.$transaction.mockImplementation(
      (cb: (tx: typeof mockTx) => Promise<any>) => cb(mockTx),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TokenService, useValue: mockTokenService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    const registerDto = {
      email: 'new@test.com',
      password: 'password123',
      nombre: 'Test User',
      role: UserRole.CLIENTE,
      qrToken: 'qr-abc-123',
    };

    const mockUser = {
      id: 'user-1',
      email: 'new@test.com',
      password: 'hashed-password',
      role: 'cliente',
      is_active: true,
      is_verified: false,
      created_at: new Date(),
      updated_at: new Date(),
    };

    beforeEach(() => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      mockTx.authUser.create.mockResolvedValue(mockUser);
      mockTokenService.generateTokens.mockResolvedValue({
        token: 'access-token',
        refreshToken: 'refresh-token',
      });
    });

    it('crea AuthUser + Cliente cuando role=cliente con qrToken válido', async () => {
      mockPrisma.authUser.findUnique.mockResolvedValue(null);
      mockTx.qrCode.findFirst.mockResolvedValue({
        codigo: 'qr-abc-123',
        activo: true,
        vendedor_id: 'vendedor-1',
      });
      mockTx.cliente.create.mockResolvedValue({ id: 'cliente-1' });

      const result = await authService.register(registerDto);

      expect(mockPrisma.authUser.findUnique).toHaveBeenCalledWith({
        where: { email: 'new@test.com' },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockTx.authUser.create).toHaveBeenCalledWith({
        data: {
          email: 'new@test.com',
          password: 'hashed-password',
          role: 'cliente',
        },
      });
      expect(mockTx.qrCode.findFirst).toHaveBeenCalledWith({
        where: {
          codigo: 'qr-abc-123',
          activo: true,
          expires_at: { gt: expect.any(Date) },
        },
      });
      expect(mockTx.cliente.create).toHaveBeenCalledWith({
        data: {
          auth_user_id: 'user-1',
          nombre: 'Test User',
          vendedor_id: 'vendedor-1',
        },
      });
      expect(mockTokenService.generateTokens).toHaveBeenCalledWith(
        'user-1',
        'new@test.com',
        'cliente',
      );
      expect(result).toEqual({
        user: { id: 'user-1', email: 'new@test.com', role: 'cliente' },
        token: 'access-token',
        refreshToken: 'refresh-token',
      });
    });

    it('crea AuthUser + Vendedor cuando role=vendedor (sin qrToken)', async () => {
      mockPrisma.authUser.findUnique.mockResolvedValue(null);
      mockTx.vendedor.create.mockResolvedValue({ id: 'vendedor-1' });

      const vendedorDto = { ...registerDto, role: UserRole.VENDEDOR, qrToken: undefined };
      mockTx.authUser.create.mockResolvedValue({
        ...mockUser,
        role: 'vendedor',
      });
      mockTokenService.generateTokens.mockResolvedValue({
        token: 'access-token-v',
        refreshToken: 'refresh-token-v',
      });

      const result = await authService.register(vendedorDto);

      expect(mockTx.authUser.create).toHaveBeenCalledWith({
        data: {
          email: 'new@test.com',
          password: 'hashed-password',
          role: 'vendedor',
        },
      });
      expect(mockTx.vendedor.create).toHaveBeenCalledWith({
        data: {
          auth_user_id: 'user-1',
          nombre: 'Test User',
          estado: 'pendiente',
        },
      });
      expect(result.user.role).toBe('vendedor');
    });

    it('lanza ConflictException si el email ya está registrado', async () => {
      mockPrisma.authUser.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(authService.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(authService.register(registerDto)).rejects.toThrow(
        'Email already registered',
      );
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('lanza UnauthorizedException si qrToken es inválido o inactivo', async () => {
      mockPrisma.authUser.findUnique.mockResolvedValue(null);
      mockTx.qrCode.findFirst.mockResolvedValue(null);

      await expect(authService.register(registerDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(authService.register(registerDto)).rejects.toThrow(
        'Invalid or expired QR token',
      );
    });

    it('lanza UnauthorizedException si qrToken está expirado', async () => {
      mockPrisma.authUser.findUnique.mockResolvedValue(null);
      // findFirst con expires_at: { gt: new Date() } filtra en DB,
      // por lo que devuelve null para QR expirados
      mockTx.qrCode.findFirst.mockResolvedValue(null);

      await expect(authService.register(registerDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockTx.qrCode.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            expires_at: { gt: expect.any(Date) },
          }),
        }),
      );
    });

    it('lanza ForbiddenException si se intenta registrar como super_admin', async () => {
      mockPrisma.authUser.findUnique.mockResolvedValue(null);

      const superAdminDto = { ...registerDto, role: UserRole.SUPER_ADMIN, qrToken: undefined };

      await expect(authService.register(superAdminDto)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(authService.register(superAdminDto)).rejects.toThrow(
        'Cannot register as super admin',
      );
      // mapRoleToPrisma throws inside $transaction callback, so user is never created
      expect(mockTx.authUser.create).not.toHaveBeenCalled();
      expect(mockTx.cliente.create).not.toHaveBeenCalled();
    });
  });

  describe('registerVendedor', () => {
    const vendedorDto = {
      email: 'vendedor@test.com',
      password: 'password123',
      nombre: 'Vendedor Test',
      telefono: '11-5555-0199',
      ciudad: 'Capital Federal',
      zonaEntrega: 'Villa Crespo',
    };

    const mockVendedorUser = {
      id: 'vendedor-user-1',
      email: 'vendedor@test.com',
      role: 'vendedor',
      is_active: true,
      is_verified: false,
      password: 'hashed',
      created_at: new Date(),
      updated_at: new Date(),
    };

    beforeEach(() => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      mockTx.authUser.create.mockResolvedValue(mockVendedorUser);
      mockTx.vendedor.create.mockResolvedValue({ id: 'vendedor-1' });
    });

    it('crea AuthUser + Vendedor pendiente con datos completos', async () => {
      mockPrisma.authUser.findUnique.mockResolvedValue(null);

      const result = await authService.registerVendedor(vendedorDto);

      expect(mockPrisma.authUser.findUnique).toHaveBeenCalledWith({
        where: { email: 'vendedor@test.com' },
      });
      expect(mockTx.authUser.create).toHaveBeenCalledWith({
        data: {
          email: 'vendedor@test.com',
          password: 'hashed-password',
          role: 'vendedor',
        },
      });
      expect(mockTx.vendedor.create).toHaveBeenCalledWith({
        data: {
          auth_user_id: 'vendedor-user-1',
          nombre: 'Vendedor Test',
          telefono: '11-5555-0199',
          ciudad_default: 'Capital Federal',
          zona_entrega: 'Villa Crespo',
          estado: 'pendiente',
        },
      });
      expect(result).toEqual({
        status: 'pendiente',
        vendedorId: 'vendedor-1',
      });
    });

    it('lanza ConflictException si el email ya existe', async () => {
      mockPrisma.authUser.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(authService.registerVendedor(vendedorDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'user@test.com',
      password: 'correct-password',
    };

    const mockUser = {
      id: 'user-1',
      email: 'user@test.com',
      password: 'hashed-password',
      role: 'vendedor',
      is_active: true,
      is_verified: false,
      created_at: new Date(),
      updated_at: new Date(),
    };

    beforeEach(() => {
      mockPrisma.authUser.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockTokenService.generateTokens.mockResolvedValue({
        token: 'access-token',
        refreshToken: 'refresh-token',
      });
    });

    it('devuelve tokens + datos de usuario para credenciales válidas (vendedor)', async () => {
      mockPrisma.vendedor.findUnique.mockResolvedValue({
        nombre: 'Vendedor Test',
        apellido: null,
      });

      const result = await authService.login(loginDto);

      expect(bcrypt.compare).toHaveBeenCalledWith(
        'correct-password',
        'hashed-password',
      );
      expect(mockTokenService.generateTokens).toHaveBeenCalledWith(
        'user-1',
        'user@test.com',
        'vendedor',
      );
      expect(result).toEqual({
        token: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          id: 'user-1',
          email: 'user@test.com',
          role: 'vendedor',
          nombre: 'Vendedor Test',
          apellido: undefined,
        },
      });
    });

    it('lanza UnauthorizedException si el email no existe', async () => {
      mockPrisma.authUser.findUnique.mockResolvedValue(null);

      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(authService.login(loginDto)).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('lanza UnauthorizedException si la contraseña es incorrecta', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('lanza UnauthorizedException si el usuario está inactivo', async () => {
      mockPrisma.authUser.findUnique.mockResolvedValue({
        ...mockUser,
        is_active: false,
      });

      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(authService.login(loginDto)).rejects.toThrow(
        'Account is inactive',
      );
    });
  });

  describe('refresh', () => {
    it('devuelve nuevo access token desde refresh token válido', async () => {
      mockTokenService.verifyRefreshToken.mockResolvedValue({
        sub: 'user-1',
        email: 'user@test.com',
        role: 'cliente',
      });
      mockTokenService.generateAccessToken.mockResolvedValue('new-access-token');

      const result = await authService.refresh('valid-refresh-token');

      expect(mockTokenService.verifyRefreshToken).toHaveBeenCalledWith(
        'valid-refresh-token',
      );
      expect(mockTokenService.generateAccessToken).toHaveBeenCalledWith(
        'user-1',
        'user@test.com',
        'cliente',
      );
      expect(result).toEqual({ token: 'new-access-token' });
    });
  });

  describe('validate', () => {
    it('devuelve {valid: true, user} para token válido con usuario activo', async () => {
      mockTokenService.verifyToken.mockResolvedValue({
        sub: 'user-1',
        email: 'user@test.com',
        role: 'vendedor',
      });
      mockPrisma.authUser.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@test.com',
        role: 'vendedor',
        is_active: true,
      });

      const result = await authService.validate('valid-token');

      expect(result).toEqual({
        valid: true,
        user: { id: 'user-1', email: 'user@test.com', role: 'vendedor' },
      });
    });

    it('devuelve {valid: false, user: null} para token inválido', async () => {
      mockTokenService.verifyToken.mockRejectedValue(
        new UnauthorizedException(),
      );

      const result = await authService.validate('expired-token');

      expect(result).toEqual({ valid: false, user: null });
    });

    it('devuelve {valid: false, user: null} para usuario inactivo', async () => {
      mockTokenService.verifyToken.mockResolvedValue({
        sub: 'user-1',
        email: 'user@test.com',
        role: 'vendedor',
      });
      mockPrisma.authUser.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@test.com',
        role: 'vendedor',
        is_active: false,
      });

      const result = await authService.validate('valid-token');

      expect(result).toEqual({ valid: false, user: null });
    });
  });

  describe('logout', () => {
    it('devuelve mensaje de éxito (no-op MVP)', () => {
      const result = authService.logout();
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });
});
