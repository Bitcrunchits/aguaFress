import { Test, type TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../common/prisma/prisma.service';

const mockPrisma = {
  authUser: {
    findUnique: jest.fn(),
  },
};

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-secret'),
          },
        },
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  const payload = { sub: 'user-1', email: 'test@test.com', role: 'cliente' };

  describe('validate', () => {
    it('devuelve userId+email+role cuando el usuario está activo', async () => {
      mockPrisma.authUser.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        role: 'cliente',
        is_active: true,
      });

      const result = await strategy.validate(payload);

      expect(mockPrisma.authUser.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: { id: true, email: true, role: true, is_active: true },
      });
      expect(result).toEqual({
        userId: 'user-1',
        email: 'test@test.com',
        role: 'cliente',
      });
    });

    it('lanza UnauthorizedException cuando el usuario está inactivo', async () => {
      mockPrisma.authUser.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        role: 'cliente',
        is_active: false,
      });

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(payload)).rejects.toThrow(
        'User is inactive or not found',
      );
    });

    it('lanza UnauthorizedException cuando el usuario no existe', async () => {
      mockPrisma.authUser.findUnique.mockResolvedValue(null);

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(payload)).rejects.toThrow(
        'User is inactive or not found',
      );
    });
  });
});
