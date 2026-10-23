import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ClienteProviderResponse } from '@agua/contracts';
import { ClienteHomeFacade, ClienteSelectionError } from '../cliente-home.facade';

/**
 * Cliente home presentation. State and coordination live in
 * `ClienteHomeFacade`; this component renders it and forwards user actions.
 */
@Component({
  selector: 'app-cliente-page',
  imports: [RouterLink],
  templateUrl: './cliente-page.html',
  styleUrl: './cliente-page.scss',
  providers: [ClienteHomeFacade],
})
export class ClientePage {
  protected readonly vm = inject(ClienteHomeFacade);

  providerName(provider: ClienteProviderResponse): string {
    return provider.apellido ? `${provider.nombre} ${provider.apellido}` : provider.nombre;
  }

  isSelected(id: string): boolean {
    return this.vm.selectedProvider()?.id === id;
  }

  selectionErrorMessage(error: ClienteSelectionError): string {
    switch (error) {
      case ClienteSelectionError.FORBIDDEN:
        return 'No tienes permiso para seleccionar este proveedor.';
      case ClienteSelectionError.NOT_FOUND:
        return 'El proveedor ya no está asociado a tu cuenta.';
      case ClienteSelectionError.NETWORK:
        return 'No pudimos conectarnos. Revisa tu conexión e inténtalo de nuevo.';
      default:
        return 'No pudimos seleccionar el proveedor. Inténtalo de nuevo.';
    }
  }
}
