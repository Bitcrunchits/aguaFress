import { Injectable, inject } from '@angular/core';
import type {
  ClienteProviderResponse,
  ClienteProvidersResponse,
} from '@agua/contracts';
import { ClienteProviderStateService } from './cliente-provider-state.service';

/**
 * Provider-selection policy.
 *
 * Resolves the active provider from the list response: a stored id that
 * still exists, then the account default, then a single available provider,
 * otherwise none. Persistence itself belongs to `ClienteProviderStateService`.
 */
@Injectable({ providedIn: 'root' })
export class ClienteProviderSelectionService {
  private readonly state = inject(ClienteProviderStateService);

  resolve(
    userId: string | null,
    response: ClienteProvidersResponse,
  ): ClienteProviderResponse | null {
    const storedId = userId === null ? null : this.state.read(userId);

    if (storedId !== null) {
      const stored = response.providers.find((provider) => provider.id === storedId);
      if (stored !== undefined) {
        return stored;
      }
      if (userId !== null) {
        this.state.clear(userId);
      }
    }

    if (response.defaultVendedorId !== undefined) {
      const fallback = response.providers.find(
        (provider) => provider.id === response.defaultVendedorId,
      );
      if (fallback !== undefined) {
        this.persistIfChanged(userId, fallback.id);
        return fallback;
      }
    }

    if (response.providers.length === 1) {
      const only = response.providers[0];
      this.persistIfChanged(userId, only.id);
      return only;
    }

    return null;
  }

  remember(userId: string | null, vendedorId: string): void {
    this.persistIfChanged(userId, vendedorId);
  }

  private persistIfChanged(userId: string | null, vendedorId: string): void {
    if (userId === null || this.state.read(userId) === vendedorId) {
      return;
    }
    this.state.save(userId, vendedorId);
  }
}
