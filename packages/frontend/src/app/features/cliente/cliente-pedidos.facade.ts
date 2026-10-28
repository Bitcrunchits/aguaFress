import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { OrderResponse } from '@agua/contracts';
import { CLIENTE_PEDIDOS_LIST_GATEWAY } from './cliente-pedidos.gateway';
import {
  ClientePedidosListError,
  classifyPedidosListError,
} from './cliente-pedidos-error';
import { CLIENTE_SESSION_READER } from './cliente-session.contract';
import { CLIENTE_SESSION_READINESS_READER } from './cliente-session-readiness.contract';

/**
 * Coordinates the cliente orders list.
 *
 * A session replacement discards the visible list and the in-flight request.
 * Readiness gates the reload: no request starts until the new session is
 * validated, and the last requested load resumes at that point. Responses
 * from superseded requests are ignored.
 */
@Injectable()
export class ClientePedidosFacade {
  private readonly gateway = inject(CLIENTE_PEDIDOS_LIST_GATEWAY);
  private readonly session = inject(CLIENTE_SESSION_READER);
  private readonly sessionReadiness = inject(CLIENTE_SESSION_READINESS_READER);
  private readonly destroyRef = inject(DestroyRef);

  readonly orders = signal<OrderResponse[]>([]);
  readonly loading = signal(false);
  readonly error = signal<ClientePedidosListError | null>(null);

  private ordersRequestId = 0;
  private isSessionReady = false;
  private loadRequested = false;

  constructor() {
    this.session.sessionReplacement$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.resetForSessionChange();
        if (this.isSessionReady && this.loadRequested) {
          this.loadOrders();
        }
      });

    this.sessionReadiness.sessionReady$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ready) => {
        if (!ready) {
          this.isSessionReady = false;
          this.resetForSessionChange();
          return;
        }
        if (this.isSessionReady) {
          return;
        }
        this.isSessionReady = true;
        if (this.loadRequested) {
          this.loadOrders();
        }
      });
  }

  loadOrders(): void {
    this.loadRequested = true;
    if (!this.isSessionReady) {
      return;
    }

    const requestId = ++this.ordersRequestId;
    this.loading.set(true);
    this.error.set(null);

    this.gateway
      .listOrders()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (orders) => {
          if (requestId !== this.ordersRequestId) {
            return;
          }
          this.orders.set([...orders]);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          if (requestId !== this.ordersRequestId) {
            return;
          }
          this.loading.set(false);
          this.error.set(classifyPedidosListError(error));
        },
      });
  }

  /** Discards the previous session view without issuing another request. */
  private resetForSessionChange(): void {
    this.ordersRequestId++;
    this.orders.set([]);
    this.loading.set(false);
    this.error.set(null);
  }
}
