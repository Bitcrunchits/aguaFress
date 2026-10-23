import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { AddCartItemV2Request, ProductResponse } from '@agua/contracts';
import { CLIENTE_CARRITO_GATEWAY } from './cliente-carrito.gateway';
import { isStaleProviderError } from './cliente-provider-error';
import { CLIENTE_PROVIDER_READER } from './cliente-provider.store';
import { CLIENTE_SESSION_READER } from './cliente-session.contract';

/**
 * Typed add-to-cart outcomes. The page owns the Spanish copy; this facade
 * only exposes which outcome happened and which product triggered it.
 */
export enum ClienteCarritoFeedbackKind {
  Added = 'added',
  OutOfStock = 'out-of-stock',
  Forbidden = 'forbidden',
  Network = 'network',
  Unexpected = 'unexpected',
}

export interface ClienteCarritoFeedback {
  kind: ClienteCarritoFeedbackKind;
  productId: string;
}

/**
 * Coordinates the cart write: validates that the product is addable, scopes
 * the request to the stored provider, serializes adds, maps backend failures
 * to typed outcomes, and owns stale-provider recovery.
 */
@Injectable()
export class ClienteCarritoFacade {
  private readonly carritoGateway = inject(CLIENTE_CARRITO_GATEWAY);
  private readonly providerStore = inject(CLIENTE_PROVIDER_READER);
  private readonly session = inject(CLIENTE_SESSION_READER);
  private readonly destroyRef = inject(DestroyRef);

  readonly addingProductId = signal<string | null>(null);
  readonly feedback = signal<ClienteCarritoFeedback | null>(null);
  readonly redirectToHome = signal(false);

  private requestId = 0;

  constructor() {
    this.session.sessionReplacement$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.requestId++;
        this.addingProductId.set(null);
        this.feedback.set(null);
      });
  }

  /**
   * Adds exactly one unit of an available product. A single in-flight add
   * is allowed at a time, so double activation cannot duplicate the request.
   */
  addToCart(product: ProductResponse): void {
    if (this.addingProductId() !== null || !isAvailableToAdd(product)) {
      return;
    }

    const userId = this.session.currentSession?.user.id ?? null;
    const vendedorId = userId === null ? null : this.providerStore.read(userId);

    if (userId === null || vendedorId === null || vendedorId.length === 0) {
      this.redirectToHome.set(true);
      return;
    }

    if (product.vendedorId !== vendedorId) {
      this.redirectToHome.set(true);
      return;
    }

    const requestId = ++this.requestId;
    const request: AddCartItemV2Request = {
      vendedorId,
      productoId: product.id,
      cantidad: 1,
    };

    this.addingProductId.set(product.id);
    this.feedback.set(null);

    this.carritoGateway
      .addToCart(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          if (requestId !== this.requestId) {
            return;
          }
          if (!this.isCurrentUser(userId)) {
            this.addingProductId.set(null);
            this.feedback.set(null);
            return;
          }
          this.feedback.set({
            kind: ClienteCarritoFeedbackKind.Added,
            productId: product.id,
          });
          this.addingProductId.set(null);
        },
        error: (error: unknown) => {
          if (requestId !== this.requestId) {
            return;
          }
          if (!this.isCurrentUser(userId)) {
            this.addingProductId.set(null);
            this.feedback.set(null);
            return;
          }
          if (isStaleProviderError(error)) {
            this.providerStore.clear(userId);
            this.feedback.set(null);
            this.addingProductId.set(null);
            this.redirectToHome.set(true);
            return;
          }
          this.feedback.set({
            kind: mapCartError(error),
            productId: product.id,
          });
          this.addingProductId.set(null);
        },
      });
  }

  private isCurrentUser(userId: string): boolean {
    return this.session.currentSession?.user.id === userId;
  }
}

function isAvailableToAdd(product: ProductResponse): boolean {
  return product.activo && product.stock >= 1 && product.mostrarPrecio !== false;
}

function mapCartError(error: unknown): ClienteCarritoFeedbackKind {
  const status = error instanceof HttpErrorResponse ? error.status : -1;
  switch (status) {
    case 503:
      return ClienteCarritoFeedbackKind.OutOfStock;
    case 403:
      return ClienteCarritoFeedbackKind.Forbidden;
    case 0:
      return ClienteCarritoFeedbackKind.Network;
    default:
      return ClienteCarritoFeedbackKind.Unexpected;
  }
}
