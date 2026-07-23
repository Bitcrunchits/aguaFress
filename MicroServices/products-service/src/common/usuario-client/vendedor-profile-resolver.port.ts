/**
 * Puerto para resolver el vendedorId real (VENDEDOR.id) a partir del
 * authUserId (AUTH_USER.id / JWT sub). Mismo patrón que usa orders-service
 * (VENDEDOR_PROFILE_RESOLVER_PORT + VendedorProfileResolverPort) — se
 * replica acá para mantener consistencia entre microservicios.
 *
 * La implementación concreta (TCP hacia usuario-service) vive en
 * tcp-vendedor-profile-resolver.adapter.ts. Este archivo solo define el
 * contrato, para que ProductsTcpController dependa de una abstracción
 * (DIP) y no de los detalles de transporte.
 */
export const VENDEDOR_PROFILE_RESOLVER_PORT = 'VENDEDOR_PROFILE_RESOLVER_PORT';

export interface VendedorProfileResolverPort {
  resolveVendedorIdByAuthUserId(authUserId: string): Promise<string>;
}
