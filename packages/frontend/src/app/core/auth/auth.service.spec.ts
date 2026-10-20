import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { UserRole, type LoginResponse, type UserProfile } from '@agua/contracts';
import { LOGIN_PATH, SESSION_STORAGE_KEY } from './auth.models';
import { AuthError, AuthService } from './auth.service';
import { SessionStorageService } from './session-storage.service';

const API_V1 = 'https://api-aguafress.eadev.cloud/api/v1';
const LOGIN_URL = `${API_V1}/auth/login`;
const REFRESH_URL = `${API_V1}/auth/refresh`;
const LOGOUT_URL = `${API_V1}/auth/logout`;
const PROFILE_URL = `${API_V1}/users/profile`;

const SESSION: LoginResponse = {
  token: 'access-token-1',
  refreshToken: 'refresh-token-1',
  user: { id: 'user-1', email: 'vendor@example.com', role: UserRole.VENDEDOR },
};

/** Server profile matching SESSION: the authoritative role/isActive source. */
const PROFILE: UserProfile = {
  id: 'user-1',
  email: 'vendor@example.com',
  role: UserRole.VENDEDOR,
  isActive: true,
};

/** A session another tab writes while this tab's refresh is in flight. */
const OTHER_TAB_SESSION: LoginResponse = {
  token: 'other-access-token',
  refreshToken: 'other-refresh-token',
  user: { id: 'user-2', email: 'customer@example.com', role: UserRole.CLIENTE },
};

/** Server profile matching OTHER_TAB_SESSION. */
const OTHER_TAB_PROFILE: UserProfile = {
  id: 'user-2',
  email: 'customer@example.com',
  role: UserRole.CLIENTE,
  isActive: true,
};

/** A session installed by a same-tab login while bootstrap is in flight. */
const NEWER_LOGIN_SESSION: LoginResponse = {
  token: 'newer-access-token',
  refreshToken: 'newer-refresh-token',
  user: { id: 'user-3', email: 'newer@example.com', role: UserRole.CLIENTE },
};

function readStoredSession(): LoginResponse | null {
  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (raw === null) {
    return null;
  }
  return JSON.parse(raw) as LoginResponse;
}

function seedStoredSession(session: LoginResponse = SESSION): void {
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

/** Simulates another tab replacing the stored session mid-flight. */
function replaceStoredSessionFromOtherTab(session: LoginResponse): void {
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  window.dispatchEvent(
    new StorageEvent('storage', {
      key: SESSION_STORAGE_KEY,
      newValue: JSON.stringify(session),
    }),
  );
}

/** Collects every `sessionReady$` emission so tests can assert readiness flips. */
function captureReadiness(auth: AuthService): boolean[] {
  const readiness: boolean[] = [];
  auth.sessionReady$.subscribe((ready) => readiness.push(ready));
  return readiness;
}

describe('AuthService', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    window.localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
  });

  afterEach(() => {
    httpMock.verify();
    window.localStorage.clear();
  });

  it('logs in, persists the session under the shared key, and exposes it', () => {
    const auth = TestBed.inject(AuthService);
    let result: LoginResponse | undefined;

    auth.login({ email: 'vendor@example.com', password: 'secret' }).subscribe({
      next: (session) => (result = session),
    });

    const request = httpMock.expectOne(LOGIN_URL);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'vendor@example.com', password: 'secret' });
    request.flush(SESSION);

    expect(result).toEqual(SESSION);
    expect(readStoredSession()).toEqual(SESSION);
    expect(auth.currentSession).toEqual(SESSION);
  });

  it('maps a 401 to an invalid-credentials error and stores no session', () => {
    const auth = TestBed.inject(AuthService);
    let caught: unknown;

    auth.login({ email: 'vendor@example.com', password: 'wrong' }).subscribe({
      error: (error: unknown) => (caught = error),
    });

    httpMock
      .expectOne(LOGIN_URL)
      .flush(
        { statusCode: 401, message: 'Invalid credentials' },
        { status: 401, statusText: 'Unauthorized' },
      );

    expect(caught instanceof AuthError).toBeTrue();
    expect((caught as AuthError).code).toBe('invalid-credentials');
    expect(readStoredSession()).toBeNull();
    expect(auth.currentSession).toBeNull();
  });

  it('maps a rejected inactive vendor to a dedicated login error', () => {
    const auth = TestBed.inject(AuthService);
    let caught: unknown;

    auth.login({ email: 'vendor@example.com', password: 'secret' }).subscribe({
      error: (error: unknown) => (caught = error),
    });

    httpMock
      .expectOne(LOGIN_URL)
      .flush(
        { statusCode: 401, message: 'Vendor account is not active' },
        { status: 401, statusText: 'Unauthorized' },
      );

    expect(caught instanceof AuthError).toBeTrue();
    expect((caught as AuthError).code).toBe('inactive-account');
    expect(readStoredSession()).toBeNull();
  });

  it('restores the stored session on bootstrap and refreshes the token', () => {
    seedStoredSession();
    const auth = TestBed.inject(AuthService);

    expect(auth.currentSession).toEqual(SESSION);

    const refreshRequest = httpMock.expectOne(REFRESH_URL);
    expect(refreshRequest.request.method).toBe('POST');
    expect(refreshRequest.request.body).toEqual({ refreshToken: 'refresh-token-1' });
    refreshRequest.flush({ token: 'access-token-2' });

    const profileRequest = httpMock.expectOne(PROFILE_URL);
    expect(profileRequest.request.method).toBe('GET');
    profileRequest.flush(PROFILE);

    expect(auth.currentSession?.token).toBe('access-token-2');
    expect(readStoredSession()?.token).toBe('access-token-2');
    expect(readStoredSession()?.refreshToken).toBe('refresh-token-1');
  });

  it('clears the restored session and redirects when the bootstrap refresh fails', () => {
    seedStoredSession();
    TestBed.inject(AuthService);

    httpMock
      .expectOne(REFRESH_URL)
      .flush(
        { statusCode: 401, message: 'Invalid refresh token' },
        { status: 401, statusText: 'Unauthorized' },
      );

    expect(readStoredSession()).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('supersedes the in-flight bootstrap restore with a revalidation of the cross-tab session', () => {
    seedStoredSession();
    const auth = TestBed.inject(AuthService);

    // Another tab replaces the session while the bootstrap refresh is in flight.
    replaceStoredSessionFromOtherTab(OTHER_TAB_SESSION);

    // The superseded refresh is cancelled; the replacement is revalidated instead.
    const [superseded, revalidation] = httpMock.match(REFRESH_URL);
    expect(superseded.cancelled).toBeTrue();
    revalidation.flush({ token: 'revalidated-access-token' });

    httpMock.expectOne(PROFILE_URL).flush(OTHER_TAB_PROFILE);

    const revalidated = { ...OTHER_TAB_SESSION, token: 'revalidated-access-token' };
    expect(auth.currentSession).toEqual(revalidated);
    expect(readStoredSession()).toEqual(revalidated);
  });

  it('does not clear a newer session when a stale refresh fails', () => {
    seedStoredSession();
    const auth = TestBed.inject(AuthService);

    // A same-tab login installs a newer session while the bootstrap
    // refresh started for the stored one is still in flight.
    auth.login({ email: 'newer@example.com', password: 'secret' }).subscribe();
    httpMock.expectOne(LOGIN_URL).flush(NEWER_LOGIN_SESSION);

    httpMock
      .expectOne(REFRESH_URL)
      .flush(
        { statusCode: 401, message: 'Invalid refresh token' },
        { status: 401, statusText: 'Unauthorized' },
      );

    httpMock.expectNone(PROFILE_URL);
    expect(auth.currentSession).toEqual(NEWER_LOGIN_SESSION);
    expect(readStoredSession()).toEqual(NEWER_LOGIN_SESSION);
    expect(router.navigate).not.toHaveBeenCalledWith(['/auth/login']);
  });

  it('keeps the newer login when a superseded refresh succeeds and the profile revalidation fails', () => {
    seedStoredSession();
    const auth = TestBed.inject(AuthService);

    // A same-tab login installs a newer session while the bootstrap
    // refresh started for the stored one is still in flight.
    auth.login({ email: 'newer@example.com', password: 'secret' }).subscribe();
    httpMock.expectOne(LOGIN_URL).flush(NEWER_LOGIN_SESSION);

    // The superseded refresh succeeds: its token must not be applied to
    // the newer session, and the stale chain must not adopt it either.
    httpMock.expectOne(REFRESH_URL).flush({ token: 'stale-access-token' });

    // The stale refresh must not advance into a profile check: if one
    // were issued it fails below, and a failing profile of the obsolete
    // chain must never clear the session the newer login installed.
    const staleProfileCalls = httpMock.match(PROFILE_URL);
    for (const profileCall of staleProfileCalls) {
      profileCall.flush(
        { statusCode: 500, message: 'Boom' },
        { status: 500, statusText: 'Server Error' },
      );
    }

    expect(auth.currentSession).toEqual(NEWER_LOGIN_SESSION);
    expect(readStoredSession()?.token).toBe('newer-access-token');
    expect(router.navigate).not.toHaveBeenCalledWith(['/auth/login']);
  });

  it('resolves null when a newer session replaces the one a refresh started with', () => {
    seedStoredSession();
    const auth = TestBed.inject(AuthService);
    httpMock.expectOne(REFRESH_URL).flush({ token: 'access-token-2' });
    httpMock.expectOne(PROFILE_URL).flush(PROFILE);

    let result: LoginResponse | null | undefined;
    auth.refreshSession().subscribe((session) => (result = session));

    // A same-tab login replaces the session while the refresh is in flight.
    auth.login({ email: 'newer@example.com', password: 'secret' }).subscribe();
    httpMock.expectOne(LOGIN_URL).flush(NEWER_LOGIN_SESSION);
    httpMock.expectOne(REFRESH_URL).flush({ token: 'stale-access-token' });

    expect(result).toBeNull();
    expect(auth.currentSession).toEqual(NEWER_LOGIN_SESSION);
    expect(readStoredSession()?.token).toBe('newer-access-token');
    expect(router.navigate).not.toHaveBeenCalledWith(['/auth/login']);
  });

  it('logs out, clears storage, and redirects even if the gateway call fails', () => {
    seedStoredSession();
    const auth = TestBed.inject(AuthService);
    httpMock.expectOne(REFRESH_URL).flush({ token: 'access-token-2' });
    httpMock.expectOne(PROFILE_URL).flush(PROFILE);

    auth.logout();

    const logoutRequest = httpMock.expectOne(LOGOUT_URL);
    expect(logoutRequest.request.method).toBe('POST');
    expect(logoutRequest.request.headers.get('Authorization')).toBe(
      'Bearer access-token-2',
    );
    logoutRequest.flush(
      { statusCode: 500, message: 'Boom' },
      { status: 500, statusText: 'Server Error' },
    );

    expect(readStoredSession()).toBeNull();
    expect(auth.currentSession).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('replaces a tampered stored role with the server-validated profile role', () => {
    seedStoredSession({ ...SESSION, user: { ...SESSION.user, role: UserRole.SUPER_ADMIN } });
    const auth = TestBed.inject(AuthService);

    httpMock.expectOne(REFRESH_URL).flush({ token: 'access-token-2' });
    httpMock.expectOne(PROFILE_URL).flush(PROFILE);

    expect(auth.currentSession?.user.role).toBe(UserRole.VENDEDOR);
    expect(readStoredSession()?.user.role).toBe(UserRole.VENDEDOR);
  });

  it('replaces a tampered stored user id and email with the server profile identity', () => {
    seedStoredSession({
      ...SESSION,
      user: { ...SESSION.user, id: 'tampered-id', email: 'tampered@example.com' },
    });
    const auth = TestBed.inject(AuthService);

    httpMock.expectOne(REFRESH_URL).flush({ token: 'access-token-2' });
    httpMock.expectOne(PROFILE_URL).flush(PROFILE);

    const serverIdentity = { id: 'user-1', email: 'vendor@example.com', role: UserRole.VENDEDOR };
    expect(auth.currentSession?.user).toEqual(serverIdentity);
    expect(readStoredSession()?.user).toEqual(serverIdentity);
  });

  it('clears the restored session when the profile reports an inactive account', () => {
    seedStoredSession();
    const auth = TestBed.inject(AuthService);

    httpMock.expectOne(REFRESH_URL).flush({ token: 'access-token-2' });
    httpMock.expectOne(PROFILE_URL).flush({ ...PROFILE, isActive: false });

    expect(auth.currentSession).toBeNull();
    expect(readStoredSession()).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('clears the restored session when the profile request fails', () => {
    seedStoredSession();
    const auth = TestBed.inject(AuthService);

    httpMock.expectOne(REFRESH_URL).flush({ token: 'access-token-2' });
    httpMock
      .expectOne(PROFILE_URL)
      .flush({ statusCode: 500, message: 'Boom' }, { status: 500, statusText: 'Server Error' });

    expect(auth.currentSession).toBeNull();
    expect(readStoredSession()).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('does not request the profile when the bootstrap refresh is rejected', () => {
    seedStoredSession();
    TestBed.inject(AuthService);

    httpMock
      .expectOne(REFRESH_URL)
      .flush(
        { statusCode: 401, message: 'Invalid refresh token' },
        { status: 401, statusText: 'Unauthorized' },
      );

    httpMock.expectNone(PROFILE_URL);
    expect(readStoredSession()).toBeNull();
  });

  it('ends the local session when another tab removes the auth key', () => {
    seedStoredSession();
    const auth = TestBed.inject(AuthService);
    httpMock.expectOne(REFRESH_URL).flush({ token: 'access-token-2' });
    httpMock.expectOne(PROFILE_URL).flush(PROFILE);
    const readiness = captureReadiness(auth);

    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    window.dispatchEvent(
      new StorageEvent('storage', { key: SESSION_STORAGE_KEY, newValue: null }),
    );

    expect(auth.currentSession).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
    // A remote logout needs no revalidation: readiness stays settled and
    // guards simply find no session.
    expect(readiness).toEqual([true]);
  });

  it('revalidates a session signed in by another tab before marking the session ready', () => {
    const auth = TestBed.inject(AuthService);
    expect(auth.currentSession).toBeNull();
    const readiness = captureReadiness(auth);

    replaceStoredSessionFromOtherTab(SESSION);

    // The replacement is installed, but readiness flips back to false.
    expect(auth.currentSession).toEqual(SESSION);
    expect(readiness).toEqual([true, false]);

    httpMock.expectOne(REFRESH_URL).flush({ token: 'access-token-2' });
    httpMock.expectOne(PROFILE_URL).flush(PROFILE);

    expect(readiness).toEqual([true, false, true]);
    expect(auth.currentSession).toEqual({ ...SESSION, token: 'access-token-2' });
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('does not overwrite a newer session installed synchronously during readiness invalidation', () => {
    const auth = TestBed.inject(AuthService);
    const storage = TestBed.inject(SessionStorageService);
    const readiness = captureReadiness(auth);
    auth.sessionReady$.subscribe((ready) => {
      if (!ready) {
        storage.set(NEWER_LOGIN_SESSION);
      }
    });

    replaceStoredSessionFromOtherTab(OTHER_TAB_SESSION);

    expect(auth.currentSession).toEqual(NEWER_LOGIN_SESSION);
    expect(readStoredSession()).toEqual(NEWER_LOGIN_SESSION);
    expect(readiness).toEqual([true, false]);
    const refresh = httpMock.expectOne(REFRESH_URL);
    expect(refresh.request.body).toEqual({ refreshToken: NEWER_LOGIN_SESSION.refreshToken });
    refresh.flush({ token: 'validated-access-token' });
    httpMock.expectOne(PROFILE_URL).flush({
      id: NEWER_LOGIN_SESSION.user.id,
      email: NEWER_LOGIN_SESSION.user.email,
      role: UserRole.CLIENTE,
      isActive: true,
    });
    expect(readiness).toEqual([true, false, true]);
  });

  it('logs out when a cross-tab replacement is rejected by the refresh', () => {
    const auth = TestBed.inject(AuthService);

    replaceStoredSessionFromOtherTab(OTHER_TAB_SESSION);

    httpMock
      .expectOne(REFRESH_URL)
      .flush(
        { statusCode: 401, message: 'Invalid refresh token' },
        { status: 401, statusText: 'Unauthorized' },
      );

    httpMock.expectNone(PROFILE_URL);
    expect(auth.currentSession).toBeNull();
    expect(readStoredSession()).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith([LOGIN_PATH]);
  });

  it('logs out when a cross-tab replacement fails profile revalidation', () => {
    const auth = TestBed.inject(AuthService);

    replaceStoredSessionFromOtherTab(OTHER_TAB_SESSION);

    httpMock.expectOne(REFRESH_URL).flush({ token: 'revalidated-access-token' });
    httpMock
      .expectOne(PROFILE_URL)
      .flush({ statusCode: 500, message: 'Boom' }, { status: 500, statusText: 'Server Error' });

    expect(auth.currentSession).toBeNull();
    expect(readStoredSession()).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith([LOGIN_PATH]);
  });

  it('adopts a cross-tab access token rotation without revalidating the session', () => {
    seedStoredSession();
    const auth = TestBed.inject(AuthService);
    httpMock.expectOne(REFRESH_URL).flush({ token: 'access-token-2' });
    httpMock.expectOne(PROFILE_URL).flush(PROFILE);
    const readiness = captureReadiness(auth);

    // Another tab refreshed: same identity, same refresh token, new access token.
    replaceStoredSessionFromOtherTab({ ...SESSION, token: 'access-token-3' });

    expect(readStoredSession()?.token).toBe('access-token-3');
    expect(auth.currentSession?.token).toBe('access-token-3');
    expect(readiness).toEqual([true]);
    httpMock.expectNone(REFRESH_URL);
    httpMock.expectNone(PROFILE_URL);
  });
});
