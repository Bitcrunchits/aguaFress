import { type ExecutionContext } from '@nestjs/common';
import { VendedorGuard } from './vendedor.guard';

describe('VendedorGuard', () => {
  let guard: VendedorGuard;

  beforeEach(() => {
    guard = new VendedorGuard();
  });

  const mockContext = (user?: { userId: string; role: string } | null) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  it('permite acceso si usuario autenticado y rol es VENDEDOR', () => {
    const result = guard.canActivate(
      mockContext({ userId: 'u1', role: 'vendedor' }),
    );
    expect(result).toBe(true);
  });

  it('deniega acceso si no hay usuario en request (no autenticado)', () => {
    const result = guard.canActivate(mockContext(undefined));
    expect(result).toBe(false);
  });

  it('deniega acceso si el rol es CLIENTE', () => {
    const result = guard.canActivate(
      mockContext({ userId: 'u2', role: 'cliente' }),
    );
    expect(result).toBe(false);
  });

  it('deniega acceso si el rol es SUPER_ADMIN', () => {
    const result = guard.canActivate(
      mockContext({ userId: 'u3', role: 'super_admin' }),
    );
    expect(result).toBe(false);
  });

  it('deniega acceso si user es null', () => {
    const result = guard.canActivate(mockContext(null));
    expect(result).toBe(false);
  });
});
