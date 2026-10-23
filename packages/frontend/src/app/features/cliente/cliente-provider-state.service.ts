import { Injectable } from '@angular/core';
import type { ClienteProviderStore } from './cliente-provider.store';

const STORAGE_KEY_PREFIX = 'aguafress.cliente.provider.';

/**
 * Browser-local persistence for the cliente's active provider.
 *
 * The backend does not persist the selection (it only validates it), so the
 * chosen `vendedorId` lives in localStorage scoped per authenticated user.
 * Storage access is best-effort: a blocked or full localStorage degrades to
 * no persistence and never breaks the page.
 */
@Injectable({ providedIn: 'root' })
export class ClienteProviderStateService implements ClienteProviderStore {
  read(userId: string): string | null {
    try {
      return window.localStorage.getItem(this.key(userId));
    } catch {
      return null;
    }
  }

  save(userId: string, vendedorId: string): void {
    try {
      window.localStorage.setItem(this.key(userId), vendedorId);
    } catch {
      // Persistence is optional: keep the in-memory selection alive.
    }
  }

  clear(userId: string): void {
    try {
      window.localStorage.removeItem(this.key(userId));
    } catch {
      // Nothing to recover: the key is already unreachable.
    }
  }

  private key(userId: string): string {
    return `${STORAGE_KEY_PREFIX}${userId}`;
  }
}
