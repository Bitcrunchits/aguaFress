import { Component, effect, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ClienteCatalogoFacade } from '../cliente-catalogo.facade';
import {
  CLIENTE_CATALOGO_GATEWAY,
  CLIENTE_CATALOGO_SEARCH_GATEWAY,
} from '../cliente-catalogo.gateway';
import { ClienteCatalogoService } from '../cliente-catalogo.service';
import { ClienteProviderStateService } from '../cliente-provider-state.service';
import { CLIENTE_PROVIDER_STORE } from '../cliente-provider.store';

/**
 * Cliente provider catalog presentation. State and coordination live in
 * `ClienteCatalogoFacade`; this component renders it, forwards retry, and
 * leaves the catalog when the facade detects a missing or stale provider.
 */
@Component({
  selector: 'app-cliente-catalogo-page',
  templateUrl: './cliente-catalogo-page.html',
  providers: [
    ClienteCatalogoFacade,
    { provide: CLIENTE_CATALOGO_GATEWAY, useExisting: ClienteCatalogoService },
    { provide: CLIENTE_CATALOGO_SEARCH_GATEWAY, useExisting: ClienteCatalogoService },
    { provide: CLIENTE_PROVIDER_STORE, useExisting: ClienteProviderStateService },
  ],
})
export class ClienteCatalogoPage implements OnInit {
  protected readonly vm = inject(ClienteCatalogoFacade);
  private readonly router = inject(Router);
  private readonly priceFormatter = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });

  constructor() {
    effect(() => {
      if (this.vm.redirectToHome()) {
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

  formatPrice(value: number): string {
    return this.priceFormatter.format(value);
  }
}
