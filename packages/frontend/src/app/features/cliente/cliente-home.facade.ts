import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type {
  ClienteProfile,
  ClienteProviderResponse,
  UserProfile,
  VendedorProfile,
} from '@agua/contracts';
import { AuthService } from '../../core/auth/auth.service';
import { SessionStorageService } from '../../core/auth/session-storage.service';
import { ClienteProfileService } from './cliente-profile.service';
import { ClienteProviderSelectionService } from './cliente-provider-selection.service';
import { ClienteProvidersService } from './cliente-providers.service';

/** VendedorProfile has a required `estado`; ClienteProfile does not. */
function isClienteProfile(profile: VendedorProfile | ClienteProfile): profile is ClienteProfile {
  return !('estado' in profile);
}

/**
 * Resolves the authenticated cliente's display name from the profile read
 * model, preferring the nested `profile.nombre`/`profile.apellido` and falling
 * back to the top-level `nombre`/`apellido`. Returns null when no name exists.
 */
function clienteNameOf(profile: UserProfile | null | undefined): string | null {
  if (profile === null || profile === undefined) {
    return null;
  }
  const nested = profile.profile;
  const clienteProfile = nested !== undefined && isClienteProfile(nested) ? nested : null;
  const nombre = clienteProfile?.nombre ?? profile.nombre ?? '';
  const apellido = clienteProfile?.apellido ?? profile.apellido ?? '';
  const name = [nombre, apellido].filter(Boolean).join(' ');
  return name.length > 0 ? name : null;
}

export enum ClienteSelectionError {
  FORBIDDEN = 'forbidden',
  NOT_FOUND = 'not-found',
  NETWORK = 'network',
  UNEXPECTED = 'unexpected',
}

/**
 * Coordinates the cliente home state: loads providers, resolves the active
 * one, and reacts to session changes. The page component only renders this
 * state and forwards user actions.
 */
@Injectable()
export class ClienteHomeFacade {
  private readonly providersService = inject(ClienteProvidersService);
  private readonly providerSelection = inject(ClienteProviderSelectionService);
  private readonly profileService = inject(ClienteProfileService);
  private readonly auth = inject(AuthService);
  private readonly sessionStorage = inject(SessionStorageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly providers = signal<ClienteProviderResponse[]>([]);
  readonly selectedProvider = signal<ClienteProviderResponse | null>(null);
  readonly clientName = signal<string | null>(null);
  readonly loading = signal(false);
  readonly failed = signal(false);
  readonly selectingId = signal<string | null>(null);
  readonly selectionError = signal<ClienteSelectionError | null>(null);
  readonly showSelector = signal(false);

  private requestId = 0;
  private activeUserId: string | null = null;

  constructor() {
    this.activeUserId = this.auth.currentSession?.user.id ?? null;
    this.sessionStorage.session$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((session) => {
        const userId = session?.user.id ?? null;
        if (this.activeUserId !== userId) {
          this.requestId++;
          this.resetState();
          if (userId !== null) {
            this.load();
          }
        }
        this.activeUserId = userId;
      });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.failed.set(false);
    this.selectingId.set(null);
    this.selectionError.set(null);
    this.showSelector.set(false);

    const requestId = ++this.requestId;
    const requestUserId = this.authUserId;

    this.loadClientName(requestId, requestUserId);

    this.providersService
      .listProviders()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (requestId !== this.requestId) {
            return;
          }
          if (this.authUserId !== requestUserId) {
            this.recoverFromIdentityChange();
            return;
          }
          this.providers.set([...response.providers]);
          this.selectedProvider.set(this.providerSelection.resolve(requestUserId, response));
          this.showSelector.set(
            response.requiresSelection && this.selectedProvider() === null,
          );
          this.loading.set(false);
        },
        error: () => {
          if (requestId !== this.requestId) {
            return;
          }
          if (this.authUserId !== requestUserId) {
            this.recoverFromIdentityChange();
            return;
          }
          this.failed.set(true);
          this.loading.set(false);
        },
      });
  }

  retry(): void {
    this.load();
  }

  select(provider: ClienteProviderResponse): void {
    if (this.selectingId() !== null) {
      return;
    }

    this.selectingId.set(provider.id);
    this.selectionError.set(null);
    const requestUserId = this.authUserId;
    const loadRequestId = this.requestId;

    this.providersService
      .selectProvider(provider.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (loadRequestId !== this.requestId) {
            return;
          }
          if (this.authUserId !== requestUserId) {
            this.recoverFromIdentityChange();
            return;
          }
          this.selectedProvider.set(response.selectedProvider);
          this.providerSelection.remember(requestUserId, response.selectedProvider.id);
          this.showSelector.set(false);
          this.selectingId.set(null);
        },
        error: (error: unknown) => {
          if (loadRequestId !== this.requestId) {
            return;
          }
          if (this.authUserId !== requestUserId) {
            return;
          }
          this.selectionError.set(mapSelectionError(error));
          this.selectingId.set(null);
        },
      });
  }

  changeProvider(): void {
    this.selectionError.set(null);
    this.showSelector.set(true);
  }

  private loadClientName(requestId: number, requestUserId: string | null): void {
    this.profileService
      .getProfile()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          if (requestId !== this.requestId || this.authUserId !== requestUserId) {
            return;
          }
          this.clientName.set(clienteNameOf(profile));
        },
        error: () => {
          if (requestId !== this.requestId || this.authUserId !== requestUserId) {
            return;
          }
          // The greeting is non-critical: keep it hidden on failure.
          this.clientName.set(null);
        },
      });
  }

  private resetState(): void {
    this.providers.set([]);
    this.selectedProvider.set(null);
    this.clientName.set(null);
    this.loading.set(false);
    this.failed.set(false);
    this.selectingId.set(null);
    this.selectionError.set(null);
    this.showSelector.set(false);
  }

  private recoverFromIdentityChange(): void {
    this.resetState();
    if (this.authUserId !== null) {
      this.load();
    }
  }

  private get authUserId(): string | null {
    return this.auth.currentSession?.user.id ?? null;
  }
}

function mapSelectionError(error: unknown): ClienteSelectionError {
  const status = error instanceof HttpErrorResponse ? error.status : -1;
  switch (status) {
    case 403:
      return ClienteSelectionError.FORBIDDEN;
    case 404:
      return ClienteSelectionError.NOT_FOUND;
    case 0:
      return ClienteSelectionError.NETWORK;
    default:
      return ClienteSelectionError.UNEXPECTED;
  }
}
