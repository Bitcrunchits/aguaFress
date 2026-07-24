import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard, IS_PUBLIC_KEY } from '../src/auth/jwt-auth.guard';
import { ROLES_KEY, RolesGuard } from '../src/auth/roles.guard';

interface MockRequest {
  headers: Record<string, string>;
  params?: Record<string, string>;
  user?: unknown;
}

function createExecutionContext(request: MockRequest): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let mockJwtService: jest.Mocked<JwtService>;
  let mockReflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    mockJwtService = {
      verify: jest.fn().mockImplementation(() => {
        throw new Error('token invalid');
      }),
      sign: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    mockReflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    guard = new JwtAuthGuard(mockJwtService, mockReflector);
  });

  function createMockContext(headers: Record<string, string>, params?: Record<string, string>): {
    ctx: ExecutionContext;
    request: MockRequest;
  } {
    const request: MockRequest = { headers, params };
    const ctx = createExecutionContext(request);

    return { ctx, request };
  }

  it('allows access when route is marked as public', () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);
    const { ctx } = createMockContext({});

    const result = guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
      expect.any(Function),
      expect.any(Function),
    ]);
    expect(mockJwtService.verify).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException when no bearer token is present', () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    const { ctx } = createMockContext({}, { service: 'users', action: 'profile' });

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('allows public registry actions without decoding an optional token', () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    const { ctx, request } = createMockContext(
      { authorization: 'Bearer invalid-token' },
      { service: 'auth', action: 'login' },
    );

    expect(guard.canActivate(ctx)).toBe(true);
    expect(mockJwtService.verify).not.toHaveBeenCalled();
    expect(request.user).toBeUndefined();
  });

  it('throws UnauthorizedException when authorization header is malformed (no space)', () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    const { ctx } = createMockContext(
      { authorization: 'NotBearer' },
      { service: 'users', action: 'profile' },
    );

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when token is invalid', () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    const { ctx } = createMockContext(
      { authorization: 'Bearer invalid-token' },
      { service: 'users', action: 'profile' },
    );

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('sets request.user with decoded payload on valid token', () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    const mockPayload = { sub: 'user-1', email: 'test@agua.com', role: 'vendedor', jti: 'abc' };
    mockJwtService.verify.mockReturnValue(mockPayload);

    const { ctx, request } = createMockContext(
      { authorization: 'Bearer valid-token' },
      { service: 'users', action: 'profile' },
    );
    const result = guard.canActivate(ctx) as boolean;

    expect(result).toBe(true);
    expect(request.user).toEqual(mockPayload);
  });

  it('does not require jti in the payload', () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    const mockPayload = { sub: 'user-1', email: 'test@agua.com', role: 'cliente' };
    mockJwtService.verify.mockReturnValue(mockPayload);

    const { ctx, request } = createMockContext(
      { authorization: 'Bearer valid-token' },
      { service: 'users', action: 'profile' },
    );
    const result = guard.canActivate(ctx) as boolean;

    expect(result).toBe(true);
    expect(request.user).toEqual(mockPayload);
  });
});

describe('RolesGuard', () => {
  let mockReflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    mockReflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;
  });

  function createContextWithUser(
    userRole: string | undefined,
    params?: Record<string, string>,
  ): ExecutionContext {
    const request: MockRequest = { headers: {}, params };
    if (userRole !== undefined) {
      request.user = { sub: 'user-1', email: 'test@agua.com', role: userRole };
    }

    return createExecutionContext(request);
  }

  it('allows access when no roles are required', () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined);
    const guard = new RolesGuard(mockReflector);

    const result = guard.canActivate(createContextWithUser('vendedor'));
    expect(result).toBe(true);
  });

  it('allows access when user has the required role', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['vendedor']);
    const guard = new RolesGuard(mockReflector);

    const result = guard.canActivate(createContextWithUser('vendedor'));
    expect(result).toBe(true);
  });

  it('throws ForbiddenException when user does not have the required role', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['super_admin']);
    const guard = new RolesGuard(mockReflector);

    expect(() => guard.canActivate(createContextWithUser('vendedor'))).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when user has no role on object', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['vendedor']);
    const guard = new RolesGuard(mockReflector);

    expect(() => guard.canActivate(createContextWithUser(undefined))).toThrow(ForbiddenException);
  });

  it('uses registry roles when no static roles metadata exists', () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined);
    const guard = new RolesGuard(mockReflector);
    const context = createContextWithUser('super_admin', { service: 'vendedores', action: 'list' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects registry role mismatches before dispatch', () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined);
    const guard = new RolesGuard(mockReflector);
    const context = createContextWithUser('vendedor', { service: 'vendedores', action: 'list' });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('allows SUPER_ADMIN activity-logs reads from registry roles', () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined);
    const guard = new RolesGuard(mockReflector);
    const context = createContextWithUser('super_admin', { service: 'activity-logs', action: 'list' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects non-admin activity-logs reads before dispatch', () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined);
    const guard = new RolesGuard(mockReflector);
    const context = createContextWithUser('vendedor', { service: 'activity-logs', action: 'get-by-id' });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
