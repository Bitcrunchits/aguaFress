/**
 * Delivery draft captured by the checkout form and submitted by the cart
 * page. Kept as an independent contract so presentation components never
 * depend on an injectable facade just to name their output type.
 */
export interface ClientePedidoDraft {
  readonly calle: string;
  readonly numero: string;
  readonly pisoDepto?: string;
  readonly referencia?: string;
  readonly barrio?: string;
  readonly ciudad?: string;
  readonly provincia?: string;
  readonly codigoPostal?: string;
  readonly observaciones?: string;
}
