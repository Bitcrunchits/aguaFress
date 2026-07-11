import { Test, type TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

const mockAuthService = {
  register: jest.fn(),
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
      email: 'vendedor@test.com',
      password: 'password123',
      nombre: 'Vendedor',
      apellido: 'Test',
      dni: '12345678',
      telefono: '11-5555-0199',
      ciudad: 'Capital Federal',
    };

    it('delega a AuthService.register y retorna { status, vendedorId }', async () => {
      const expected = { status: 'pendiente' as const, vendedorId: 'vendedor-1' };
      mockAuthService.register.mockResolvedValue(expected);

      const result = await controller.register(dto);

      expect(authService.register).toHaveBeenCalledWith(dto);
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

      const result = await controller.validate({ token: 'valid-token' });

      expect(authService.validate).toHaveBeenCalledWith('valid-token');
      expect(result).toEqual(expected);
    });
  });

  describe('logout', () => {
    it('delega a AuthService.logout con userId', async () => {
      const expected = { message: 'Logged out successfully' };
      mockAuthService.logout.mockResolvedValue(expected);

      const result = await controller.logout('user-1');

      expect(authService.logout).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(expected);
    });
  });
});
