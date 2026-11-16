import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, map, of } from 'rxjs';
import type { Observable } from 'rxjs';
import type { OrderResponse } from '@agua/contracts';
import { CLIENTE_PEDIDO_REPEAT_GATEWAY } from './cliente-pedido-repeat.gateway';
import {
  ClienteCarritoFailure,
  classifyCartMutationFailure,
} from './cliente-carrito-error';
import { ClienteProviderSelectionService } from './cliente-provider-selection.service';
import { CLIENTE_SESSION_READER } from './cliente-session.contract';

type OrderItem = OrderResponse['items'][number];

/** Per-item repeat outcome. The page owns the Spanish copy. */
export enum ClientePedidoRepeatOutcome {
  Added = 'added',
  OutOfStock = 'out-of-stock',
  Forbidden = 'forbidden',
  Network = 'network',
  Unexpected = 'unexpected',
}

export interface ClientePedidoRepeatItemResult {
  productoId: string;
  nombre: string;
  cantidad: number;
  outcome: ClientePedidoRepeatOutcome;
}

/**
 * Coordinates repeating an order: persists the order's provider, re-adds every
 * item through `cart.items/add`, and reports per-item outcomes. Once every
 * item was re-added, `navigateToCart` flips and the page leaves for the cart.
 */
@Injectable()
export class ClientePedidoRepeatFacade {
  private readonly gateway = inject(CLIENTE_PEDIDO_REPEAT_GATEWAY);
  private readonly providerSelection = inject(ClienteProviderSelectionService);
  private readonly session = inject(CLIENTE_SESSION_READER);
  private readonly destroyRef = inject(DestroyRef);

  readonly repeating = signal(false);
  readonly completed = signal(false);
  readonly results = signal<ClientePedidoRepeatItemResult[]>([]);

  readonly failedResults = computed(() =>
    this.results().filter((result) => result.outcome !== ClientePedidoRepeatOutcome.Added),
  );

  readonly navigateToCart = computed(
    () => this.completed() && this.results().length > 0 && this.failedResults().length === 0,
  );

  private requestId = 0;

  constructor() {
    this.session.sessionReplacement$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.reset());
  }

  repeatOrder(order: OrderResponse): void {
    if (this.repeating() || order.items.length === 0) {
      return;
    }

    const userId = this.session.currentSession?.user.id ?? null;
    this.providerSelection.remember(userId, order.vendedorId);

    const requestId = ++this.requestId;
    this.repeating.set(true);
    this.completed.set(false);
    this.results.set([]);

    forkJoin(order.items.map((item) => this.addItem(item, order.vendedorId)))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((results) => {
        if (requestId !== this.requestId) {
          return;
        }
        this.results.set(results);
        this.completed.set(true);
        this.repeating.set(false);
      });
  }

  private addItem(
    item: OrderItem,
    vendedorId: string,
  ): Observable<ClientePedidoRepeatItemResult> {
    return this.gateway
      .addItem({
        vendedorId,
        productoId: item.productId,
        cantidad: item.cantidad,
      })
      .pipe(
        map(
          (): ClientePedidoRepeatItemResult => ({
            productoId: item.productId,
            nombre: item.nombre,
            cantidad: item.cantidad,
            outcome: ClientePedidoRepeatOutcome.Added,
          }),
        ),
        catchError(
          (error: unknown): Observable<ClientePedidoRepeatItemResult> =>
            of({
              productoId: item.productId,
              nombre: item.nombre,
              cantidad: item.cantidad,
              outcome: mapCartFailure(error),
            }),
        ),
      );
  }

  private reset(): void {
    this.requestId++;
    this.repeating.set(false);
    this.completed.set(false);
    this.results.set([]);
  }
}

function mapCartFailure(error: unknown): ClientePedidoRepeatOutcome {
  switch (classifyCartMutationFailure(error)) {
    case ClienteCarritoFailure.OutOfStock:
      return ClientePedidoRepeatOutcome.OutOfStock;
    case ClienteCarritoFailure.Forbidden:
      return ClientePedidoRepeatOutcome.Forbidden;
    case ClienteCarritoFailure.Network:
      return ClientePedidoRepeatOutcome.Network;
    default:
      return ClientePedidoRepeatOutcome.Unexpected;
  }
}
