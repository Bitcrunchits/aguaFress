import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard, IS_PUBLIC_KEY } from '../src/auth/jwt-auth.guard';
import { ROLES_KEY, RolesGuard } from '../src/auth/roles.guard';

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

  interface MockRequest {
    headers: Record<string, string>;
    user?: unknown;
  }

  function createMockContext(headers: Record<string, string>): {
    ctx: ExecutionContext;
    request: MockRequest;
  } {
    const request: MockRequest = { headers };

    const ctx = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;

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
    const { ctx } = createMockContext({});

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when authorization header is malformed (no space)', () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    const { ctx } = createMockContext({ authorization: 'NotBearer' });

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when token is invalid', () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    const { ctx } = createMockContext({ authorization: 'Bearer invalid-token' });

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('sets request.user with decoded payload on valid token', () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    const mockPayload = { sub: 'user-1', email: 'test@agua.com', role: 'vendedor', jti: 'abc' };
    mockJwtService.verify.mockReturnValue(mockPayload);

    const { ctx, request } = createMockContext({ authorization: 'Bearer valid-token' });
    const result = guard.canActivate(ctx) as boolean;

    expect(result).toBe(true);
    expect(request.user).toEqual(mockPayload);
  });

  it('does not require jti in the payload', () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    const mockPayload = { sub: 'user-1', email: 'test@agua.com', role: 'cliente' };
    mockJwtService.verify.mockReturnValue(mockPayload);

    const { ctx, request } = createMockContext({ authorization: 'Bearer valid-token' });
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

  function createContextWithUser(userRole: string | undefined): ExecutionContext {
    const request: Record<string, unknown> = {};
    if (userRole !== undefined) {
      request.user = { sub: 'user-1', email: 'test@agua.com', role: userRole };
    }

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
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
});
