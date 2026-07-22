export const VENDEDOR_PROFILE_RESOLVER_PORT = 'VENDEDOR_PROFILE_RESOLVER_PORT';

export interface VendedorProfileResolverPort {
  resolveVendedorIdByAuthUserId(authUserId: string): Promise<string>;
}
