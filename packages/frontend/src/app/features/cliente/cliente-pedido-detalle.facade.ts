import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { Subscription } from 'rxjs';
import type { OrderResponse } from '@agua/contracts';
import { CLIENTE_PEDIDOS_DETAIL_GATEWAY } from './cliente-pedidos.gateway';
import {
  ClientePedidoDetalleError,
  classifyPedidoDetalleError,
} from './cliente-pedido-detalle-error';
import { CLIENTE_SESSION_READER } from './cliente-session.contract';
import { CLIENTE_SESSION_READINESS_READER } from './cliente-session-readiness.contract';

/**
 * Coordinates the cliente order detail.
 *
 * A session replacement discards the visible order and the in-flight request.
 * Readiness gates the reload: no request starts until the new session is
 * validated, and the last requested order id resumes at that point. Starting a
 * new load cancels the previous request, and responses from superseded order
 * ids are ignored.
 */
@Injectable()
export class ClientePedidoDetalleFacade {
  private readonly gateway = inject(CLIENTE_PEDIDOS_DETAIL_GATEWAY);
  private readonly session = inject(CLIENTE_SESSION_READER);
  private readonly sessionReadiness = inject(CLIENTE_SESSION_READINESS_READER);
  private readonly destroyRef = inject(DestroyRef);

  readonly order = signal<OrderResponse | null>(null);
  readonly loading = signal(false);
  readonly notFound = signal(false);
  readonly error = signal<ClientePedidoDetalleError | null>(null);

  private requestId = 0;
  private isSessionReady = false;
  private requestedOrderId: string | null = null;
  private inFlight: Subscription | null = null;

  constructor() {
    this.session.sessionReplacement$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.resetForSessionChange();
        if (this.isSessionReady && this.requestedOrderId !== null) {
          this.loadOrder(this.requestedOrderId);
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
        if (this.requestedOrderId !== null) {
          this.loadOrder(this.requestedOrderId);
        }
      });
  }

  loadOrder(orderId: string): void {
    this.requestedOrderId = orderId;
    if (!this.isSessionReady) {
      return;
    }

    this.cancelInFlight();
    const requestId = ++this.requestId;

    this.order.set(null);
    this.loading.set(true);
    this.notFound.set(false);
    this.error.set(null);

    this.inFlight = this.gateway
      .getOrder(orderId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (order) => {
          if (requestId !== this.requestId) {
            return;
          }
          this.inFlight = null;
          this.order.set(order);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          if (requestId !== this.requestId) {
            return;
          }
          this.inFlight = null;
          this.loading.set(false);
          const failure = classifyPedidoDetalleError(error);
          if (failure === ClientePedidoDetalleError.NotFound) {
            this.notFound.set(true);
            return;
          }
          this.error.set(failure);
        },
      });
  }

  private cancelInFlight(): void {
    this.inFlight?.unsubscribe();
    this.inFlight = null;
  }

  /** Discards the previous session view without issuing another request. */
  private resetForSessionChange(): void {
    this.cancelInFlight();
    this.requestId++;
    this.order.set(null);
    this.loading.set(false);
    this.notFound.set(false);
    this.error.set(null);
  }
}
