import { Component, effect, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import type { ProductResponse } from '@agua/contracts';
import { AuthService } from '../../../core/auth/auth.service';
import {
  ClienteCarritoFacade,
  ClienteCarritoFeedbackKind,
  type ClienteCarritoFeedback,
} from '../cliente-carrito.facade';
import { CLIENTE_CARRITO_GATEWAY } from '../cliente-carrito.gateway';
import { ClienteCarritoService } from '../cliente-carrito.service';
import { ClienteCatalogoFacade } from '../cliente-catalogo.facade';
import {
  CLIENTE_CATALOGO_GATEWAY,
  CLIENTE_CATALOGO_SEARCH_GATEWAY,
} from '../cliente-catalogo.gateway';
import { ClienteCatalogoService } from '../cliente-catalogo.service';
import { ClienteProviderStateService } from '../cliente-provider-state.service';
import { CLIENTE_PROVIDER_READER, CLIENTE_PROVIDER_STORE } from '../cliente-provider.store';
import { CLIENTE_SESSION_READER } from '../cliente-session.contract';

const CARRITO_FEEDBACK_MESSAGES: Record<ClienteCarritoFeedbackKind, string> = {
  [ClienteCarritoFeedbackKind.Added]: 'Producto agregado al carrito',
  [ClienteCarritoFeedbackKind.OutOfStock]: 'Producto sin stock o no disponible',
  [ClienteCarritoFeedbackKind.Forbidden]: 'No tenes permiso para agregar este producto',
  [ClienteCarritoFeedbackKind.Network]: 'No pudimos conectar con el servidor',
  [ClienteCarritoFeedbackKind.Unexpected]:
    'No pudimos agregar el producto. Inténtalo de nuevo en unos segundos.',
};

/**
 * Cliente provider catalog presentation. Catalog browse state lives in
 * `ClienteCatalogoFacade` and cart writes in `ClienteCarritoFacade`; this
 * component renders both, forwards retry and add actions, and leaves the
 * catalog when either facade detects a missing or stale provider.
 */
@Component({
  selector: 'app-cliente-catalogo-page',
  templateUrl: './cliente-catalogo-page.html',
  providers: [
    ClienteCatalogoFacade,
    ClienteCarritoFacade,
    { provide: CLIENTE_CATALOGO_GATEWAY, useExisting: ClienteCatalogoService },
    { provide: CLIENTE_CATALOGO_SEARCH_GATEWAY, useExisting: ClienteCatalogoService },
    { provide: CLIENTE_CARRITO_GATEWAY, useExisting: ClienteCarritoService },
    { provide: CLIENTE_PROVIDER_STORE, useExisting: ClienteProviderStateService },
    { provide: CLIENTE_PROVIDER_READER, useExisting: ClienteProviderStateService },
    { provide: CLIENTE_SESSION_READER, useExisting: AuthService },
  ],
})
export class ClienteCatalogoPage implements OnInit {
  protected readonly vm = inject(ClienteCatalogoFacade);
  protected readonly carrito = inject(ClienteCarritoFacade);
  private readonly router = inject(Router);
  private readonly priceFormatter = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });

  constructor() {
    effect(() => {
      if (this.vm.redirectToHome() || this.carrito.redirectToHome()) {
        void this.router.navigate(['/cliente']);
      }
    });
  }

  ngOnInit(): void {
    this.vm.load();
  }

  onSearchInput(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      this.vm.setQuery(target.value);
    }
  }

  addToCart(product: ProductResponse): void {
    this.carrito.addToCart(product);
  }

  feedbackMessage(feedback: ClienteCarritoFeedback | null): string {
    return feedback === null ? '' : CARRITO_FEEDBACK_MESSAGES[feedback.kind];
  }

  formatPrice(value: number): string {
    return this.priceFormatter.format(value);
  }
}
