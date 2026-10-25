import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { CartItemResponse, CartResponse } from '@agua/contracts';
import { CLIENTE_CARRITO_EDICION_GATEWAY } from './cliente-carrito-edicion.gateway';
import { CLIENTE_CARRITO_LECTURA_GATEWAY } from './cliente-carrito-lectura.gateway';
import {
  ClienteCarritoFailure,
  classifyCartMutationFailure,
  classifyCartReadFailure,
} from './cliente-carrito-error';
import { CLIENTE_PROVIDER_READER } from './cliente-provider.store';
import { CLIENTE_SESSION_READER } from './cliente-session.contract';
import { CLIENTE_SESSION_READINESS_READER } from './cliente-session-readiness.contract';

/** Typed cart-screen outcomes. The page owns the Spanish copy. */
export enum ClienteCarritoDetalleFeedbackKind {
  Updated = 'updated',
  Removed = 'removed',
  OutOfStock = 'out-of-stock',
  Forbidden = 'forbidden',
  CartChanged = 'cart-changed',
  Network = 'network',
  Unexpected = 'unexpected',
}

export interface ClienteCarritoDetalleFeedback {
  readonly kind: ClienteCarritoDetalleFeedbackKind;
  readonly productId: string;
}

/**
 * Coordinates the cart screen: resolves the stored provider, loads the
 * active cart, and applies quantity updates and removals.
 *
 * One mutation is in flight at a time, and every response is validated
 * against the request generation and the current session, so a stale or
 * cross-session response cannot overwrite the visible cart.
 */
@Injectable()
export class ClienteCarritoDetalleFacade {
  private readonly lecturaGateway = inject(CLIENTE_CARRITO_LECTURA_GATEWAY);
  private readonly edicionGateway = inject(CLIENTE_CARRITO_EDICION_GATEWAY);
  private readonly providerStore = inject(CLIENTE_PROVIDER_READER);
  private readonly session = inject(CLIENTE_SESSION_READER);
  private readonly sessionReadiness = inject(CLIENTE_SESSION_READINESS_READER);
  private readonly destroyRef = inject(DestroyRef);

  readonly cart = signal<CartResponse | null>(null);
  readonly loading = signal(false);
  readonly failed = signal(false);
  readonly mutatingProductId = signal<string | null>(null);
  readonly feedback = signal<ClienteCarritoDetalleFeedback | null>(null);
  readonly redirectToHome = signal(false);
  readonly isEmpty = computed(() => (this.cart()?.items.length ?? 0) === 0);

  private requestId = 0;
  private mutationToken = 0;

  constructor() {
    // A replacement session is not usable until the restore refreshes and
    // profile-validates it, so discard the previous session's state now and
    // request the cart only once readiness settles again.
    this.sessionReadiness.sessionReady$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ready) => {
        if (!ready) {
          this.resetForSessionChange();
          return;
        }
        this.load();
      });
  }

  load(): void {
    const scope = this.readScope();
    if (scope === null) {
      this.resetForRedirect();
      return;
    }

    const requestId = ++this.requestId;
    this.loading.set(true);
    this.failed.set(false);

    this.lecturaGateway
      .getCart(scope.vendedorId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cart) => {
          if (requestId !== this.requestId || !this.isCurrentUser(scope.userId)) {
            return;
          }
          this.cart.set(cart);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          if (requestId !== this.requestId || !this.isCurrentUser(scope.userId)) {
            return;
          }
          this.loading.set(false);
          if (classifyCartReadFailure(error) === ClienteCarritoFailure.ProviderLost) {
            this.providerStore.clear(scope.userId);
            this.resetForRedirect();
            return;
          }
          this.failed.set(true);
        },
      });
  }

  retry(): void {
    this.failed.set(false);
    this.load();
  }

  increaseQuantity(item: CartItemResponse): void {
    this.changeQuantity(item, 1);
  }

  decreaseQuantity(item: CartItemResponse): void {
    this.changeQuantity(item, -1);
  }

  removeItem(item: CartItemResponse): void {
    const scope = this.mutationScope();
    const cart = this.cart();
    if (scope === null || cart === null) {
      return;
    }

    const requestId = ++this.requestId;
    const mutationToken = ++this.mutationToken;
    this.mutatingProductId.set(item.productoId);
    this.feedback.set(null);

    this.edicionGateway
      .deleteItem({
        cartId: cart.id,
        vendedorId: scope.vendedorId,
        productoId: item.productoId,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          if (!this.settleMutation(mutationToken, requestId, scope.userId)) {
            return;
          }
          this.cart.set(updated);
          this.feedback.set({
            kind: ClienteCarritoDetalleFeedbackKind.Removed,
            productId: item.productoId,
          });
        },
        error: (error: unknown) => {
          if (!this.settleMutation(mutationToken, requestId, scope.userId)) {
            return;
          }
          this.handleMutationFailure(scope.userId, item.productoId, error);
        },
      });
  }

  private changeQuantity(item: CartItemResponse, delta: number): void {
    const nextQuantity = item.cantidad + delta;
    if (nextQuantity < 1) {
      return;
    }
    this.updateQuantity(item, nextQuantity);
  }

  private updateQuantity(item: CartItemResponse, cantidad: number): void {
    const scope = this.mutationScope();
    const cart = this.cart();
    if (scope === null || cart === null) {
      return;
    }

    const requestId = ++this.requestId;
    const mutationToken = ++this.mutationToken;
    this.mutatingProductId.set(item.productoId);
    this.feedback.set(null);

    this.edicionGateway
      .updateItem({
        cartId: cart.id,
        vendedorId: scope.vendedorId,
        productoId: item.productoId,
        cantidad,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          if (!this.settleMutation(mutationToken, requestId, scope.userId)) {
            return;
          }
          this.cart.set(updated);
          this.feedback.set({
            kind: ClienteCarritoDetalleFeedbackKind.Updated,
            productId: item.productoId,
          });
        },
        error: (error: unknown) => {
          if (!this.settleMutation(mutationToken, requestId, scope.userId)) {
            return;
          }
          this.handleMutationFailure(scope.userId, item.productoId, error);
        },
      });
  }

  /**
   * Releases the mutation lock only for the mutation that owns it and reports
   * whether its result still applies. A read that superseded the mutation may
   * hold a pre-mutation snapshot, so a stale settlement reloads the cart
   * instead of leaving the screen with stale quantities.
   */
  private settleMutation(mutationToken: number, requestId: number, userId: string): boolean {
    if (mutationToken !== this.mutationToken) {
      return false;
    }

    this.mutatingProductId.set(null);

    if (!this.isCurrentUser(userId) || this.redirectToHome()) {
      return false;
    }

    if (requestId !== this.requestId) {
      this.load();
      return false;
    }

    return true;
  }

  private handleMutationFailure(userId: string, productId: string, error: unknown): void {
    const failure = classifyCartMutationFailure(error);

    if (failure === ClienteCarritoFailure.ProviderLost) {
      this.providerStore.clear(userId);
      this.resetForRedirect();
      return;
    }

    this.feedback.set({ kind: toFeedbackKind(failure), productId });

    // The backend and the screen disagree about the cart (removed item, or a
    // stock change that invalidated the line): reload instead of guessing.
    if (failure === ClienteCarritoFailure.CartDrift || failure === ClienteCarritoFailure.OutOfStock) {
      this.load();
    }
  }

  /**
   * Mutations require a loaded cart for the stored provider. A provider that
   * no longer matches the loaded cart means the selection changed underneath
   * the screen, so the safe move is to leave for the home.
   */
  private mutationScope(): { userId: string; vendedorId: string } | null {
    const scope = this.readScope();
    if (scope === null) {
      this.resetForRedirect();
      return null;
    }

    if (this.mutatingProductId() !== null) {
      return null;
    }

    const cart = this.cart();
    if (cart === null) {
      return null;
    }

    if (cart.vendedorId !== scope.vendedorId) {
      this.resetForRedirect();
      return null;
    }

    return scope;
  }

  private readScope(): { userId: string; vendedorId: string } | null {
    const userId = this.session.currentSession?.user.id ?? null;
    if (userId === null) {
      return null;
    }
    const vendedorId = this.providerStore.read(userId);
    if (vendedorId === null || vendedorId.length === 0) {
      return null;
    }
    return { userId, vendedorId };
  }

  private resetForSessionChange(): void {
    this.requestId++;
    this.mutationToken++;
    this.cart.set(null);
    this.loading.set(false);
    this.failed.set(false);
    this.mutatingProductId.set(null);
    this.feedback.set(null);
  }

  private resetForRedirect(): void {
    this.requestId++;
    this.mutationToken++;
    this.cart.set(null);
    this.loading.set(false);
    this.failed.set(false);
    this.mutatingProductId.set(null);
    this.feedback.set(null);
    this.redirectToHome.set(true);
  }

  private isCurrentUser(userId: string): boolean {
    return this.session.currentSession?.user.id === userId;
  }
}

function toFeedbackKind(failure: ClienteCarritoFailure): ClienteCarritoDetalleFeedbackKind {
  switch (failure) {
    case ClienteCarritoFailure.CartDrift:
      return ClienteCarritoDetalleFeedbackKind.CartChanged;
    case ClienteCarritoFailure.OutOfStock:
      return ClienteCarritoDetalleFeedbackKind.OutOfStock;
    case ClienteCarritoFailure.Forbidden:
      return ClienteCarritoDetalleFeedbackKind.Forbidden;
    case ClienteCarritoFailure.Network:
      return ClienteCarritoDetalleFeedbackKind.Network;
    case ClienteCarritoFailure.ProviderLost:
    case ClienteCarritoFailure.Unexpected:
      return ClienteCarritoDetalleFeedbackKind.Unexpected;
  }
}
