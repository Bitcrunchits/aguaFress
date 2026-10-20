import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { UserRole, type LoginResponse } from '@agua/contracts';
import { SESSION_STORAGE_KEY } from '../auth/auth.models';
import { authInterceptor } from './auth.interceptor';

const PROFILE_URL = 'https://api-aguafress.eadev.cloud/api/v1/users/profile';
const LOGIN_URL = 'https://api-aguafress.eadev.cloud/api/v1/auth/login';
const RELATIVE_PROFILE_URL = '/api/v1/users/profile';
const EXTERNAL_URL = 'https://third-party.example.com/api/v1/users/profile';

const SESSION: LoginResponse = {
  token: 'access-token-1',
  refreshToken: 'refresh-token-1',
  user: { id: 'user-1', email: 'someone@example.com', role: UserRole.CLIENTE },
};

/** A session another tab installs while an older request is still in flight. */
const NEWER_SESSION: LoginResponse = {
  token: 'newer-access-token',
  refreshToken: 'newer-refresh-token',
  user: { id: 'user-2', email: 'newer@example.com', role: UserRole.CLIENTE },
};

function readStoredSession(): LoginResponse | null {
  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  return raw === null ? null : (JSON.parse(raw) as LoginResponse);
}

describe('authInterceptor', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    window.localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
  });

  afterEach(() => {
    httpMock.verify();
    window.localStorage.clear();
  });

  it('attaches the bearer token to protected API calls', () => {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(SESSION));
    const http = TestBed.inject(HttpClient);

    http.get(PROFILE_URL).subscribe();

    const request = httpMock.expectOne(PROFILE_URL);
    expect(request.request.headers.get('Authorization')).toBe('Bearer access-token-1');
    request.flush({});
  });

  it('treats relative /api paths as gateway calls and attaches the token', () => {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(SESSION));
    const http = TestBed.inject(HttpClient);

    http.get(RELATIVE_PROFILE_URL).subscribe();

    const request = httpMock.expectOne(RELATIVE_PROFILE_URL);
    expect(request.request.headers.get('Authorization')).toBe('Bearer access-token-1');
    request.flush({});
  });

  it('does not attach the bearer token to requests to other origins', () => {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(SESSION));
    const http = TestBed.inject(HttpClient);

    http.get(EXTERNAL_URL).subscribe();

    const request = httpMock.expectOne(EXTERNAL_URL);
    expect(request.request.headers.get('Authorization')).toBeNull();
    request.flush({});
  });

  it('keeps the session when a non-gateway endpoint answers 401', () => {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(SESSION));
    const http = TestBed.inject(HttpClient);
    let caughtStatus: number | undefined;

    http.get(EXTERNAL_URL).subscribe({
      error: (error: { status?: number }) => (caughtStatus = error.status),
    });

    httpMock
      .expectOne(EXTERNAL_URL)
      .flush({ message: 'Nope' }, { status: 401, statusText: 'Unauthorized' });

    expect(caughtStatus).toBe(401);
    expect(window.localStorage.getItem(SESSION_STORAGE_KEY)).not.toBeNull();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('does not attach a token to auth endpoints', () => {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(SESSION));
    const http = TestBed.inject(HttpClient);

    http.post(LOGIN_URL, { email: 'a@example.com', password: 'x' }).subscribe();

    const request = httpMock.expectOne(LOGIN_URL);
    expect(request.request.headers.get('Authorization')).toBeNull();
    request.flush({});
  });

  it('clears the session and redirects to login on a protected-endpoint 401', () => {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(SESSION));
    const http = TestBed.inject(HttpClient);
    let caughtStatus: number | undefined;

    http.get(PROFILE_URL).subscribe({
      error: (error: { status?: number }) => (caughtStatus = error.status),
    });

    httpMock
      .expectOne(PROFILE_URL)
      .flush({ statusCode: 401, message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(caughtStatus).toBe(401);
    expect(window.localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('keeps a newer session when a delayed 401 belongs to a superseded one', () => {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(SESSION));
    const http = TestBed.inject(HttpClient);
    let caughtStatus: number | undefined;

    http.get(PROFILE_URL).subscribe({
      error: (error: { status?: number }) => (caughtStatus = error.status),
    });

    // The request went out with the old session's token.
    const request = httpMock.expectOne(PROFILE_URL);
    expect(request.request.headers.get('Authorization')).toBe('Bearer access-token-1');

    // Another tab installs a newer session before the 401 comes back.
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(NEWER_SESSION));
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: SESSION_STORAGE_KEY,
        newValue: JSON.stringify(NEWER_SESSION),
      }),
    );

    request.flush(
      { statusCode: 401, message: 'Unauthorized' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(caughtStatus).toBe(401);
    expect(readStoredSession()).toEqual(NEWER_SESSION);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('keeps the login attempt on the page when credentials are rejected', () => {
    const http = TestBed.inject(HttpClient);
    let caughtStatus: number | undefined;

    http.post(LOGIN_URL, { email: 'a@example.com', password: 'bad' }).subscribe({
      error: (error: { status?: number }) => (caughtStatus = error.status),
    });

    httpMock
      .expectOne(LOGIN_URL)
      .flush({ statusCode: 401, message: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });

    expect(caughtStatus).toBe(401);
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
