import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';

/**
 * Readiness view for consumers that must not start protected requests until a
 * replacement session has been refreshed and profile-validated. Kept apart
 * from `ClienteSessionReader` so existing session consumers are unaffected.
 */
export interface ClienteSessionReadinessReader {
  readonly sessionReady$: Observable<boolean>;
}

export const CLIENTE_SESSION_READINESS_READER =
  new InjectionToken<ClienteSessionReadinessReader>('CLIENTE_SESSION_READINESS_READER');
