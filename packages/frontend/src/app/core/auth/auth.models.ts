import { UserRole, type LoginResponse } from '@agua/contracts';

/**
 * A persisted session keeps the exact shape returned by the gateway
 * `auth.login` action, so storage reads need no adaptation layer.
 */
export type Session = LoginResponse;

/** Single localStorage key holding token, refresh token, and user together. */
export const SESSION_STORAGE_KEY = 'aguafress.session';

export const LOGIN_PATH = '/auth/login';

/** Post-login redirect target per literal `UserRole`. */
export const ROLE_HOME_PATHS: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: '/admin',
  [UserRole.VENDEDOR]: '/vendedor',
  [UserRole.CLIENTE]: '/cliente',
};

/**
 * Type guard for anything read back from localStorage. Stored JSON is
 * untrusted input: a corrupted or tampered value must degrade to "no
 * session", never to a partially valid object.
 */
export function isSession(value: unknown): value is Session {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<Session>;
  if (typeof candidate.token !== 'string' || candidate.token.length === 0) {
    return false;
  }
  if (typeof candidate.refreshToken !== 'string' || candidate.refreshToken.length === 0) {
    return false;
  }

  const user = candidate.user;
  if (typeof user !== 'object' || user === null) {
    return false;
  }

  const candidateUser = user as Partial<Session['user']>;
  if (typeof candidateUser.id !== 'string' || candidateUser.id.length === 0) {
    return false;
  }
  if (typeof candidateUser.email !== 'string' || candidateUser.email.length === 0) {
    return false;
  }

  return isUserRole(candidateUser.role);
}

function isUserRole(value: unknown): value is UserRole {
  return (
    value === UserRole.SUPER_ADMIN || value === UserRole.VENDEDOR || value === UserRole.CLIENTE
  );
}

/**
 * True only for the exact same stored session: same user, same refresh
 * token, same access token. Any difference means one session replaced the
 * other — a cross-tab login or logout, a parallel refresh, or a newer
 * login in this tab — so an operation started on one session must never
 * clear, overwrite, or authorize with the other.
 */
export function isSameSession(a: Session, b: Session): boolean {
  return (
    a.user.id === b.user.id &&
    a.refreshToken === b.refreshToken &&
    a.token === b.token
  );
}

/**
 * True when both sessions belong to the same signed-in principal: same
 * user and same refresh token, regardless of the (rotatable) access
 * token. A newer access token alone is a rotation of this very session —
 * possibly written by another tab — and must not make a still-valid
 * server answer look stale.
 */
export function isSamePrincipal(a: Session, b: Session): boolean {
  return a.user.id === b.user.id && a.refreshToken === b.refreshToken;
}

/**
 * True when an incoming stored session differs from the held one only in
 * the access token: same principal and same identity — exactly the shape
 * another tab's `auth.refresh` writes. A rotation is adopted as-is; any
 * other difference (a new login, a role or identity edit) is a different
 * session that must be revalidated before guards may authorize with it.
 * Comparing only the access token would make two tabs revalidate each
 * other's rotations forever.
 */
export function isTokenRotation(current: Session, incoming: Session): boolean {
  return (
    isSamePrincipal(current, incoming) &&
    current.user.email === incoming.user.email &&
    current.user.role === incoming.user.role
  );
}
