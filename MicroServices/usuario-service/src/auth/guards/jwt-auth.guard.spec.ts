import { type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    guard = new JwtAuthGuard(reflector);
  });

  const mockContext = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: jest.fn(() => ({
      getRequest: jest.fn(() => ({})),
      getResponse: jest.fn(() => ({})),
      getNext: jest.fn(() => jest.fn()),
    })),
  } as unknown as ExecutionContext;

  it('retorna true si @Public() está presente (sin llamar passport)', () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    const result = guard.canActivate(mockContext);

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
      mockContext.getHandler(),
      mockContext.getClass(),
    ]);
    expect(result).toBe(true);
  });

  it('retorna Promise cuando NO hay @Public() (passport intenta autenticar)', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);

    const result = guard.canActivate(mockContext);

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
      mockContext.getHandler(),
      mockContext.getClass(),
    ]);
    expect(result).toBeInstanceOf(Promise);

    // Atrapamos la rejection esperada (no hay strategy registrada en este test)
    await expect(result).rejects.toThrow('Unknown authentication strategy');
  });

  it('pasa handler y class como targets al reflector', () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    guard.canActivate(mockContext);

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      IS_PUBLIC_KEY,
      [mockContext.getHandler(), mockContext.getClass()],
    );
  });
});
