import { InjectionToken } from '@angular/core';

/**
 * Pending tracking ids persisted for the authenticated user. Consumers that
 * only list, poll, or remove ids must not depend on the cart acceptance writer.
 */
export interface ClienteTrackingReader {
  list(): string[];
  remove(trackingId: string): void;
}

/**
 * Narrow session view used by the tracking store to key pending ids per
 * authenticated user. The concrete `SessionStorageService` is bound to this
 * token at the application composition root.
 */
export interface ClienteTrackingSessionReader {
  readonly session: { readonly user: { readonly id: string } } | null;
}

/**
 * Write capability used when an async order acceptance returns a tracking id.
 * Kept apart from the reader so the confirmation flow cannot read or remove
 * another consumer's ids.
 */
export interface ClienteTrackingWriter {
  add(trackingId: string): void;
}

export const CLIENTE_TRACKING_READER = new InjectionToken<ClienteTrackingReader>(
  'CLIENTE_TRACKING_READER',
);

export const CLIENTE_TRACKING_WRITER = new InjectionToken<ClienteTrackingWriter>(
  'CLIENTE_TRACKING_WRITER',
);

export const CLIENTE_TRACKING_SESSION_READER =
  new InjectionToken<ClienteTrackingSessionReader>('CLIENTE_TRACKING_SESSION_READER');
