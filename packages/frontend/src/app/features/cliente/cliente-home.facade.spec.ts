import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  UserRole,
  type ClienteProviderResponse,
  type ClienteProvidersResponse,
  type LoginResponse,
} from '@agua/contracts';
import { Subject, of, throwError } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { SessionStorageService } from '../../core/auth/session-storage.service';
import { ClienteHomeFacade } from './cliente-home.facade';
import { ClienteProviderSelectionService } from './cliente-provider-selection.service';
import { ClienteProviderStateService } from './cliente-provider-state.service';
import { ClienteProvidersService } from './cliente-providers.service';

const USER_ID = 'user-1';
const STORAGE_KEY = `aguafress.cliente.provider.${USER_ID}`;

const SESSION: LoginResponse = {
  token: 'token',
  refreshToken: 'refresh-token',
  user: { id: USER_ID, email: 'cliente@example.com', role: UserRole.CLIENTE },
};

const OTHER_SESSION: LoginResponse = {
  ...SESSION,
  user: { ...SESSION.user, id: 'user-2' },
};

const PROVIDER_A: ClienteProviderResponse = {
  id: 'vendedor-1',
  nombre: 'Ana',
  apellido: 'Gómez',
  empresa: 'Aguas del Sur',
  isDefault: false,
};

const PROVIDER_B: ClienteProviderResponse = {
  id: 'vendedor-2',
  nombre: 'Luis',
  apellido: 'Pérez',
  empresa: 'Del Norte',
  isDefault: true,
};

function providersResponse(
  providers: ClienteProviderResponse[],
  defaultVendedorId?: string,
): ClienteProvidersResponse {
  return { providers, defaultVendedorId, requiresSelection: providers.length > 1 };
}

describe('ClienteHomeFacade', () => {
  const providersStub = { listProviders: jasmine.createSpy('listProviders') };
  const authStub: { currentSession: LoginResponse | null } = { currentSession: SESSION };
  const sessionSubject = new Subject<LoginResponse | null>();

  beforeEach(() => {
    providersStub.listProviders.calls.reset();
    authStub.currentSession = SESSION;
    window.localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        ClienteHomeFacade,
        { provide: ClienteProvidersService, useValue: providersStub },
        { provide: AuthService, useValue: authStub },
        { provide: SessionStorageService, useValue: { session$: sessionSubject.asObservable() } },
        ClienteProviderSelectionService,
        ClienteProviderStateService,
      ],
    });
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  function create(): ClienteHomeFacade {
    return TestBed.inject(ClienteHomeFacade);
  }

  it('loads providers on creation', () => {
    const subject = new Subject<ClienteProvidersResponse>();
    providersStub.listProviders.and.returnValue(subject.asObservable());

    const facade = create();
    expect(facade.loading()).toBeTrue();

    subject.next(providersResponse([PROVIDER_A]));
    subject.complete();

    expect(facade.loading()).toBeFalse();
    expect(facade.providers()).toEqual([PROVIDER_A]);
    expect(facade.selectedProvider()?.id).toBe(PROVIDER_A.id);
  });

  it('sets failed and re-requests on retry', () => {
    providersStub.listProviders.and.returnValues(
      throwError(() => new HttpErrorResponse({ status: 500 })),
      of(providersResponse([PROVIDER_A])),
    );

    const facade = create();
    expect(facade.failed()).toBeTrue();

    facade.retry();

    expect(providersStub.listProviders).toHaveBeenCalledTimes(2);
    expect(facade.failed()).toBeFalse();
    expect(facade.selectedProvider()?.id).toBe(PROVIDER_A.id);
  });

  it('auto-selects and persists a single provider', () => {
    providersStub.listProviders.and.returnValue(of(providersResponse([PROVIDER_A])));

    const facade = create();

    expect(facade.selectedProvider()?.id).toBe(PROVIDER_A.id);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(PROVIDER_A.id);
  });

  it('uses defaultVendedorId when there is no stored provider', () => {
    providersStub.listProviders.and.returnValue(
      of(providersResponse([PROVIDER_A, PROVIDER_B], PROVIDER_B.id)),
    );

    const facade = create();

    expect(facade.selectedProvider()?.id).toBe(PROVIDER_B.id);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(PROVIDER_B.id);
  });

  it('restores a stored provider that still exists', () => {
    window.localStorage.setItem(STORAGE_KEY, PROVIDER_B.id);
    providersStub.listProviders.and.returnValue(
      of(providersResponse([PROVIDER_A, PROVIDER_B])),
    );

    const facade = create();

    expect(facade.selectedProvider()?.id).toBe(PROVIDER_B.id);
  });

  it('clears a stale stored provider', () => {
    window.localStorage.setItem(STORAGE_KEY, 'vendedor-removido');
    providersStub.listProviders.and.returnValue(
      of(providersResponse([PROVIDER_A, PROVIDER_B])),
    );

    const facade = create();

    expect(facade.selectedProvider()).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('discards the previous user response when the session changes in flight', () => {
    const first = new Subject<ClienteProvidersResponse>();
    const second = new Subject<ClienteProvidersResponse>();
    providersStub.listProviders.and.returnValues(first.asObservable(), second.asObservable());

    const facade = create();
    authStub.currentSession = OTHER_SESSION;
    sessionSubject.next(OTHER_SESSION);

    first.next(providersResponse([PROVIDER_A]));
    first.complete();

    expect(facade.providers()).toEqual([]);
    expect(window.localStorage.getItem('aguafress.cliente.provider.user-2')).toBeNull();
  });

  it('loads providers when a session appears after a logout', () => {
    providersStub.listProviders.and.returnValues(
      of(providersResponse([PROVIDER_A])),
      of(providersResponse([PROVIDER_B])),
    );
    const facade = create();

    authStub.currentSession = null;
    sessionSubject.next(null);
    authStub.currentSession = OTHER_SESSION;
    sessionSubject.next(OTHER_SESSION);

    expect(facade.selectedProvider()?.id).toBe(PROVIDER_B.id);
  });

  it('ignores an older response that arrives after a newer request', () => {
    const first = new Subject<ClienteProvidersResponse>();
    const second = new Subject<ClienteProvidersResponse>();
    providersStub.listProviders.and.returnValues(first.asObservable(), second.asObservable());

    const facade = create();
    facade.load();

    second.next(providersResponse([PROVIDER_B]));
    second.complete();
    first.next(providersResponse([PROVIDER_A]));
    first.complete();

    expect(facade.selectedProvider()?.id).toBe(PROVIDER_B.id);
  });
});
