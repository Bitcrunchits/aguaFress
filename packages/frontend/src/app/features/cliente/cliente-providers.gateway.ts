import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type { ClienteProvidersResponse } from '@agua/contracts';

/**
 * Provider-list read contract consumed by the cliente facades. The concrete
 * HTTP service is bound to this token at the page boundary, so facades depend
 * on the abstraction rather than a concrete implementation.
 */
export interface ClienteProvidersGateway {
  listProviders(): Observable<ClienteProvidersResponse>;
}

export const CLIENTE_PROVIDERS_GATEWAY = new InjectionToken<ClienteProvidersGateway>(
  'CLIENTE_PROVIDERS_GATEWAY',
);
