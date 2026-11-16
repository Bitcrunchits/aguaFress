import type { UserRole } from '@agua/contracts';

export const VENDEDOR_PROFILE_NAMES_RESOLVER_PORT = 'VENDEDOR_PROFILE_NAMES_RESOLVER_PORT';

export interface VendedorProfileNamesResolverPort {
  resolveNamesByIds(
    vendedorIds: readonly string[],
    callerRole: UserRole,
  ): Promise<ReadonlyMap<string, { nombre: string; empresa?: string }>>;
}
