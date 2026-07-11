import { Test, type TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { TcpPayloadAdapter } from './tcp-payload-adapter.service';
import type { TcpPayload } from './tcp-payload';
import { UsersTcpController } from './users-tcp.controller';

type UsersServiceMock = {
  getProfile: jest.Mock;
  updateProfile: jest.Mock;
};

const mockUsersService: UsersServiceMock = {
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
};

describe('UsersTcpController', () => {
  let controller: UsersTcpController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersTcpController],
      providers: [
        TcpPayloadAdapter,
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    controller = module.get<UsersTcpController>(UsersTcpController);
  });

  it('handles users.profile with payload.user identity', async () => {
    const payload: TcpPayload = {
      body: { userId: 'ignored-body-user-id' },
      user: {
        sub: 'token-user-id',
        email: 'user@test.com',
        role: 'cliente',
      },
      requestId: 'request-1',
    };
    const expected = { id: 'token-user-id', email: 'user@test.com' };
    mockUsersService.getProfile.mockResolvedValue(expected);

    const result = await controller.profile(payload);

    expect(mockUsersService.getProfile).toHaveBeenCalledWith('token-user-id');
    expect(result).toEqual(expected);
  });

  it('rejects users.profile without payload.user', () => {
    const payload: TcpPayload = {
      requestId: 'request-1',
    };

    expect(() => controller.profile(payload)).toThrow(UnauthorizedException);
    expect(mockUsersService.getProfile).not.toHaveBeenCalled();
  });
});
