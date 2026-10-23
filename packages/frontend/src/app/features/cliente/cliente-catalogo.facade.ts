import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { ProductResponse } from '@agua/contracts';
import { AuthService } from '../../core/auth/auth.service';
import {
  CLIENTE_CATALOGO_GATEWAY,
  ClienteCatalogoServerMessage,
} from './cliente-catalogo.gateway';
import { CLIENTE_PROVIDER_STORE } from './cliente-provider.store';

const PAGE_SIZE = 20;

/**
 * Coordinates the cliente catalog browse state: resolves the stored
 * provider, loads its first page, and owns stale-provider recovery.
 *
 * The selected provider lives only in localStorage and can be stale, so
 * this facade — not a route guard — validates it against the backend: a
 * 404 or a 400 `requiresSelection` clears the stored id and asks the page
 * to return to the cliente home, where the provider is resolved again.
 */
@Injectable()
export class ClienteCatalogoFacade {
  private readonly catalogoGateway = inject(CLIENTE_CATALOGO_GATEWAY);
  private readonly providerStore = inject(CLIENTE_PROVIDER_STORE);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly products = signal<ProductResponse[]>([]);
  readonly loading = signal(false);
  readonly failed = signal(false);
  readonly redirectToHome = signal(false);

  private requestId = 0;

  constructor() {
    this.auth.sessionReplacement$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.requestId++;
        this.products.set([]);
        this.loading.set(false);
        this.load();
      });
  }

  load(): void {
    const userId = this.auth.currentSession?.user.id ?? null;
    const vendedorId = userId === null ? null : this.providerStore.read(userId);

    if (userId === null || vendedorId === null || vendedorId.length === 0) {
      this.requestId++;
      this.products.set([]);
      this.loading.set(false);
      this.failed.set(false);
      this.redirectToHome.set(true);
      return;
    }

    const requestId = ++this.requestId;
    this.loading.set(true);
    this.failed.set(false);
    this.redirectToHome.set(false);

    this.catalogoGateway
      .list(vendedorId, 1, PAGE_SIZE)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (requestId !== this.requestId) {
            return;
          }
          if (!this.isCurrentUser(userId)) {
            this.products.set([]);
            this.loading.set(false);
            return;
          }
          this.products.set([...response.data]);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          if (requestId !== this.requestId) {
            return;
          }
          if (!this.isCurrentUser(userId)) {
            this.products.set([]);
            this.loading.set(false);
            return;
          }
          if (isStaleProviderError(error)) {
            this.providerStore.clear(userId);
            this.products.set([]);
            this.loading.set(false);
            this.redirectToHome.set(true);
            return;
          }
          this.failed.set(true);
          this.loading.set(false);
        },
      });
  }

  retry(): void {
    this.failed.set(false);
    this.load();
  }

  /**
   * A response only applies to the auth user that started the request. A
   * real session replacement invalidates in-flight work through
   * `sessionReplacement$`; a token rotation keeps the same user and must
   * not strand the response.
   */
  private isCurrentUser(userId: string): boolean {
    return this.auth.currentSession?.user.id === userId;
  }
}

function isStaleProviderError(error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse)) {
    return false;
  }
  if (error.status === 404) {
    return true;
  }
  return (
    error.status === 400 &&
    readServerMessage(error) === ClienteCatalogoServerMessage.RequiresSelection
  );
}

function readServerMessage(error: HttpErrorResponse): string {
  const body: unknown = error.error;
  if (typeof body === 'string') {
    return body;
  }
  if (typeof body === 'object' && body !== null && 'message' in body) {
    const message: unknown = (body as { message?: unknown }).message;
    return typeof message === 'string' ? message : '';
  }
  return '';
}
