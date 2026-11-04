import { Injectable, inject } from '@angular/core';
import {
  CLIENTE_TRACKING_SESSION_READER,
  type ClienteTrackingReader,
  type ClienteTrackingWriter,
} from './cliente-tracking.contract';

const STORAGE_KEY_PREFIX = 'aguafress.pendingTrackings.';

/**
 * Session-scoped persistence for pending order tracking ids.
 *
 * The orders list response does not expose `trackingId`, so the cart stores the
 * id returned by the async acceptance and the orders facade reads it back.
 * Entries are keyed per authenticated user and live in `sessionStorage`, which
 * is per tab and discarded when the tab closes.
 */
@Injectable({ providedIn: 'root' })
export class ClienteTrackingStore implements ClienteTrackingReader, ClienteTrackingWriter {
  private readonly sessionReader = inject(CLIENTE_TRACKING_SESSION_READER);

  add(trackingId: string): void {
    const current = this.list();
    if (current.includes(trackingId)) {
      return;
    }
    this.write([...current, trackingId]);
  }

  list(): string[] {
    const userId = this.currentUserId();
    if (userId === null) {
      return [];
    }
    return this.readKey(this.key(userId));
  }

  remove(trackingId: string): void {
    const current = this.list();
    if (!current.includes(trackingId)) {
      return;
    }
    this.write(current.filter((value) => value !== trackingId));
  }

  private readKey(key: string): string[] {
    try {
      const raw = window.sessionStorage.getItem(key);
      if (raw === null) {
        return [];
      }
      const parsed: unknown = JSON.parse(raw);
      return isStringArray(parsed) ? [...new Set(parsed)] : [];
    } catch {
      return [];
    }
  }

  private write(trackingIds: string[]): void {
    const userId = this.currentUserId();
    if (userId === null) {
      return;
    }

    try {
      window.sessionStorage.setItem(this.key(userId), JSON.stringify(trackingIds));
    } catch {
      // Storage is best-effort: persistence must never break the caller.
    }
  }

  private currentUserId(): string | null {
    return this.sessionReader.session?.user.id ?? null;
  }

  private key(userId: string): string {
    return `${STORAGE_KEY_PREFIX}${userId}`;
  }
}

function isStringArray(value: unknown): value is string[] {
  if (!Array.isArray(value)) {
    return false;
  }
  return value.every((item: unknown) => typeof item === 'string');
}
