/**
 * Puerto para resolver qué vendedores/proveedores tiene un cliente en cartera.
 * Mismo patrón DIP que VendedorProfileResolverPort.
 */
export const CLIENTE_VENDEDOR_RESOLVER_PORT = 'CLIENTE_VENDEDOR_RESOLVER_PORT';

export interface ClienteVendedorResolverPort {
  /**
   * Devuelve los vendedorId activos del cliente (via RELACION_CARTERA activa).
   * Si no tiene cartera activa o no es cliente, devuelve array vacío.
   */
  resolveVendedoresByClienteUserId(authUserId: string): Promise<string[]>;
}
