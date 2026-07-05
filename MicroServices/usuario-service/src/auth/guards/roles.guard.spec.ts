import { type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@agua/contracts';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    guard = new RolesGuard(reflector);
  });

  const mockContext = (userRole: UserRole) =>
    ({
      getHandler: jest.fn(() => jest.fn()),
      getClass: jest.fn(() => jest.fn()),
      switchToHttp: () => ({
        getRequest: () => ({ user: { role: userRole } }),
      }),
    }) as unknown as ExecutionContext;

  it('permite acceso si no hay roles requeridos', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const result = guard.canActivate(mockContext(UserRole.CLIENTE));

    expect(result).toBe(true);
  });

  it('permite acceso si el usuario tiene el rol requerido', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.VENDEDOR]);

    const result = guard.canActivate(mockContext(UserRole.VENDEDOR));

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
      expect.any(Function),
      expect.any(Function),
    ]);
    expect(result).toBe(true);
  });

  it('deniega acceso si el usuario NO tiene el rol requerido', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.VENDEDOR]);

    const result = guard.canActivate(mockContext(UserRole.CLIENTE));

    expect(result).toBe(false);
  });

  it('permite acceso si el usuario tiene UNO de varios roles requeridos', () => {
    reflector.getAllAndOverride.mockReturnValue([
      UserRole.VENDEDOR,
      UserRole.SUPER_ADMIN,
    ]);

    const result = guard.canActivate(mockContext(UserRole.SUPER_ADMIN));

    expect(result).toBe(true);
  });

  it('deniega acceso si el usuario no coincide con NINGÚN rol requerido', () => {
    reflector.getAllAndOverride.mockReturnValue([
      UserRole.VENDEDOR,
      UserRole.SUPER_ADMIN,
    ]);

    const result = guard.canActivate(mockContext(UserRole.CLIENTE));

    expect(result).toBe(false);
  });
});
