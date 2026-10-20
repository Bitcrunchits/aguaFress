import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  Observable,
  Subject,
  catchError,
  map,
  of,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import type {
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  UserProfile,
} from '@agua/contracts';
import { API_CONFIG } from '../config/api.config';
import {
  LOGIN_PATH,
  isSamePrincipal,
  isSameSession,
  type Session,
} from './auth.models';
import { SessionStorageService } from './session-storage.service';

export type AuthErrorCode = 'invalid-credentials' | 'inactive-account' | 'network' | 'unexpected';

export class AuthError extends Error {
  constructor(readonly code: AuthErrorCode) {
    super(code);
    this.name = 'AuthError';
  }
}

const AUTH_URL = `${API_CONFIG.baseUrl}/api/v1/auth`;
const PROFILE_URL = `${API_CONFIG.baseUrl}/api/v1/users/profile`;

/**
 * Session lifecycle against the gateway auth actions.
 *
 * Session policy (user confirmed): access token, refresh token, and user
 * live under one localStorage key via `SessionStorageService`; on bootstrap
 * an existing session is restored, refreshed through `auth.refresh`, and
 * then validated against `users.profile` so the identity used for route
 * authorization is the server one, not the editable stored copy; expiry
 * surfaces as logout-on-401 (see the HTTP interceptor). Multi-tab logout is
 * driven by the `storage` event in `SessionStorageService`, and a session
 * another tab installs re-runs the same restore, so a cross-tab replacement
 * is never authorized before the backend revalidates it.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly sessionStorage = inject(SessionStorageService);
  private hasSession = this.sessionStorage.session !== null;

  private readonly sessionReadySubject = new BehaviorSubject<boolean>(false);
  private readonly restoreTrigger$ = new Subject<void>();

  /**
   * Emits `true` exactly once a restore has settled: stored session read,
   * `auth.refresh` attempted, and the `users.profile` validation of
   * id/email/role/isActive completed — whether that restore was the
   * bootstrap one or a revalidation of a cross-tab replacement. Guards must
   * wait for this before trusting `currentSession`, so neither a possibly
   * rejected refresh nor an unvalidated stored identity can open a
   * protected route.
   */
  readonly sessionReady$: Observable<boolean> = this.sessionReadySubject.asObservable();

  constructor() {
    this.sessionStorage.session$.subscribe((session) => {
      if (session === null && this.hasSession) {
        this.router.navigate([LOGIN_PATH]);
      }
      this.hasSession = session !== null;
    });

    // A session installed by another tab re-runs the bootstrap restore:
    // readiness flips back to false, the replacement is refreshed and
    // profile-validated, and only then can guards authorize with it.
    // `switchMap` supersedes any restore still in flight, so a stale
    // chain can never settle readiness for a newer session.
    this.sessionStorage.sessionReplacementPending$.subscribe(() =>
      this.sessionReadySubject.next(false),
    );
    this.sessionStorage.sessionReplacement$.subscribe(() => this.restoreTrigger$.next());
    this.restoreTrigger$
      .pipe(
        switchMap(() => this.restoreSession()),
      )
      .subscribe(() => this.sessionReadySubject.next(true));

    if (this.sessionStorage.session !== null) {
      this.restoreTrigger$.next();
    } else {
      this.sessionReadySubject.next(true);
    }
  }

  get currentSession(): Session | null {
    return this.sessionStorage.session;
  }

  login(credentials: LoginRequest): Observable<Session> {
    return this.http.post<LoginResponse>(`${AUTH_URL}/login`, credentials).pipe(
      tap((session) => this.sessionStorage.set(session)),
      catchError((error: unknown) => throwError(() => this.mapHttpError(error))),
    );
  }

  /**
   * Best-effort server side logout; the local session is always cleared,
   * even when the gateway call fails.
   */
  logout(): void {
    const session = this.sessionStorage.session;
    if (session !== null) {
      this.http
        .post(`${AUTH_URL}/logout`, null, {
          headers: { Authorization: `Bearer ${session.token}` },
        })
        .pipe(catchError(() => of(null)))
        .subscribe();
    }
    this.sessionStorage.clear();
  }

  /**
   * Rotates the stored access token via `auth.refresh`. A failed refresh
   * clears the session and lets the session subscription redirect.
   *
   * Another tab can replace (or remove) the stored session while the
   * request is in flight, so the result is applied only when the session
   * is still the one the refresh was started for; a stale response never
   * overwrites or clears a newer session. A refresh superseded by a
   * newer session (a login in this tab or another) resolves `null` —
   * never the replacing session — so callers such as the bootstrap
   * restore cannot chain a profile check, which could clear that newer
   * session, onto an obsolete refresh.
   */
  refreshSession(): Observable<Session | null> {
    const session = this.sessionStorage.session;
    if (session === null) {
      return of(null);
    }

    const startedWith = session;
    const body: RefreshTokenRequest = { refreshToken: session.refreshToken };
    return this.http.post<RefreshTokenResponse>(`${AUTH_URL}/refresh`, body).pipe(
      map((response) => {
        if (!this.isStillTheSameSession(startedWith)) {
          return null;
        }
        this.sessionStorage.updateToken(response.token);
        return this.sessionStorage.session;
      }),
      catchError(() => {
        if (this.isStillTheSameSession(startedWith)) {
          this.sessionStorage.clear();
        }
        return of(null);
      }),
    );
  }

  /**
   * Restore of the current stored session — the bootstrap one, or a
   * session another tab just installed: refresh the access token first,
   * then validate the refreshed session against the server profile. Only
   * when both steps finish does `sessionReady$` settle, so guards never
   * authorize on the editable localStorage copy alone. A session the
   * refresh rejected, that was absent, or that went stale (a newer login
   * replaced it while the refresh was in flight) needs no profile check.
   */
  private restoreSession(): Observable<Session | null> {
    return this.refreshSession().pipe(
      switchMap((session) => (session === null ? of(null) : this.validateSessionProfile())),
    );
  }

  /**
   * Server-validated identity: the authenticated `users.profile` action
   * returns the authoritative `id`/`email`/`role`/`isActive` of the
   * signed-in user. The stored identity is replaced by it — the server
   * values always win over an edited localStorage copy, never the other
   * way around — and a failed profile call or an inactive account clears
   * the session, so a tampered localStorage identity never grants access
   * after bootstrap. The result is applied only while the session is
   * still the one the call started with, so a cross-tab login or logout
   * during the request is never overwritten by a stale response. The
   * check is identity-level: a newer access token is only a cross-tab
   * rotation of this same session and must not discard the answer.
   */
  private validateSessionProfile(): Observable<Session | null> {
    const startedWith = this.sessionStorage.session;
    if (startedWith === null) {
      return of(null);
    }

    return this.http.get<UserProfile>(PROFILE_URL).pipe(
      map((profile) => {
        if (!this.isStillTheSameIdentity(startedWith)) {
          return this.sessionStorage.session;
        }
        if (!profile.isActive) {
          this.sessionStorage.clear();
          return null;
        }
        this.sessionStorage.updateUserIdentity({
          id: profile.id,
          email: profile.email,
          role: profile.role,
        });
        return this.sessionStorage.session;
      }),
      catchError(() => {
        if (this.isStillTheSameIdentity(startedWith)) {
          this.sessionStorage.clear();
        }
        return of(null);
      }),
    );
  }

  /**
   * Identity check for an in-flight refresh: the stored session must still
   * be the exact session (same user, same refresh token, same access token)
   * the refresh was started with. Any difference means a newer session
   * replaced it — via a cross-tab login, logout, or a parallel refresh —
   * and the older attempt's result must be discarded.
   */
  private isStillTheSameSession(startedWith: Session): boolean {
    const current = this.sessionStorage.session;
    return current !== null && isSameSession(current, startedWith);
  }

  /**
   * Looser check for the profile validation: the stored session must still
   * belong to the same principal (same user, same refresh token). A newer
   * access token alone is a cross-tab rotation of this very session and
   * must not make the server answer look stale.
   */
  private isStillTheSameIdentity(startedWith: Session): boolean {
    const current = this.sessionStorage.session;
    return current !== null && isSamePrincipal(current, startedWith);
  }

  private mapHttpError(error: unknown): AuthError {
    if (!(error instanceof HttpErrorResponse)) {
      return new AuthError('unexpected');
    }
    if (error.status === 0) {
      return new AuthError('network');
    }
    if (error.status === 401) {
      // The backend rejects inactive vendors with 401 "…inactive"/"…not active".
      return /inactive|not active/i.test(readServerMessage(error))
        ? new AuthError('inactive-account')
        : new AuthError('invalid-credentials');
    }
    return new AuthError('unexpected');
  }
}

function readServerMessage(error: HttpErrorResponse): string {
  const body: unknown = error.error;
  if (typeof body === 'string') {
    return body;
  }
  if (typeof body === 'object' && body !== null && 'message' in body) {
    const message: unknown = (body as { message?: unknown }).message;
    return typeof message === 'string' ? message : '';
  }
  return '';
}
