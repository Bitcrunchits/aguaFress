import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';
import type { CartResponse } from '@agua/contracts';

/** Cart read contract, independent from cart item mutations. */
export interface ClienteCarritoLecturaGateway {
  getCart(vendedorId: string): Observable<CartResponse | null>;
}

export const CLIENTE_CARRITO_LECTURA_GATEWAY =
  new InjectionToken<ClienteCarritoLecturaGateway>('CLIENTE_CARRITO_LECTURA_GATEWAY');
