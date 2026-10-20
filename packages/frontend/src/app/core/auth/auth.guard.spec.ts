import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  type ActivatedRouteSnapshot,
  Router,
  type RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { UserRole, type LoginResponse, type UserProfile } from '@agua/contracts';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { authGuard, guestGuard, roleGuard } from './auth.guard';
import { LOGIN_PATH, SESSION_STORAGE_KEY } from './auth.models';
import { AuthService } from './auth.service';
import { SessionStorageService } from './session-storage.service';

const API_V1 = 'https://api-aguafress.eadev.cloud/api/v1';
const REFRESH_URL = `${API_V1}/auth/refresh`;
const PROFILE_URL = `${API_V1}/users/profile`;

const SESSION: LoginResponse = {
  token: 'access-token-1',
  refreshToken: 'refresh-token-1',
  user: { id: 'user-1', email: 'someone@example.com', role: UserRole.VENDEDOR },
};

/** Server profile for `SESSION`: the authoritative source of role/isActive. */
const PROFILE: UserProfile = {
  id: 'user-1',
  email: 'someone@example.com',
  role: UserRole.VENDEDOR,
  isActive: true,
};

const routeSnapshot = {} as ActivatedRouteSnapshot;
const routerState = {} as RouterStateSnapshot;

function seedStoredSession(session: LoginResponse = SESSION): void {
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function readStoredSession(): LoginResponse | null {
  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  return raw === null ? null : (JSON.parse(raw) as LoginResponse);
}

/**
 * Resolves a guard result: an observable guard is subscribed synchronously,
 * so a result that is still waiting on session validation boxes as
 * `undefined` instead of a granted route.
 */
function resolveGuardResult(result: unknown): boolean | UrlTree | undefined {
  if (result instanceof Observable) {
    let value: boolean | UrlTree | undefined;
    result.subscribe((resolved) => (value = resolved));
    return value;
  }
  if (typeof result === 'boolean' || result instanceof UrlTree) {
    return result;
  }
  return undefined;
}

describe('roleGuard', () => {
  let authServiceStub: { currentSession: LoginResponse | null; sessionReady$: Observable<boolean> };

  beforeEach(() => {
    authServiceStub = { currentSession: null, sessionReady$: of(true) };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceStub },
      ],
    });
  });

  function runRoleGuard(roles: UserRole[], url: string): boolean | UrlTree | undefined {
    const state = { url } as RouterStateSnapshot;
    return TestBed.runInInjectionContext(() =>
      resolveGuardResult(roleGuard(...roles)(routeSnapshot, state)),
    );
  }

  it('sends an unauthenticated user to the login route', () => {
    const router = TestBed.inject(Router);

    const result = runRoleGuard([UserRole.SUPER_ADMIN], '/admin');

    expect(result).toEqual(router.createUrlTree([LOGIN_PATH]));
  });

  it('allows a session whose role is on the route allow-list', () => {
    authServiceStub.currentSession = {
      ...SESSION,
      user: { ...SESSION.user, role: UserRole.SUPER_ADMIN },
    };

    expect(runRoleGuard([UserRole.SUPER_ADMIN], '/admin')).toBeTrue();
  });

  it('redirects a wrong-role session to its own role home', () => {
    authServiceStub.currentSession = {
      ...SESSION,
      user: { ...SESSION.user, role: UserRole.VENDEDOR },
    };
    const router = TestBed.inject(Router);

    const result = runRoleGuard([UserRole.SUPER_ADMIN], '/admin');

    expect(result).toEqual(router.createUrlTree(['/vendedor']));
  });

  it('cancels navigation instead of looping when the role home is the current path', () => {
    authServiceStub.currentSession = {
      ...SESSION,
      user: { ...SESSION.user, role: UserRole.VENDEDOR },
    };

    expect(runRoleGuard([UserRole.SUPER_ADMIN], '/vendedor')).toBeFalse();
  });

  it('emits nothing before the server profile validation settles', () => {
    const ready$ = new BehaviorSubject(false);
    authServiceStub.currentSession = {
      ...SESSION,
      user: { ...SESSION.user, role: UserRole.SUPER_ADMIN },
    };

    authServiceStub.sessionReady$ = ready$.asObservable();

    expect(runRoleGuard([UserRole.SUPER_ADMIN], '/admin')).toBeUndefined();

    ready$.next(true);

    expect(runRoleGuard([UserRole.SUPER_ADMIN], '/admin')).toBeTrue();
  });
});

describe('roleGuard with server-validated bootstrap', () => {
  const adminState = { url: '/admin' } as RouterStateSnapshot;
  const vendorState = { url: '/vendedor' } as RouterStateSnapshot;
  let router: Router;

  beforeEach(() => {
    window.localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    window.localStorage.clear();
  });

  function runRoleGuard(
    roles: UserRole[],
    state: RouterStateSnapshot,
  ): boolean | UrlTree | undefined {
    return TestBed.runInInjectionContext(() =>
      resolveGuardResult(roleGuard(...roles)(routeSnapshot, state)),
    );
  }

  it('denies a privileged route when localStorage role alone claims access', () => {
    // Tampered storage: the stored role claims admin before bootstrap runs.
    seedStoredSession({ ...SESSION, user: { ...SESSION.user, role: UserRole.SUPER_ADMIN } });

    const auth = TestBed.inject(AuthService);
    const httpMock = TestBed.inject(HttpTestingController);
    httpMock.expectOne(REFRESH_URL).flush({ token: 'access-token-2' });
    // The server profile reports the real role, overwriting the stored one.
    httpMock.expectOne(PROFILE_URL).flush(PROFILE);

    expect(auth.currentSession?.user.role).toBe(UserRole.VENDEDOR);
    expect(readStoredSession()?.user.role).toBe(UserRole.VENDEDOR);

    expect(runRoleGuard([UserRole.SUPER_ADMIN], adminState)).toEqual(
      router.createUrlTree(['/vendedor']),
    );
    expect(runRoleGuard([UserRole.VENDEDOR], vendorState)).toBeTrue();
  });

  it('grants a privileged route only after the profile validated the role', () => {
    seedStoredSession({ ...SESSION, user: { ...SESSION.user, role: UserRole.SUPER_ADMIN } });

    const auth = TestBed.inject(AuthService);
    const httpMock = TestBed.inject(HttpTestingController);
    httpMock.expectOne(REFRESH_URL).flush({ token: 'access-token-2' });
    httpMock
      .expectOne(PROFILE_URL)
      .flush({ ...PROFILE, role: UserRole.SUPER_ADMIN, isActive: true });

    expect(auth.currentSession?.user.role).toBe(UserRole.SUPER_ADMIN);
    expect(runRoleGuard([UserRole.SUPER_ADMIN], adminState)).toBeTrue();
  });

  it('sends the user to login and clears the session when the profile is inactive', () => {
    seedStoredSession();
    TestBed.inject(AuthService);
    const httpMock = TestBed.inject(HttpTestingController);
    httpMock.expectOne(REFRESH_URL).flush({ token: 'access-token-2' });
    httpMock.expectOne(PROFILE_URL).flush({ ...PROFILE, isActive: false });

    expect(readStoredSession()).toBeNull();
    expect(runRoleGuard([UserRole.VENDEDOR], vendorState)).toEqual(
      router.createUrlTree([LOGIN_PATH]),
    );
    expect(router.navigate).toHaveBeenCalledWith([LOGIN_PATH]);
  });

  it('sends the user to login and clears the session when the profile request fails', () => {
    seedStoredSession();
    TestBed.inject(AuthService);
    const httpMock = TestBed.inject(HttpTestingController);
    httpMock.expectOne(REFRESH_URL).flush({ token: 'access-token-2' });
    httpMock
      .expectOne(PROFILE_URL)
      .flush({ statusCode: 500, message: 'Boom' }, { status: 500, statusText: 'Server Error' });

    expect(readStoredSession()).toBeNull();
    expect(runRoleGuard([UserRole.VENDEDOR], vendorState)).toEqual(
      router.createUrlTree([LOGIN_PATH]),
    );
    expect(router.navigate).toHaveBeenCalledWith([LOGIN_PATH]);
  });
});

describe('roleGuard with a cross-tab session replacement', () => {
  const adminState = { url: '/admin' } as RouterStateSnapshot;
  let router: Router;
  let httpMock: HttpTestingController;

  /** A session another tab installs, claiming a privileged role. */
  const otherTabSession: LoginResponse = {
    token: 'other-access-token',
    refreshToken: 'other-refresh-token',
    user: { id: 'user-2', email: 'customer@example.com', role: UserRole.SUPER_ADMIN },
  };

  beforeEach(() => {
    window.localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    router = TestBed.inject(Router);
    httpMock = TestBed.inject(HttpTestingController);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
  });

  afterEach(() => {
    httpMock.verify();
    window.localStorage.clear();
  });

  function installSessionFromOtherTab(session: LoginResponse): void {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: SESSION_STORAGE_KEY,
        newValue: JSON.stringify(session),
      }),
    );
  }

  function runRoleGuard(
    roles: UserRole[],
    state: RouterStateSnapshot,
  ): boolean | UrlTree | undefined {
    return TestBed.runInInjectionContext(() =>
      resolveGuardResult(roleGuard(...roles)(routeSnapshot, state)),
    );
  }

  it('does not authorize a session another tab installs until the profile revalidates it', () => {
    // No stored session at bootstrap: readiness is settled at once.
    TestBed.inject(AuthService);

    installSessionFromOtherTab(otherTabSession);

    // Revalidation is in flight: the guard must not decide yet.
    expect(runRoleGuard([UserRole.SUPER_ADMIN], adminState)).toBeUndefined();

    httpMock.expectOne(REFRESH_URL).flush({ token: 'revalidated-access-token' });
    expect(runRoleGuard([UserRole.SUPER_ADMIN], adminState)).toBeUndefined();

    // The server profile reports the real role of the signed-in user.
    httpMock.expectOne(PROFILE_URL).flush({
      id: 'user-2',
      email: 'customer@example.com',
      role: UserRole.CLIENTE,
      isActive: true,
    });

    expect(runRoleGuard([UserRole.SUPER_ADMIN], adminState)).toEqual(
      router.createUrlTree(['/cliente']),
    );
  });

  it('blocks synchronous navigation from session$ when a remote session claims an admin role', () => {
    // Start with a validated session so readiness is true before the replacement.
    seedStoredSession();
    const auth = TestBed.inject(AuthService);
    httpMock.expectOne(REFRESH_URL).flush({ token: 'access-token-2' });
    httpMock.expectOne(PROFILE_URL).flush(PROFILE);

    const decisions: Array<boolean | UrlTree | undefined> = [];
    TestBed.inject(SessionStorageService).session$.subscribe((session) => {
      if (session?.user.id === otherTabSession.user.id) {
        // A synchronous observer can initiate route activation inside next().
        decisions.push(runRoleGuard([UserRole.SUPER_ADMIN], adminState));
        decisions.push(TestBed.runInInjectionContext(() =>
          resolveGuardResult(authGuard(routeSnapshot, adminState)),
        ));
      }
    });

    installSessionFromOtherTab(otherTabSession);

    expect(auth.currentSession).toEqual(otherTabSession);
    expect(decisions).toEqual([undefined, undefined]);
    httpMock.expectOne(REFRESH_URL).flush({ token: 'revalidated-access-token' });
    httpMock.expectOne(PROFILE_URL).flush({
      id: otherTabSession.user.id,
      email: otherTabSession.user.email,
      role: UserRole.CLIENTE,
      isActive: true,
    });
    expect(runRoleGuard([UserRole.SUPER_ADMIN], adminState)).toEqual(
      router.createUrlTree(['/cliente']),
    );
  });

  it('sends the user to login when a cross-tab replacement fails revalidation', () => {
    TestBed.inject(AuthService);

    installSessionFromOtherTab(otherTabSession);

    httpMock.expectOne(REFRESH_URL).flush({ token: 'revalidated-access-token' });
    httpMock
      .expectOne(PROFILE_URL)
      .flush({ statusCode: 500, message: 'Boom' }, { status: 500, statusText: 'Server Error' });

    expect(readStoredSession()).toBeNull();
    expect(runRoleGuard([UserRole.SUPER_ADMIN], adminState)).toEqual(
      router.createUrlTree([LOGIN_PATH]),
    );
    expect(router.navigate).toHaveBeenCalledWith([LOGIN_PATH]);
  });
});

describe('authGuard', () => {
  let router: Router;

  beforeEach(() => {
    window.localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    window.localStorage.clear();
  });

  function runAuthGuard(): Observable<boolean | UrlTree> {
    return TestBed.runInInjectionContext(
      () => authGuard(routeSnapshot, routerState) as Observable<boolean | UrlTree>,
    );
  }

  /** Subscribes synchronously and boxes the (possibly still empty) emission. */
  function captureEmission(): { value: boolean | UrlTree | undefined } {
    const box: { value: boolean | UrlTree | undefined } = { value: undefined };
    runAuthGuard().subscribe((value) => (box.value = value));
    return box;
  }

  it('redirects unauthenticated users to the login route', () => {
    const box = captureEmission();

    expect(box.value).toEqual(router.createUrlTree([LOGIN_PATH]));
  });

  it('emits nothing until the refresh and the profile validation have settled', () => {
    seedStoredSession();
    const httpMock = TestBed.inject(HttpTestingController);

    const box = captureEmission();

    // The refresh is still in flight: access must not be granted yet.
    expect(box.value).toBeUndefined();

    httpMock.expectOne(REFRESH_URL).flush({ token: 'access-token-2' });

    // The server profile is still in flight: the stored role is unvalidated.
    expect(box.value).toBeUndefined();

    httpMock.expectOne(PROFILE_URL).flush(PROFILE);

    expect(box.value).toBeTrue();
  });

  it('rejects access and clears the session when the bootstrap refresh fails', () => {
    seedStoredSession();
    const httpMock = TestBed.inject(HttpTestingController);

    const box = captureEmission();

    httpMock
      .expectOne(REFRESH_URL)
      .flush(
        { statusCode: 401, message: 'Invalid refresh token' },
        { status: 401, statusText: 'Unauthorized' },
      );

    expect(box.value).toEqual(router.createUrlTree([LOGIN_PATH]));
    expect(window.localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith([LOGIN_PATH]);
  });

  it('rejects access and clears the session when the profile reports an inactive account', () => {
    seedStoredSession();
    const httpMock = TestBed.inject(HttpTestingController);

    const box = captureEmission();
    httpMock.expectOne(REFRESH_URL).flush({ token: 'access-token-2' });
    httpMock.expectOne(PROFILE_URL).flush({ ...PROFILE, isActive: false });

    expect(box.value).toEqual(router.createUrlTree([LOGIN_PATH]));
    expect(window.localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith([LOGIN_PATH]);
  });

  it('rejects access and clears the session when the profile request fails', () => {
    seedStoredSession();
    const httpMock = TestBed.inject(HttpTestingController);

    const box = captureEmission();
    httpMock.expectOne(REFRESH_URL).flush({ token: 'access-token-2' });
    httpMock
      .expectOne(PROFILE_URL)
      .flush({ statusCode: 500, message: 'Boom' }, { status: 500, statusText: 'Server Error' });

    expect(box.value).toEqual(router.createUrlTree([LOGIN_PATH]));
    expect(window.localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith([LOGIN_PATH]);
  });
});

describe('guestGuard', () => {
  const routeSnapshotForGuest = {} as ActivatedRouteSnapshot;
  let authServiceStub: { currentSession: LoginResponse | null };

  beforeEach(() => {
    authServiceStub = { currentSession: null };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceStub },
      ],
    });
  });

  it('lets unauthenticated users open the login route', () => {
    const result = TestBed.runInInjectionContext(() =>
      guestGuard(routeSnapshotForGuest, routerState),
    );

    expect(result).toBeTrue();
  });

  it('redirects authenticated users to their role home', () => {
    authServiceStub.currentSession = {
      ...SESSION,
      user: { ...SESSION.user, role: UserRole.CLIENTE },
    };
    const router = TestBed.inject(Router);

    const result = TestBed.runInInjectionContext(() =>
      guestGuard(routeSnapshotForGuest, routerState),
    );

    expect(result).toEqual(router.createUrlTree(['/cliente']));
  });
});
