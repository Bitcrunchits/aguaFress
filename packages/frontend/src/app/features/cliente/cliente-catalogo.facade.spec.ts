import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  UserRole,
  type LoginResponse,
  type PaginatedResponse,
  type ProductResponse,
} from '@agua/contracts';
import { EMPTY, Observable, Subject, of, throwError } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { ClienteCatalogoFacade } from './cliente-catalogo.facade';
import {
  CLIENTE_CATALOGO_GATEWAY,
  ClienteCatalogoServerMessage,
} from './cliente-catalogo.gateway';
import { CLIENTE_PROVIDER_STORE } from './cliente-provider.store';

const USER_ID = 'user-1';
const PROVIDER_ID = 'vendedor-1';

const SESSION: LoginResponse = {
  token: 'token',
  refreshToken: 'refresh-token',
  user: { id: USER_ID, email: 'cliente@example.com', role: UserRole.CLIENTE },
};

const OTHER_SESSION: LoginResponse = {
  ...SESSION,
  user: { ...SESSION.user, id: 'user-2' },
};

const SAME_USER_NEW_TOKEN: LoginResponse = {
  ...SESSION,
  token: 'token-2',
};

const PRODUCT_A: ProductResponse = {
  id: 'producto-1',
  nombre: 'Agua mineral 500 ml',
  precioSinIva: 1000,
  porcentajeIva: 21,
  porcentajeImpuestos: 0,
  costoIva: 210,
  costoImpuestos: 0,
  precioFinal: 1210,
  stock: 12,
  vendedorId: PROVIDER_ID,
  activo: true,
};

const PRODUCT_B: ProductResponse = {
  ...PRODUCT_A,
  id: 'producto-2',
  nombre: 'Agua con gas 1 L',
};

const RESPONSE_A: PaginatedResponse<ProductResponse> = {
  data: [PRODUCT_A],
  pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
};

const RESPONSE_B: PaginatedResponse<ProductResponse> = {
  data: [PRODUCT_B],
  pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
};

describe('ClienteCatalogoFacade', () => {
  const catalogoStub = { list: jasmine.createSpy('list') };
  const providerStateStub = {
    read: jasmine.createSpy('read'),
    clear: jasmine.createSpy('clear'),
  };
  const authStub: {
    currentSession: LoginResponse | null;
    sessionReplacement$: Observable<void>;
  } = { currentSession: SESSION, sessionReplacement$: EMPTY };
  let sessionReplacement: Subject<void>;

  beforeEach(() => {
    sessionReplacement = new Subject<void>();
    catalogoStub.list.calls.reset();
    providerStateStub.read.calls.reset();
    providerStateStub.clear.calls.reset();
    authStub.currentSession = SESSION;
    authStub.sessionReplacement$ = sessionReplacement.asObservable();
    providerStateStub.read.and.returnValue(PROVIDER_ID);
    catalogoStub.list.and.returnValue(of(RESPONSE_A));

    TestBed.configureTestingModule({
      providers: [
        ClienteCatalogoFacade,
        { provide: CLIENTE_CATALOGO_GATEWAY, useValue: catalogoStub },
        { provide: CLIENTE_PROVIDER_STORE, useValue: providerStateStub },
        { provide: AuthService, useValue: authStub },
      ],
    });
  });

  function create(): ClienteCatalogoFacade {
    return TestBed.inject(ClienteCatalogoFacade);
  }

  it('loads the first page with the stored provider and clears loading', () => {
    const response = new Subject<PaginatedResponse<ProductResponse>>();
    catalogoStub.list.and.returnValue(response.asObservable());
    const facade = create();

    facade.load();

    expect(providerStateStub.read).toHaveBeenCalledWith(USER_ID);
    expect(catalogoStub.list).toHaveBeenCalledWith(PROVIDER_ID, 1, 20);
    expect(facade.loading()).toBeTrue();

    response.next(RESPONSE_A);
    response.complete();

    expect(facade.products()).toEqual([PRODUCT_A]);
    expect(facade.loading()).toBeFalse();
    expect(facade.failed()).toBeFalse();
    expect(facade.redirectToHome()).toBeFalse();
  });

  it('drops a response started by a previous session without leaving loading set', () => {
    const response = new Subject<PaginatedResponse<ProductResponse>>();
    catalogoStub.list.and.returnValue(response.asObservable());
    const facade = create();
    facade.load();

    authStub.currentSession = OTHER_SESSION;
    response.next(RESPONSE_A);
    response.complete();

    expect(facade.products()).toEqual([]);
    expect(facade.loading()).toBeFalse();
    expect(facade.failed()).toBeFalse();
    expect(facade.redirectToHome()).toBeFalse();
  });

  it('applies a response after a token rotation for the same user', () => {
    const response = new Subject<PaginatedResponse<ProductResponse>>();
    catalogoStub.list.and.returnValue(response.asObservable());
    const facade = create();
    facade.load();

    authStub.currentSession = SAME_USER_NEW_TOKEN;
    response.next(RESPONSE_A);
    response.complete();

    expect(facade.products()).toEqual([PRODUCT_A]);
    expect(facade.loading()).toBeFalse();
    expect(facade.failed()).toBeFalse();
    expect(facade.redirectToHome()).toBeFalse();
  });

  it('invalidates the in-flight response and reloads when the session is replaced', () => {
    const superseded = new Subject<PaginatedResponse<ProductResponse>>();
    catalogoStub.list.and.returnValues(superseded.asObservable(), of(RESPONSE_B));
    const facade = create();
    facade.load();
    expect(catalogoStub.list).toHaveBeenCalledTimes(1);

    sessionReplacement.next();

    expect(catalogoStub.list).toHaveBeenCalledTimes(2);
    expect(facade.products()).toEqual([PRODUCT_B]);

    superseded.next(RESPONSE_A);
    superseded.complete();

    expect(facade.products()).toEqual([PRODUCT_B]);
    expect(facade.loading()).toBeFalse();
  });

  it('drops a stale-provider error from a previous session without clearing or redirecting', () => {
    const response = new Subject<PaginatedResponse<ProductResponse>>();
    catalogoStub.list.and.returnValue(response.asObservable());
    const facade = create();
    facade.load();

    authStub.currentSession = OTHER_SESSION;
    response.error(new HttpErrorResponse({ status: 404 }));

    expect(providerStateStub.clear).not.toHaveBeenCalled();
    expect(facade.products()).toEqual([]);
    expect(facade.loading()).toBeFalse();
    expect(facade.failed()).toBeFalse();
    expect(facade.redirectToHome()).toBeFalse();
  });

  it('redirects home without calling the service when there is no stored provider', () => {
    providerStateStub.read.and.returnValue(null);
    const facade = create();

    facade.load();

    expect(catalogoStub.list).not.toHaveBeenCalled();
    expect(facade.redirectToHome()).toBeTrue();
    expect(facade.loading()).toBeFalse();
  });

  it('redirects home without reading storage when there is no session', () => {
    authStub.currentSession = null;
    const facade = create();

    facade.load();

    expect(providerStateStub.read).not.toHaveBeenCalled();
    expect(catalogoStub.list).not.toHaveBeenCalled();
    expect(facade.redirectToHome()).toBeTrue();
    expect(facade.loading()).toBeFalse();
  });

  it('clears the stored provider and redirects home on 404', () => {
    catalogoStub.list.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    const facade = create();

    facade.load();

    expect(providerStateStub.clear).toHaveBeenCalledWith(USER_ID);
    expect(facade.redirectToHome()).toBeTrue();
    expect(facade.failed()).toBeFalse();
    expect(facade.loading()).toBeFalse();
  });

  it('clears the stored provider and redirects home on 400 requiresSelection', () => {
    catalogoStub.list.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { message: ClienteCatalogoServerMessage.RequiresSelection },
          }),
      ),
    );
    const facade = create();

    facade.load();

    expect(providerStateStub.clear).toHaveBeenCalledWith(USER_ID);
    expect(facade.redirectToHome()).toBeTrue();
    expect(facade.failed()).toBeFalse();
    expect(facade.loading()).toBeFalse();
  });

  it('sets failed and clears loading on a generic error', () => {
    catalogoStub.list.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    const facade = create();

    facade.load();

    expect(facade.failed()).toBeTrue();
    expect(facade.redirectToHome()).toBeFalse();
    expect(facade.loading()).toBeFalse();
    expect(providerStateStub.clear).not.toHaveBeenCalled();
  });

  it('clears failed and reloads on retry', () => {
    catalogoStub.list.and.returnValues(
      throwError(() => new HttpErrorResponse({ status: 500 })),
      of(RESPONSE_A),
    );
    const facade = create();
    facade.load();
    expect(facade.failed()).toBeTrue();

    facade.retry();

    expect(facade.failed()).toBeFalse();
    expect(facade.products()).toEqual([PRODUCT_A]);
    expect(catalogoStub.list).toHaveBeenCalledTimes(2);
  });

  it('ignores an out-of-order response from a superseded request', () => {
    const superseded = new Subject<PaginatedResponse<ProductResponse>>();
    catalogoStub.list.and.returnValues(superseded.asObservable(), of(RESPONSE_B));
    const facade = create();

    facade.load();
    facade.retry();
    expect(facade.products()).toEqual([PRODUCT_B]);

    superseded.next(RESPONSE_A);
    superseded.complete();

    expect(facade.products()).toEqual([PRODUCT_B]);
    expect(facade.loading()).toBeFalse();
  });
});
