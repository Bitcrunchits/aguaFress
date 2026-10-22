import { TestBed } from '@angular/core/testing';
import type {
  ClienteProviderResponse,
  ClienteProvidersResponse,
} from '@agua/contracts';
import { ClienteProviderSelectionService } from './cliente-provider-selection.service';
import { ClienteProviderStateService } from './cliente-provider-state.service';

const USER_ID = 'user-a';
const STORAGE_KEY = `aguafress.cliente.provider.${USER_ID}`;

function provider(id: string): ClienteProviderResponse {
  return { id, nombre: id, isDefault: false };
}

function providersResponse(
  providers: ClienteProviderResponse[],
  defaultVendedorId?: string,
): ClienteProvidersResponse {
  return {
    providers,
    defaultVendedorId,
    requiresSelection: providers.length > 1,
  };
}

describe('ClienteProviderSelectionService', () => {
  let service: ClienteProviderSelectionService;
  let state: ClienteProviderStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ClienteProviderSelectionService);
    state = TestBed.inject(ClienteProviderStateService);
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('resolves a stored provider that still exists in the list', () => {
    state.save(USER_ID, 'vendedor-2');
    const response = providersResponse([provider('vendedor-1'), provider('vendedor-2')]);

    expect(service.resolve(USER_ID, response)?.id).toBe('vendedor-2');
  });

  it('falls back to defaultVendedorId and persists it', () => {
    const response = providersResponse(
      [provider('vendedor-1'), provider('vendedor-2')],
      'vendedor-2',
    );

    expect(service.resolve(USER_ID, response)?.id).toBe('vendedor-2');
    expect(state.read(USER_ID)).toBe('vendedor-2');
  });

  it('auto-selects and persists a single provider', () => {
    const response = providersResponse([provider('vendedor-1')]);

    expect(service.resolve(USER_ID, response)?.id).toBe('vendedor-1');
    expect(state.read(USER_ID)).toBe('vendedor-1');
  });

  it('returns null when several providers exist and none is stored or default', () => {
    const response = providersResponse([provider('vendedor-1'), provider('vendedor-2')]);

    expect(service.resolve(USER_ID, response)).toBeNull();
    expect(state.read(USER_ID)).toBeNull();
  });

  it('clears a stored provider that is no longer in the list', () => {
    state.save(USER_ID, 'vendedor-removido');
    const response = providersResponse([provider('vendedor-1'), provider('vendedor-2')]);

    expect(service.resolve(USER_ID, response)).toBeNull();
    expect(state.read(USER_ID)).toBeNull();
  });

  it('does not persist when there is no authenticated user', () => {
    const response = providersResponse([provider('vendedor-1')]);

    expect(service.resolve(null, response)?.id).toBe('vendedor-1');
    expect(window.localStorage.length).toBe(0);
  });

  it('keeps the stored id untouched when it is still valid', () => {
    state.save(USER_ID, 'vendedor-1');
    const response = providersResponse([provider('vendedor-1'), provider('vendedor-2')]);

    service.resolve(USER_ID, response);

    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('vendedor-1');
  });
});
