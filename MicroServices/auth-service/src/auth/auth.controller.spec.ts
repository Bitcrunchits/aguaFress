import { Test, TestingModule } from '@nestjs/testing';
import { ClientProxy } from '@nestjs/microservices';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserRole } from '@agua/contracts';
import type { RegisterResponse } from '@agua/contracts';
import { PrismaService } from '../common/prisma/prisma.service';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockUserClient: Partial<ClientProxy> = {
    send: jest.fn().mockReturnValue({ pipe: jest.fn().mockReturnValue({ toPromise: jest.fn() }) }),
    connect: jest.fn(),
    close: jest.fn(),
  };

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        { provide: 'USER_SERVICE', useValue: mockUserClient },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  describe('message patterns', () => {
    it('auth.register delegates to AuthService.register', async () => {
      const dto = {
        email: 'test@test.com',
        password: '123456',
        nombre: 'Test User',
        role: UserRole.CLIENTE as UserRole.VENDEDOR | UserRole.CLIENTE,
      };
      const expected: RegisterResponse = {
        user: { id: 'uuid', email: dto.email, role: dto.role },
      };
      jest.spyOn(service, 'register').mockResolvedValue(expected);

      const result = await controller.register(dto);

      expect(service.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });

    it('auth.login delegates to AuthService.login', async () => {
      const dto = { email: 'test@test.com', password: '123456' };
      jest.spyOn(service, 'login').mockResolvedValue({ message: 'ok' });

      const result = await controller.login(dto);

      expect(service.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ message: 'ok' });
    });

    it('auth.refresh delegates to AuthService.refresh', async () => {
      const dto = { refreshToken: 'token' };
      jest.spyOn(service, 'refresh').mockResolvedValue({ message: 'ok' });

      const result = await controller.refresh(dto);

      expect(service.refresh).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ message: 'ok' });
    });

    it('auth.logout delegates to AuthService.logout', async () => {
      const dto = { userId: 'uuid' };
      jest.spyOn(service, 'logout').mockResolvedValue({ message: 'ok' });

      const result = await controller.logout(dto);

      expect(service.logout).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ message: 'ok' });
    });
  });
});
