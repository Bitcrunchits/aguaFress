import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import {
  SESSION_STORAGE_KEY,
  isSession,
  isTokenRotation,
  type Session,
} from './auth.models';

/**
 * Persistence adapter for the auth session.
 *
 * Owns the single localStorage key and is the single source of truth for
 * the current session: every write goes through this service, and every
 * change (same tab or cross tab) is emitted on `session$`.
 *
 * Cross tab sync relies on the native `storage` event: a remote logout is
 * applied immediately, a cross-tab token rotation is adopted as-is, and a
 * session another tab installed is exposed on `session$` together with a
 * `sessionReplacement$` signal so `AuthService` can revalidate it (refresh
 * plus profile) before guards may authorize with it.
 */
@Injectable({ providedIn: 'root' })
export class SessionStorageService implements OnDestroy {
  private readonly sessionSubject = new BehaviorSubject<Session | null>(
    this.readStoredSession(),
  );

  private readonly sessionReplacementSubject = new Subject<void>();
  private readonly sessionReplacementPendingSubject = new Subject<void>();

  readonly session$ = this.sessionSubject.asObservable();

  /** Signals that a remote replacement must be treated as unvalidated before it is published. */
  readonly sessionReplacementPending$ = this.sessionReplacementPendingSubject.asObservable();

  /**
   * Triggers revalidation after a remote replacement has been handled.
   * The current session, not a captured event payload, is revalidated.
   */
  readonly sessionReplacement$ = this.sessionReplacementSubject.asObservable();

  constructor() {
    window.addEventListener('storage', this.handleStorageEvent);
  }

  ngOnDestroy(): void {
    window.removeEventListener('storage', this.handleStorageEvent);
  }

  get session(): Session | null {
    return this.sessionSubject.value;
  }

  set(session: Session): void {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    this.sessionSubject.next(session);
  }

  updateToken(token: string): void {
    const current = this.sessionSubject.value;
    if (current === null) {
      return;
    }
    this.set({ ...current, token });
  }

  /**
   * Replaces the stored identity (id, email, role) with the
   * server-validated profile values. Used by the bootstrap profile check,
   * so the authoritative identity always comes from the backend and never
   * from an editable localStorage copy. Writes only when something
   * actually changed, so a no-op validation does not wake the other tabs.
   */
  updateUserIdentity(identity: Pick<Session['user'], 'id' | 'email' | 'role'>): void {
    const current = this.sessionSubject.value;
    if (current === null) {
      return;
    }
    if (
      current.user.id === identity.id &&
      current.user.email === identity.email &&
      current.user.role === identity.role
    ) {
      return;
    }
    this.set({ ...current, user: { ...current.user, ...identity } });
  }

  clear(): void {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    this.sessionSubject.next(null);
  }

  private readonly handleStorageEvent = (event: StorageEvent): void => {
    // `key === null` means localStorage.clear() ran in another tab.
    if (event.key !== null && event.key !== SESSION_STORAGE_KEY) {
      return;
    }
    const storedValue = window.localStorage.getItem(SESSION_STORAGE_KEY);
    const incoming = this.readStoredSession();
    if (incoming === null) {
      // Remote logout: apply immediately, exactly as before.
      this.sessionSubject.next(null);
      return;
    }
    const current = this.sessionSubject.value;
    const isReplacement = current === null || !isTokenRotation(current, incoming);
    // Invalidate authorization before publishing the unvalidated identity.
    // Start the restore only after installation, so refresh uses the new session.
    if (isReplacement) {
      this.sessionReplacementPendingSubject.next();
      // A synchronous readiness subscriber may install or clear a newer
      // session. Never overwrite that change with the older storage event.
      if (
        this.sessionSubject.value !== current ||
        window.localStorage.getItem(SESSION_STORAGE_KEY) !== storedValue
      ) {
        this.sessionReplacementSubject.next();
        return;
      }
    }
    this.sessionSubject.next(incoming);
    if (isReplacement) {
      this.sessionReplacementSubject.next();
    }
  };

  private readStoredSession(): Session | null {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (raw === null) {
      return null;
    }

    try {
      const parsed: unknown = JSON.parse(raw);
      return isSession(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
}
