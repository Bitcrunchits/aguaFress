import { Component, inject } from '@angular/core';
import type { ClienteProviderResponse } from '@agua/contracts';
import { ClienteHomeFacade } from '../cliente-home.facade';

/**
 * Cliente home presentation. State and coordination live in
 * `ClienteHomeFacade`; this component renders it and forwards user actions.
 */
@Component({
  selector: 'app-cliente-page',
  templateUrl: './cliente-page.html',
  styleUrl: './cliente-page.scss',
  providers: [ClienteHomeFacade],
})
export class ClientePage {
  protected readonly vm = inject(ClienteHomeFacade);

  providerName(provider: ClienteProviderResponse): string {
    return provider.apellido ? `${provider.nombre} ${provider.apellido}` : provider.nombre;
  }
}
