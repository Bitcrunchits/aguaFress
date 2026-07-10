import { Test, type TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import type { LoginDto } from '../auth/dto/login.dto';
import { UsersService } from '../users/users.service';
import { AuthTcpController } from './auth-tcp.controller';
import { TcpPayloadAdapter } from './tcp-payload-adapter.service';
import type { TcpPayload } from './tcp-payload';

type AuthServiceMock = {
  register: jest.Mock;
  registerVendedor: jest.Mock;
  login: jest.Mock;
  refresh: jest.Mock;
  validate: jest.Mock;
  logout: jest.Mock;
};

type UsersServiceMock = {
  getProfile: jest.Mock;
  updateProfile: jest.Mock;
};

const mockAuthService: AuthServiceMock = {
  register: jest.fn(),
  registerVendedor: jest.fn(),
  login: jest.fn(),
  refresh: jest.fn(),
  validate: jest.fn(),
  logout: jest.fn(),
};

const mockUsersService: UsersServiceMock = {
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
};

describe('AuthTcpController', () => {
  let controller: AuthTcpController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthTcpController],
      providers: [
        TcpPayloadAdapter,
        { provide: AuthService, useValue: mockAuthService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    controller = module.get<AuthTcpController>(AuthTcpController);
  });

  it('handles auth.login with payload.body and delegates to AuthService', async () => {
    const loginDto: LoginDto = {
      email: 'user@test.com',
      password: 'correct-password',
    };
    const payload: TcpPayload = {
      body: loginDto,
      requestId: 'request-1',
    };
    const expected = { token: 'access-token' };
    mockAuthService.login.mockResolvedValue(expected);

    const result = await controller.login(payload);

    expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
    expect(result).toEqual(expected);
  });

  it('rejects auth.login payloads with extra body fields', async () => {
    const payload: TcpPayload = {
      body: {
        email: 'user@test.com',
        password: 'correct-password',
        userId: 'body-user-id',
      },
      requestId: 'request-1',
    };

    await expect(controller.login(payload)).rejects.toBeInstanceOf(BadRequestException);
    expect(mockAuthService.login).not.toHaveBeenCalled();
  });

  it('rejects auth.me without payload.user', async () => {
    const payload: TcpPayload = {
      requestId: 'request-1',
    };

    expect(() => controller.me(payload)).toThrow(UnauthorizedException);
    expect(mockUsersService.getProfile).not.toHaveBeenCalled();
  });

  it('handles auth.me with payload.user identity', async () => {
    const payload: TcpPayload = {
      user: {
        sub: 'token-user-id',
        email: 'user@test.com',
        role: 'cliente',
      },
      requestId: 'request-1',
    };
    const expected = { id: 'token-user-id', email: 'user@test.com' };
    mockUsersService.getProfile.mockResolvedValue(expected);

    const result = await controller.me(payload);

    expect(mockUsersService.getProfile).toHaveBeenCalledWith('token-user-id');
    expect(result).toEqual(expected);
  });
});
