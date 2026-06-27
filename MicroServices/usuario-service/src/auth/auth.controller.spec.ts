import { Test, type TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RegisterVendedorDto } from './dto/register-vendedor.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UserRole } from '@agua/contracts';

const mockAuthService = {
  register: jest.fn(),
  registerVendedor: jest.fn(),
  login: jest.fn(),
  refresh: jest.fn(),
  validate: jest.fn(),
  logout: jest.fn(),
};

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<typeof mockAuthService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  describe('register', () => {
    const dto: RegisterDto = {
      email: 'new@test.com',
      password: 'password123',
      nombre: 'New User',
      role: UserRole.CLIENTE,
      qrToken: 'qr-abc',
    };

    it('delega a AuthService.register y retorna 201', async () => {
      const expected = {
        user: { id: 'user-1', email: 'new@test.com', role: UserRole.CLIENTE },
      };
      mockAuthService.register.mockResolvedValue(expected);

      const result = await controller.register(dto);

      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  describe('registerVendedor', () => {
    const dto: RegisterVendedorDto = {
      email: 'vendedor@test.com',
      password: 'password123',
      nombre: 'Vendedor Test',
      telefono: '11-5555-0199',
      ciudad: 'Capital Federal',
      zonaEntrega: 'Villa Crespo',
    };

    it('delega a AuthService.registerVendedor y retorna 201', async () => {
      const expected = { status: 'pendiente' as const, vendedorId: 'vendedor-1' };
      mockAuthService.registerVendedor.mockResolvedValue(expected);

      const result = await controller.registerVendedor(dto);

      expect(authService.registerVendedor).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  describe('login', () => {
    const dto: LoginDto = {
      email: 'user@test.com',
      password: 'correct-password',
    };

    it('delega a AuthService.login y retorna 200', async () => {
      const expected = {
        token: 'access-token',
        refreshToken: 'refresh-token',
        user: { id: 'user-1', email: 'user@test.com', role: 'cliente' },
      };
      mockAuthService.login.mockResolvedValue(expected);

      const result = await controller.login(dto);

      expect(authService.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  describe('refresh', () => {
    it('delega a AuthService.refresh con el refreshToken', async () => {
      const dto: RefreshTokenDto = { refreshToken: 'valid-refresh-token' };
      const expected = { token: 'new-access-token' };
      mockAuthService.refresh.mockResolvedValue(expected);

      const result = await controller.refresh(dto);

      expect(authService.refresh).toHaveBeenCalledWith('valid-refresh-token');
      expect(result).toEqual(expected);
    });
  });

  describe('validate', () => {
    it('delega a AuthService.validate con el token', async () => {
      const expected = {
        valid: true,
        user: { id: 'user-1', email: 'user@test.com', role: 'cliente' },
      };
      mockAuthService.validate.mockResolvedValue(expected);

      const result = await controller.validate('valid-token');

      expect(authService.validate).toHaveBeenCalledWith('valid-token');
      expect(result).toEqual(expected);
    });
  });

  describe('logout', () => {
    it('delega a AuthService.logout', async () => {
      const expected = { message: 'Logged out successfully' };
      mockAuthService.logout.mockReturnValue(expected);

      const result = controller.logout();

      expect(authService.logout).toHaveBeenCalled();
      expect(result).toEqual(expected);
    });
  });
});
