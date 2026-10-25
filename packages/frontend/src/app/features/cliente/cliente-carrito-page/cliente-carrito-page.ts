import { Component, computed, effect, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { CartItemResponse } from '@agua/contracts';
import { AuthService } from '../../../core/auth/auth.service';
import { ClienteCheckoutForm } from '../cliente-checkout-form/cliente-checkout-form';
import {
  ClienteCarritoDetalleFacade,
  ClienteCarritoDetalleFeedbackKind,
  type ClienteCarritoDetalleFeedback,
} from '../cliente-carrito-detalle.facade';
import { CLIENTE_CARRITO_EDICION_GATEWAY } from '../cliente-carrito-edicion.gateway';
import { CLIENTE_CARRITO_LECTURA_GATEWAY } from '../cliente-carrito-lectura.gateway';
import { ClienteCarritoEdicionService } from '../cliente-carrito-edicion.service';
import { ClienteCarritoLecturaService } from '../cliente-carrito-lectura.service';
import type { ClientePedidoDraft } from '../cliente-pedido-draft.contract';
import { ClientePedidoFacade } from '../cliente-pedido.facade';
import { CLIENTE_PEDIDO_GATEWAY } from '../cliente-pedido.gateway';
import { ClientePedidoService } from '../cliente-pedido.service';
import { ClienteProviderStateService } from '../cliente-provider-state.service';
import { CLIENTE_PROVIDER_READER } from '../cliente-provider.store';
import { CLIENTE_SESSION_READER } from '../cliente-session.contract';
import { CLIENTE_SESSION_READINESS_READER } from '../cliente-session-readiness.contract';

const CART_FEEDBACK_MESSAGES: Record<ClienteCarritoDetalleFeedbackKind, string> = {
  [ClienteCarritoDetalleFeedbackKind.Updated]: 'Cantidad actualizada',
  [ClienteCarritoDetalleFeedbackKind.Removed]: 'Producto eliminado del carrito',
  [ClienteCarritoDetalleFeedbackKind.OutOfStock]: 'Producto sin stock o no disponible',
  [ClienteCarritoDetalleFeedbackKind.Forbidden]: 'No tienes permiso para modificar este carrito',
  [ClienteCarritoDetalleFeedbackKind.CartChanged]: 'El carrito cambió. Actualizamos los datos.',
  [ClienteCarritoDetalleFeedbackKind.Network]: 'No pudimos conectar con el servidor',
  [ClienteCarritoDetalleFeedbackKind.Unexpected]:
    'No pudimos actualizar el carrito. Inténtalo de nuevo en unos segundos.',
};

/**
 * Cart presentation. Cart state lives in `ClienteCarritoDetalleFacade` and
 * confirmation in `ClientePedidoFacade`; the delivery form is its own
 * component. This page forwards user actions and leaves the screen when
 * either facade detects a lost provider scope.
 */
@Component({
  selector: 'app-cliente-carrito-page',
  imports: [RouterLink, ClienteCheckoutForm],
  templateUrl: './cliente-carrito-page.html',
  styleUrl: './cliente-carrito-page.scss',
  providers: [
    ClienteCarritoDetalleFacade,
    ClientePedidoFacade,
    { provide: CLIENTE_CARRITO_LECTURA_GATEWAY, useExisting: ClienteCarritoLecturaService },
    { provide: CLIENTE_CARRITO_EDICION_GATEWAY, useExisting: ClienteCarritoEdicionService },
    { provide: CLIENTE_PEDIDO_GATEWAY, useExisting: ClientePedidoService },
    { provide: CLIENTE_PROVIDER_READER, useExisting: ClienteProviderStateService },
    { provide: CLIENTE_SESSION_READER, useExisting: AuthService },
    { provide: CLIENTE_SESSION_READINESS_READER, useExisting: AuthService },
  ],
})
export class ClienteCarritoPage {
  protected readonly vm = inject(ClienteCarritoDetalleFacade);
  protected readonly pedido = inject(ClientePedidoFacade);
  /** Once a confirmation starts, or an order is accepted, the cart is frozen. */
  protected readonly cartLocked = computed(
    () => this.pedido.submitting() || this.pedido.accepted() !== null,
  );
  private readonly router = inject(Router);
  private readonly priceFormatter = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });

  constructor() {
    effect(() => {
      if (this.vm.redirectToHome() || this.pedido.redirectToHome()) {
        void this.router.navigate(['/cliente']);
      }
    });
  }

  increaseQuantity(item: CartItemResponse): void {
    if (!this.cartMutationAllowed()) {
      return;
    }
    this.vm.increaseQuantity(item);
  }

  decreaseQuantity(item: CartItemResponse): void {
    if (!this.cartMutationAllowed()) {
      return;
    }
    this.vm.decreaseQuantity(item);
  }

  removeItem(item: CartItemResponse): void {
    if (!this.cartMutationAllowed()) {
      return;
    }
    this.vm.removeItem(item);
  }

  confirmOrder(draft: ClientePedidoDraft): void {
    const cart = this.vm.cart();
    if (cart === null || this.vm.mutatingProductId() !== null || this.pedido.submitting()) {
      return;
    }

    // Submit against the provider of the cart on screen, not whatever the
    // stored selection points to by the time the request is built.
    this.pedido.submit(draft, cart.vendedorId);
  }

  cartFeedbackMessage(feedback: ClienteCarritoDetalleFeedback | null): string {
    return feedback === null ? '' : CART_FEEDBACK_MESSAGES[feedback.kind];
  }

  formatPrice(value: number): string {
    return this.priceFormatter.format(value);
  }

  /** A confirmation in flight, or an accepted order, owns the cart. */
  private cartMutationAllowed(): boolean {
    return !this.cartLocked();
  }
}
