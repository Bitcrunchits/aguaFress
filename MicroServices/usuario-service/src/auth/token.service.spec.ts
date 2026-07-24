import { Test, type TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { TokenService } from './token.service';

describe('TokenService', () => {
  let tokenService: TokenService;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  const mockPayload = {
    sub: 'user-123',
    email: 'test@example.com',
    role: 'cliente',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    tokenService = module.get<TokenService>(TokenService);
    jwtService = module.get(JwtService) as jest.Mocked<JwtService>;
    configService = module.get(ConfigService) as jest.Mocked<ConfigService>;
  });

  describe('generateTokens', () => {
    it('devuelve token y refreshToken con signAsync para access y refresh', async () => {
      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      configService.get.mockImplementation((key: string) => {
        const map: Record<string, string> = {
          'jwt.refreshSecret': 'refresh-secret',
          'jwt.refreshExpiresIn': '7d',
        };
        return map[key] ?? null;
      });

      const result = await tokenService.generateTokens(
        mockPayload.sub,
        mockPayload.email,
        mockPayload.role,
      );

      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(jwtService.signAsync).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining(mockPayload),
      );
      expect(jwtService.signAsync).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining(mockPayload),
        {
          secret: 'refresh-secret',
          expiresIn: '7d',
        },
      );
      expect(result).toEqual({
        token: 'access-token',
        refreshToken: 'refresh-token',
      });
    });
  });

  describe('generateAccessToken', () => {
    it('devuelve un access token firmado con el payload correcto', async () => {
      jwtService.signAsync.mockResolvedValue('single-access-token');

      const result = await tokenService.generateAccessToken(
        mockPayload.sub,
        mockPayload.email,
        mockPayload.role,
      );

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining(mockPayload),
      );
      expect(result).toBe('single-access-token');
    });
  });

  describe('verifyToken', () => {
    it('devuelve el payload decodificado para un token válido', async () => {
      jwtService.verifyAsync.mockResolvedValue(mockPayload);

      const result = await tokenService.verifyToken('valid-token');

      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token');
      expect(result).toEqual(mockPayload);
    });

    it('lanza UnauthorizedException si el token es inválido o expiró', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      await expect(tokenService.verifyToken('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(tokenService.verifyToken('expired-token')).rejects.toThrow(
        'Invalid or expired token',
      );
    });
  });
});
