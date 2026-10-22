import { TestBed } from '@angular/core/testing';
import { ClienteProviderStateService } from './cliente-provider-state.service';

const USER_A = 'user-a';
const USER_B = 'user-b';
const KEY_A = `aguafress.cliente.provider.${USER_A}`;
const KEY_B = `aguafress.cliente.provider.${USER_B}`;

describe('ClienteProviderStateService', () => {
  let service: ClienteProviderStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ClienteProviderStateService);
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('saves and reads the provider under the per-user key', () => {
    service.save(USER_A, 'vendedor-1');

    expect(window.localStorage.getItem(KEY_A)).toBe('vendedor-1');
    expect(service.read(USER_A)).toBe('vendedor-1');
  });

  it('isolates the stored provider between users', () => {
    service.save(USER_A, 'vendedor-1');
    service.save(USER_B, 'vendedor-2');

    expect(service.read(USER_A)).toBe('vendedor-1');
    expect(service.read(USER_B)).toBe('vendedor-2');
    expect(window.localStorage.getItem(KEY_A)).toBe('vendedor-1');
    expect(window.localStorage.getItem(KEY_B)).toBe('vendedor-2');
  });

  it('clears only the current user key', () => {
    service.save(USER_A, 'vendedor-1');
    service.save(USER_B, 'vendedor-2');

    service.clear(USER_A);

    expect(service.read(USER_A)).toBeNull();
    expect(service.read(USER_B)).toBe('vendedor-2');
  });

  it('returns null instead of throwing when localStorage read fails', () => {
    spyOn(window.localStorage, 'getItem').and.throwError('storage blocked');

    expect(service.read(USER_A)).toBeNull();
  });

  it('does not throw when localStorage writes or removals fail', () => {
    spyOn(window.localStorage, 'setItem').and.throwError('storage blocked');
    spyOn(window.localStorage, 'removeItem').and.throwError('storage blocked');

    expect(() => service.save(USER_A, 'vendedor-1')).not.toThrow();
    expect(() => service.clear(USER_A)).not.toThrow();
  });
});
