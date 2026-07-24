import { UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@agua/contracts';
import { TcpPayloadAdapter } from './tcp-payload-adapter.service';
import type { TcpPayload } from './tcp-payload';

describe('TcpPayloadAdapter', () => {
  const adapter = new TcpPayloadAdapter();

  it('extracts authenticated user metadata from sub', () => {
    const payload: TcpPayload = {
      user: {
        sub: 'user-1',
        email: 'user@test.com',
        role: UserRole.CLIENTE,
      },
      requestId: 'request-1',
    };

    expect(adapter.requireUser(payload)).toEqual({
      userId: 'user-1',
      email: 'user@test.com',
      role: UserRole.CLIENTE,
    });
  });

  it('extracts authenticated user metadata from userId fallback', () => {
    const payload: TcpPayload = {
      user: {
        userId: 'user-2',
        email: 'user@test.com',
        role: UserRole.VENDEDOR,
      },
    };

    expect(adapter.userId(payload)).toBe('user-2');
  });

  it('rejects missing authenticated user metadata', () => {
    expect(() => adapter.requireUser({})).toThrow(UnauthorizedException);
  });

  it('rejects invalid authenticated user metadata', () => {
    const payload: TcpPayload = {
      user: {
        sub: 'user-1',
        email: '',
        role: UserRole.CLIENTE,
      },
    };

    expect(() => adapter.requireUser(payload)).toThrow(UnauthorizedException);
  });

  it('rejects unsupported roles', () => {
    const payload: TcpPayload = {
      user: {
        sub: 'user-1',
        email: 'user@test.com',
        role: 'admin',
      },
    };

    expect(() => adapter.requireUser(payload)).toThrow(UnauthorizedException);
  });
});
