import { Test, type TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import type { LoginDto } from '../auth/dto/login.dto';
import { AuthTcpController } from './auth-tcp.controller';
import { TcpPayloadAdapter } from './tcp-payload-adapter.service';
import type { TcpPayload } from './tcp-payload';

type AuthServiceMock = {
  register: jest.Mock;
  login: jest.Mock;
  refresh: jest.Mock;
  validate: jest.Mock;
  logout: jest.Mock;
};

const mockAuthService: AuthServiceMock = {
  register: jest.fn(),
  login: jest.fn(),
  refresh: jest.fn(),
  validate: jest.fn(),
  logout: jest.fn(),
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

});
