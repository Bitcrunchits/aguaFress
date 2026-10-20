import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { UserRole } from '@agua/contracts';
import { filter, map, take } from 'rxjs';
import { LOGIN_PATH, ROLE_HOME_PATHS } from './auth.models';
import { AuthService } from './auth.service';

/**
 * Shell routes: require a validated session. The guard waits for the
 * bootstrap restore to settle — stored session read, refresh attempted,
 * and the `users.profile` role/isActive validation finished — before
 * deciding, so a session that may still be rejected, or a role that is
 * still the unvalidated stored copy, never opens a protected route. Once
 * settled, a valid session is allowed and a missing or expired one is
 * sent to login.
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  return authService.sessionReady$.pipe(
    filter((ready) => ready),
    take(1),
    map(() =>
      authService.currentSession !== null ? true : router.createUrlTree([LOGIN_PATH]),
    ),
  );
};

/**
 * Login route: authenticated users are sent to their role home. It only
 * redirects away from the login page; the destination is a shell route
 * that re-checks the server-validated role, so this shortcut never grants
 * access by itself.
 */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const session = authService.currentSession;
  if (session === null) {
    return true;
  }
  return router.createUrlTree([ROLE_HOME_PATHS[session.user.role]]);
};

/**
 * Shell child routes: only the listed roles may open the route.
 * Unauthenticated users go to login; a signed-in user with another role
 * is sent to their own role home. When that home is the path currently
 * being activated, the navigation is cancelled instead of redirected, so
 * the router can never loop on itself.
 *
 * The decision waits for `sessionReady$`, so it only runs once the
 * bootstrap profile validation has replaced the stored role with the
 * server one: a role written straight into localStorage is never enough
 * to open a privileged route.
 */
export function roleGuard(...allowedRoles: UserRole[]): CanActivateFn {
  return (_route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);
    return authService.sessionReady$.pipe(
      filter((ready) => ready),
      take(1),
      map(() => {
        const session = authService.currentSession;
        if (session === null) {
          return router.createUrlTree([LOGIN_PATH]);
        }
        if (allowedRoles.includes(session.user.role)) {
          return true;
        }
        const homeUrl = router.parseUrl(ROLE_HOME_PATHS[session.user.role]);
        return homeUrl.toString() === state.url ? false : homeUrl;
      }),
    );
  };
}
