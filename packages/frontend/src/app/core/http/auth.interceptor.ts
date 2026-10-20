import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { LOGIN_PATH, isSameSession } from '../auth/auth.models';
import { SessionStorageService } from '../auth/session-storage.service';

const GATEWAY_ORIGIN = new URL(API_CONFIG.baseUrl).origin;
const PROTECTED_API_PREFIX = '/api/';
const AUTH_ENDPOINT_PREFIX = '/api/v1/auth/';

/**
 * Resolves a request URL against the configured gateway base so relative
 * `/api/...` URLs count as gateway calls, while absolute URLs keep their
 * own origin. Returns null for URLs that cannot be resolved.
 */
function resolveAgainstGateway(url: string): URL | null {
  try {
    return new URL(url, API_CONFIG.baseUrl);
  } catch {
    return null;
  }
}

/** True only for protected API paths on the configured gateway origin. */
function isProtectedGatewayApi(url: string): boolean {
  const resolved = resolveAgainstGateway(url);
  return (
    resolved !== null &&
    resolved.origin === GATEWAY_ORIGIN &&
    resolved.pathname.startsWith(PROTECTED_API_PREFIX)
  );
}

/**
 * Auth endpoints never carry the bearer token, so a failed login keeps
 * showing its inline error instead of triggering a logout redirect, and
 * the flow never loops on itself.
 */
function isAuthEndpoint(url: string): boolean {
  const resolved = resolveAgainstGateway(url);
  return resolved !== null && resolved.pathname.startsWith(AUTH_ENDPOINT_PREFIX);
}

/**
 * Attaches `Authorization: Bearer <token>` only to protected API calls on
 * the configured gateway origin: relative `/api/...` URLs and absolute
 * URLs sharing the gateway origin. Requests to any other origin (or to
 * non-API gateway paths) are forwarded untouched, and a 401 from a
 * protected gateway endpoint turns into a controlled logout — but only
 * when the failed request belongs to the session still held: a delayed
 * 401 from an older request must never clear a session another tab (or a
 * newer login) installed meanwhile.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const sessionStorage = inject(SessionStorageService);
  const router = inject(Router);
  const isProtectedApi = isProtectedGatewayApi(request.url) && !isAuthEndpoint(request.url);
  const session = sessionStorage.session;

  const outgoing =
    session !== null && isProtectedApi
      ? request.clone({ setHeaders: { Authorization: `Bearer ${session.token}` } })
      : request;

  return next(outgoing).pipe(
    catchError((error: unknown) => {
      const current = sessionStorage.session;
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        isProtectedApi &&
        session !== null &&
        current !== null &&
        isSameSession(current, session)
      ) {
        sessionStorage.clear();
        router.navigate([LOGIN_PATH]);
      }
      return throwError(() => error);
    }),
  );
};
