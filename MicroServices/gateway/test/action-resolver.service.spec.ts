import { BadRequestException } from '@nestjs/common';
import { ActionResolverService, ActionNotFoundError } from '../src/actions/action-resolver.service';

describe('ActionResolverService', () => {
  let resolver: ActionResolverService;

  beforeEach(() => {
    resolver = new ActionResolverService();
  });

  describe('parseActionPath', () => {
    it('returns the action as-is for a known single-segment action', () => {
      const result = resolver.parseActionPath('auth', 'login');

      expect(result.action).toBe('login');
      expect(result.params).toEqual({
        service: 'auth',
        action: 'login',
      });
    });

    it('returns the action as-is for a known multi-segment action (e.g. "profile/update")', () => {
      const result = resolver.parseActionPath('users', 'profile/update');

      expect(result.action).toBe('profile/update');
      expect(result.params).toEqual({
        service: 'users',
        action: 'profile/update',
      });
      expect(result.params.id).toBeUndefined();
    });

    it('extracts UUID id from path when last segment is not a known action', () => {
      const uuid = '1b9729a0-213a-4e05-ab89-09d15d8a7720';
      const result = resolver.parseActionPath('vendedores', `change-estado/${uuid}`);

      expect(result.action).toBe('change-estado');
      expect(result.params).toEqual({
        service: 'vendedores',
        action: 'change-estado',
        id: uuid,
      });
    });

    it('extracts id for super-admin actions with UUID', () => {
      const uuid = 'e7a21fdb-b3cc-4a1a-8319-1e5aa2fc7cbb';
      const result = resolver.parseActionPath('super-admin', `profile/${uuid}`);

      expect(result.action).toBe('profile');
      expect(result.params).toEqual({
        service: 'super-admin',
        action: 'profile',
        id: uuid,
      });
    });

    it('extracts id for clientes own/* actions', () => {
      const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const result = resolver.parseActionPath('clientes', `own/update/${uuid}`);

      expect(result.action).toBe('own/update');
      expect(result.params).toEqual({
        service: 'clientes',
        action: 'own/update',
        id: uuid,
      });
    });

    it('passes through unknown actions without throwing', () => {
      // The resolver doesn't throw for unknown actions — resolve() does
      const result = resolver.parseActionPath('auth', 'unknown-action');

      expect(result.action).toBe('unknown-action');
      expect(result.params).toEqual({
        service: 'auth',
        action: 'unknown-action',
      });
    });

    it('passes through single unknown segment without id extraction', () => {
      const result = resolver.parseActionPath('auth', 'nonsense');

      expect(result.action).toBe('nonsense');
      expect(result.params).toEqual({
        service: 'auth',
        action: 'nonsense',
      });
    });

    it('throws BadRequestException when id segment is not a valid UUID', () => {
      expect(() => {
        resolver.parseActionPath('vendedores', 'change-estado/not-a-uuid');
      }).toThrow(BadRequestException);

      expect(() => {
        resolver.parseActionPath('vendedores', 'change-estado/12345');
      }).toThrow(BadRequestException);
    });

    it('returns path as-is for trailing slash with empty id (falls through to resolve)', () => {
      const result = resolver.parseActionPath('vendedores', 'change-estado/');

      expect(result.action).toBe('change-estado/');
      expect(result.params.id).toBeUndefined();
    });

    it('returns the full path as action for an unknown service', () => {
      const result = resolver.parseActionPath('nonexistent', 'some-action');

      expect(result.action).toBe('some-action');
      expect(result.params).toEqual({
        service: 'nonexistent',
        action: 'some-action',
      });
    });

    it('returns the full path as action for an unknown service with sub-path', () => {
      const result = resolver.parseActionPath('nonexistent', 'some-action/with-id');

      expect(result.action).toBe('some-action/with-id');
      expect(result.params).toEqual({
        service: 'nonexistent',
        action: 'some-action/with-id',
      });
    });

    it('returns full path when action part is unknown even with a slash', () => {
      const uuid = '1b9729a0-213a-4e05-ab89-09d15d8a7720';
      const result = resolver.parseActionPath('vendedores', `nonexistent-action/${uuid}`);

      expect(result.action).toBe(`nonexistent-action/${uuid}`);
      expect(result.params).toEqual({
        service: 'vendedores',
        action: `nonexistent-action/${uuid}`,
      });
    });

    it('throws BadRequestException for invalid UUID in get-by-id style paths', () => {
      expect(() => {
        resolver.parseActionPath('vendedores', 'get-by-id/invalid-uuid');
      }).toThrow(BadRequestException);
    });

    it('accepts valid UUID in get-by-id path', () => {
      const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const result = resolver.parseActionPath('vendedores', `get-by-id/${uuid}`);

      expect(result.action).toBe('get-by-id');
      expect(result.params.id).toBe(uuid);
    });
  });

  describe('resolve', () => {
    it('resolves a known action mapping', () => {
      const mapping = resolver.resolve('auth', 'login');

      expect(mapping.tcpPattern).toBe('auth.login');
      expect(mapping.transport).toBe('send');
      expect(mapping.authRequired).toBe(false);
    });

    it('throws ActionNotFoundError for an unknown action', () => {
      expect(() => resolver.resolve('auth', 'nonexistent')).toThrow(ActionNotFoundError);
    });

    it('throws ActionNotFoundError for an unknown service', () => {
      expect(() => resolver.resolve('void', 'anything')).toThrow(ActionNotFoundError);
    });
  });
});
