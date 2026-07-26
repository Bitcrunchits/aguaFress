import { describe, it, expect, beforeEach } from 'vitest';
import {
  getToken,
  setToken,
  getRefreshToken,
  setRefreshToken,
  clearSession,
} from '../services/session';

describe('session', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe('getToken / setToken', () => {
    it('returns null when no token is stored', () => {
      expect(getToken()).toBeNull();
    });

    it('returns the stored token after setToken', () => {
      setToken('test-token-123');
      expect(getToken()).toBe('test-token-123');
    });

    it('returns null after clearing session', () => {
      setToken('test-token-123');
      clearSession();
      expect(getToken()).toBeNull();
    });

    it('overwrites previous token on second setToken', () => {
      setToken('first-token');
      setToken('second-token');
      expect(getToken()).toBe('second-token');
    });
  });

  describe('getRefreshToken / setRefreshToken', () => {
    it('returns null when no refresh token is stored', () => {
      expect(getRefreshToken()).toBeNull();
    });

    it('returns the stored refresh token after setRefreshToken', () => {
      setRefreshToken('refresh-abc');
      expect(getRefreshToken()).toBe('refresh-abc');
    });

    it('removes refresh token on clearSession', () => {
      setRefreshToken('refresh-abc');
      clearSession();
      expect(getRefreshToken()).toBeNull();
    });
  });

  describe('clearSession', () => {
    it('removes both tokens from storage', () => {
      setToken('token-1');
      setRefreshToken('refresh-1');
      clearSession();
      expect(getToken()).toBeNull();
      expect(getRefreshToken()).toBeNull();
    });
  });
});
