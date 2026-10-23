import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  ClienteProvidersResponse,
  SelectClienteProviderRequest,
  SelectClienteProviderResponse,
} from '@agua/contracts';
import { API_CONFIG } from '../../core/config/api.config';

const PROVIDERS_URL = `${API_CONFIG.baseUrl}/api/v1/clientes/providers`;
const SELECT_PROVIDER_URL = `${PROVIDERS_URL}/select`;

/**
 * Cliente provider endpoints against the gateway `clientes.providers`
 * actions. The backend reads the cliente identity from the JWT and returns
 * the response DTO directly (no `{ data }` envelope), so no query mirroring
 * or identity fields are sent.
 */
@Injectable({ providedIn: 'root' })
export class ClienteProvidersService {
  private readonly http = inject(HttpClient);

  listProviders(): Observable<ClienteProvidersResponse> {
    return this.http.get<ClienteProvidersResponse>(PROVIDERS_URL);
  }

  selectProvider(vendedorId: string): Observable<SelectClienteProviderResponse> {
    const body: SelectClienteProviderRequest = { vendedorId };
    return this.http.post<SelectClienteProviderResponse>(SELECT_PROVIDER_URL, body);
  }
}
