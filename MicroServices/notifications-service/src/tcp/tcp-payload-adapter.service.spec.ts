import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ActivityLogResult, UserRole } from '@agua/contracts';
import { TcpPayloadAdapter } from './tcp-payload-adapter.service';
import type { TcpPayload } from './tcp-payload';

describe('TcpPayloadAdapter', () => {
  const adapter = new TcpPayloadAdapter();

  it('requires a SUPER_ADMIN authenticated payload before activity-log reads', () => {
    const payload = authenticatedPayload({ role: UserRole.SUPER_ADMIN });

    expect(adapter.requireRole(payload, UserRole.SUPER_ADMIN)).toEqual({
      userId: 'admin-1',
      email: 'admin@aguafress.test',
      role: UserRole.SUPER_ADMIN,
    });
  });

  it('rejects missing users and non SUPER_ADMIN roles at the TCP boundary', () => {
    expect(() => adapter.requireRole({}, UserRole.SUPER_ADMIN)).toThrow(UnauthorizedException);
    expect(() => adapter.requireRole(authenticatedPayload({ role: UserRole.CLIENTE }), UserRole.SUPER_ADMIN)).toThrow(ForbiddenException);
  });

  it('rejects malformed root payloads with controlled exceptions', () => {
    expect(() => adapter.requireRole(null, UserRole.SUPER_ADMIN)).toThrow(BadRequestException);
    expect(() => adapter.requireRole('payload', UserRole.SUPER_ADMIN)).toThrow(BadRequestException);
    expect(() => adapter.requireRole([], UserRole.SUPER_ADMIN)).toThrow(BadRequestException);
    expect(() => adapter.requireRole({}, UserRole.SUPER_ADMIN)).toThrow(UnauthorizedException);
  });

  it('maps list query strings into a typed request with pagination numbers', () => {
    const payload: TcpPayload = {
      query: {
        source: 'gateway',
        action: 'LOGIN',
        actor: 'admin@aguafress.test',
        result: ActivityLogResult.FAILURE,
        from: '2026-07-01T00:00:00.000Z',
        to: '2026-07-31T23:59:59.999Z',
        page: '2',
        limit: '25',
      },
    };

    expect(adapter.listRequest(payload)).toEqual({
      source: 'gateway',
      action: 'LOGIN',
      actor: 'admin@aguafress.test',
      result: ActivityLogResult.FAILURE,
      from: '2026-07-01T00:00:00.000Z',
      to: '2026-07-31T23:59:59.999Z',
      page: 2,
      limit: 25,
    });
  });

  it('reads get-by-id from params or query without trusting body userId', () => {
    expect(adapter.getByIdRequest({ params: { id: 'log-1' }, body: { userId: 'attacker' } })).toEqual({ id: 'log-1' });
    expect(adapter.getByIdRequest({ query: { id: 'log-2' } })).toEqual({ id: 'log-2' });
  });

  it('rejects malformed non-string query and id values with controlled bad requests', () => {
    expect(() => adapter.listRequest({ query: { source: 123 } })).toThrow(BadRequestException);
    expect(() => adapter.listRequest({ query: { page: 2 } })).toThrow(BadRequestException);
    expect(() => adapter.getByIdRequest({ params: { id: 123 } })).toThrow(BadRequestException);
    expect(() => adapter.getByIdRequest({ query: { id: 123 } })).toThrow(BadRequestException);
  });
});

function authenticatedPayload(user: { readonly role: UserRole }): TcpPayload {
  return {
    user: {
      sub: 'admin-1',
      email: 'admin@aguafress.test',
      role: user.role,
    },
  };
}
