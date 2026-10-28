import { TestBed } from '@angular/core/testing';
import { UserRole } from '@agua/contracts';
import type { LoginResponse } from '@agua/contracts';
import { CLIENTE_TRACKING_SESSION_READER } from './cliente-tracking.contract';
import { ClienteTrackingStore } from './cliente-tracking.store';

const USER_A = 'user-a';
const USER_B = 'user-b';
const KEY_A = `aguafress.pendingTrackings.${USER_A}`;
const KEY_B = `aguafress.pendingTrackings.${USER_B}`;

const SESSION_A: LoginResponse = {
  token: 'token-a',
  refreshToken: 'refresh-token-a',
  user: { id: USER_A, email: 'user-a@example.com', role: UserRole.CLIENTE },
};

const SESSION_B: LoginResponse = {
  token: 'token-b',
  refreshToken: 'refresh-token-b',
  user: { id: USER_B, email: 'user-b@example.com', role: UserRole.CLIENTE },
};

describe('ClienteTrackingStore', () => {
  let store: ClienteTrackingStore;
  const sessionStub: { session: LoginResponse | null } = { session: SESSION_A };

  beforeEach(() => {
    window.sessionStorage.clear();
    sessionStub.session = SESSION_A;
    TestBed.configureTestingModule({
      providers: [{ provide: CLIENTE_TRACKING_SESSION_READER, useValue: sessionStub }],
    });
    store = TestBed.inject(ClienteTrackingStore);
  });

  afterEach(() => {
    window.sessionStorage.clear();
  });

  it('adds tracking ids in insertion order under the per-user key', () => {
    store.add('tracking-1');
    store.add('tracking-2');

    expect(store.list()).toEqual(['tracking-1', 'tracking-2']);
    expect(window.sessionStorage.getItem(KEY_A)).toBe('["tracking-1","tracking-2"]');
  });

  it('deduplicates tracking ids while preserving insertion order', () => {
    store.add('tracking-1');
    store.add('tracking-2');
    store.add('tracking-1');

    expect(store.list()).toEqual(['tracking-1', 'tracking-2']);
  });

  it('deduplicates ids already present in stored data', () => {
    window.sessionStorage.setItem(KEY_A, '["tracking-1","tracking-1","tracking-2"]');

    expect(store.list()).toEqual(['tracking-1', 'tracking-2']);
  });

  it('removes a tracking id without touching the rest', () => {
    store.add('tracking-1');
    store.add('tracking-2');
    store.add('tracking-3');

    store.remove('tracking-2');

    expect(store.list()).toEqual(['tracking-1', 'tracking-3']);
    expect(window.sessionStorage.getItem(KEY_A)).toBe('["tracking-1","tracking-3"]');
  });

  it('returns an empty list and no-ops without an authenticated session', () => {
    sessionStub.session = null;

    expect(store.list()).toEqual([]);
    expect(() => store.add('tracking-1')).not.toThrow();
    expect(() => store.remove('tracking-1')).not.toThrow();
    expect(window.sessionStorage.length).toBe(0);
  });

  it('ignores corrupt JSON and non-array values', () => {
    window.sessionStorage.setItem(KEY_A, '{not-json');
    expect(store.list()).toEqual([]);

    window.sessionStorage.setItem(KEY_A, '{"trackingId":"tracking-1"}');
    expect(store.list()).toEqual([]);
  });

  it('ignores arrays that contain non-string values', () => {
    window.sessionStorage.setItem(KEY_A, '["tracking-1",42]');

    expect(store.list()).toEqual([]);
  });

  it('isolates pending trackings between users', () => {
    store.add('tracking-a');

    sessionStub.session = SESSION_B;
    store.add('tracking-b');

    expect(store.list()).toEqual(['tracking-b']);
    expect(window.sessionStorage.getItem(KEY_A)).toBe('["tracking-a"]');
    expect(window.sessionStorage.getItem(KEY_B)).toBe('["tracking-b"]');

    sessionStub.session = SESSION_A;
    expect(store.list()).toEqual(['tracking-a']);
  });

  it('never throws when sessionStorage access fails', () => {
    spyOn(window.sessionStorage, 'getItem').and.throwError('storage blocked');
    spyOn(window.sessionStorage, 'setItem').and.throwError('storage blocked');
    spyOn(window.sessionStorage, 'removeItem').and.throwError('storage blocked');

    expect(() => store.add('tracking-1')).not.toThrow();
    expect(store.list()).toEqual([]);
    expect(() => store.remove('tracking-1')).not.toThrow();
  });
});
