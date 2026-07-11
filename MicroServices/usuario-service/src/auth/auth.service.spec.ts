import * as crypto from 'crypto';
import { Test, type TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@agua/contracts';
import { TokenService } from './token.service';
import { AuthService } from './auth.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
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
  authUser: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
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

const mockAuditLogService = {
  record: jest.fn(),
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
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    const registerDto = {
      email: 'vendedor@test.com',
      password: 'password123',
      nombre: 'Vendedor',
      apellido: 'Test',
      dni: '12345678',
      telefono: '11-5555-0199',
      ciudad: 'Capital Federal',
    };

    const mockUser = {
      id: 'user-1',
      email: 'vendedor@test.com',
      password: 'hashed-password',
      role: 'vendedor',
      is_active: true,
      is_verified: false,
      created_at: new Date(),
      updated_at: new Date(),
    };

    beforeEach(() => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      mockTx.authUser.create.mockResolvedValue(mockUser);
      mockTx.vendedor.create.mockResolvedValue({ id: 'vendedor-1' });
    });

    it('crea AuthUser + Vendedor pendiente con datos completos', async () => {
      mockPrisma.authUser.findUnique.mockResolvedValue(null);

      const result = await authService.register(registerDto);

      expect(mockPrisma.authUser.findUnique).toHaveBeenCalledWith({
        where: { email: 'vendedor@test.com' },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockTx.authUser.create).toHaveBeenCalledWith({
        data: {
          email: 'vendedor@test.com',
          password: 'hashed-password',
          role: 'vendedor',
        },
      });
      expect(mockTx.vendedor.create).toHaveBeenCalledWith({
        data: {
          auth_user_id: 'user-1',
          nombre: 'Vendedor',
          apellido: 'Test',
          dni: '12345678',
          telefono: '11-5555-0199',
          ciudad_default: 'Capital Federal',
          estado: 'pendiente',
        },
      });
      expect(result).toEqual({
        status: 'pendiente',
        vendedorId: 'vendedor-1',
      });
    });

    it('devuelve status pendiente si el email ya existe (prevención enumeración)', async () => {
      mockPrisma.authUser.findUnique.mockResolvedValue({ id: 'existing' });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const result = await authService.register(registerDto);

      expect(result).toEqual({ status: 'pendiente', vendedorId: '' });
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
      const refreshTokenHash = crypto.createHash('sha256').update('valid-refresh-token').digest('hex');

      mockTokenService.verifyRefreshToken.mockResolvedValue({
        sub: 'user-1',
        email: 'user@test.com',
        role: 'cliente',
      });
      mockPrisma.authUser.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@test.com',
        role: 'cliente',
        refresh_token_hash: refreshTokenHash,
        is_active: true,
      });
      mockTokenService.generateTokens.mockResolvedValue({
        token: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
      mockPrisma.authUser.update.mockResolvedValue({});

      const result = await authService.refresh('valid-refresh-token');

      expect(mockTokenService.verifyRefreshToken).toHaveBeenCalledWith(
        'valid-refresh-token',
      );
      expect(result).toEqual({ token: 'new-access-token', refreshToken: 'new-refresh-token' });
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
    it('devuelve mensaje de éxito (no-op MVP)', async () => {
      const result = await authService.logout();
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });
});
