import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';

/**
 * Narrow session view consumed by user-owned data flows: the current auth
 * user id and the session-replacement stream. The concrete `AuthService` is
 * bound to this token at the page boundary.
 */
export interface ClienteSessionReader {
  readonly currentSession: { readonly user: { readonly id: string } } | null;
  readonly sessionReplacement$: Observable<void>;
}

export const CLIENTE_SESSION_READER = new InjectionToken<ClienteSessionReader>(
  'CLIENTE_SESSION_READER',
);
