import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { PaginationResponse, ProductResponse } from '@agua/contracts';
import { Subject, debounceTime } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import {
  CLIENTE_CATALOGO_GATEWAY,
  CLIENTE_CATALOGO_SEARCH_GATEWAY,
} from './cliente-catalogo.gateway';
import { isStaleProviderError } from './cliente-provider-error';
import { CLIENTE_PROVIDER_STORE } from './cliente-provider.store';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;
const MAX_SEARCH_QUERY_LENGTH = 200;

/**
 * Coordinates the cliente catalog browse state: resolves the stored
 * provider, loads its first page, searches within it, paginates, and owns
 * stale-provider recovery.
 *
 * The selected provider lives only in localStorage and can be stale, so
 * this facade — not a route guard — validates it against the backend: a
 * 404 or a 400 `requiresSelection` clears the stored id and asks the page
 * to return to the cliente home, where the provider is resolved again.
 */
@Injectable()
export class ClienteCatalogoFacade {
  private readonly catalogoGateway = inject(CLIENTE_CATALOGO_GATEWAY);
  private readonly catalogoSearchGateway = inject(CLIENTE_CATALOGO_SEARCH_GATEWAY);
  private readonly providerStore = inject(CLIENTE_PROVIDER_STORE);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly products = signal<ProductResponse[]>([]);
  readonly pagination = signal<PaginationResponse | null>(null);
  readonly page = signal(1);
  readonly query = signal('');
  readonly hasQuery = computed(() => this.query().trim().length > 0);
  readonly loading = signal(false);
  readonly failed = signal(false);
  readonly redirectToHome = signal(false);

  private readonly queryChanges = new Subject<{ value: string; epoch: number }>();
  private queryEpoch = 0;
  private requestId = 0;

  constructor() {
    this.queryChanges
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), takeUntilDestroyed(this.destroyRef))
      .subscribe(({ value, epoch }) => {
        if (epoch !== this.queryEpoch || value !== this.query()) {
          return;
        }
        this.loadPage(1);
      });

    this.auth.sessionReplacement$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.queryEpoch++;
        this.requestId++;
        this.products.set([]);
        this.pagination.set(null);
        this.page.set(1);
        this.query.set('');
        this.loading.set(false);
        this.load();
      });
  }

  load(): void {
    this.loadPage(1);
  }

  setQuery(value: string): void {
    if (value === this.query()) {
      return;
    }
    // Invalidate in-flight work and clear what the previous query rendered:
    // the page must not show old results under the new query while the
    // 300 ms debounce is pending.
    this.requestId++;
    this.query.set(value);
    this.page.set(1);
    this.pagination.set(null);
    this.products.set([]);
    this.queryChanges.next({ value, epoch: this.queryEpoch });
  }

  retry(): void {
    this.failed.set(false);
    this.loadPage(this.page());
  }

  previousPage(): void {
    const page = this.page();
    if (page > 1) {
      this.loadPage(page - 1);
    }
  }

  nextPage(): void {
    const pagination = this.pagination();
    if (pagination !== null && this.page() < pagination.totalPages) {
      this.loadPage(this.page() + 1);
    }
  }

  private loadPage(page: number): void {
    const userId = this.auth.currentSession?.user.id ?? null;
    const vendedorId = userId === null ? null : this.providerStore.read(userId);

    if (userId === null || vendedorId === null || vendedorId.length === 0) {
      this.requestId++;
      this.products.set([]);
      this.pagination.set(null);
      this.loading.set(false);
      this.failed.set(false);
      this.redirectToHome.set(true);
      return;
    }

    const requestId = ++this.requestId;
    this.page.set(page);
    this.loading.set(true);
    this.failed.set(false);
    this.redirectToHome.set(false);

    const query = this.query().trim().slice(0, MAX_SEARCH_QUERY_LENGTH);
    const request =
      query.length === 0
        ? this.catalogoGateway.list(vendedorId, page, PAGE_SIZE)
        : this.catalogoSearchGateway.search(query, vendedorId, page, PAGE_SIZE);

    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        if (requestId !== this.requestId) {
          return;
        }
        if (!this.isCurrentUser(userId)) {
          this.products.set([]);
          this.pagination.set(null);
          this.loading.set(false);
          return;
        }
        this.products.set([...response.data]);
        this.pagination.set(response.pagination);
        this.page.set(response.pagination.page);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        if (requestId !== this.requestId) {
          return;
        }
        if (!this.isCurrentUser(userId)) {
          this.products.set([]);
          this.pagination.set(null);
          this.loading.set(false);
          return;
        }
        if (isStaleProviderError(error)) {
          this.providerStore.clear(userId);
          this.products.set([]);
          this.pagination.set(null);
          this.loading.set(false);
          this.redirectToHome.set(true);
          return;
        }
        this.failed.set(true);
        this.loading.set(false);
      },
    });
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
