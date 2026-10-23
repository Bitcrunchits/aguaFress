import { InjectionToken } from '@angular/core';

/**
 * Per-user persistence contract for the selected provider. The facade
 * depends on this abstraction; the localStorage implementation is bound to
 * the token at the page boundary.
 */
export interface ClienteProviderStore {
  read(userId: string): string | null;
  save(userId: string, vendedorId: string): void;
  clear(userId: string): void;
}

/**
 * Narrow provider lookup used by cart writes: they only read the selected
 * provider and clear it when it turns stale, never save a selection.
 */
export interface ClienteProviderReader {
  read(userId: string): string | null;
  clear(userId: string): void;
}

export const CLIENTE_PROVIDER_STORE = new InjectionToken<ClienteProviderStore>(
  'CLIENTE_PROVIDER_STORE',
);

export const CLIENTE_PROVIDER_READER = new InjectionToken<ClienteProviderReader>(
  'CLIENTE_PROVIDER_READER',
);
