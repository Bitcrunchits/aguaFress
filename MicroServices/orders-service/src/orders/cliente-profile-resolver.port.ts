import type { UserRole } from '@agua/contracts';

export const CLIENTE_PROFILE_RESOLVER_PORT = 'CLIENTE_PROFILE_RESOLVER_PORT';

export interface ClienteProfileResolverPort {
  resolveNamesByAuthUserIds(
    authUserIds: readonly string[],
    callerRole: UserRole,
  ): Promise<ReadonlyMap<string, { nombre: string; apellido?: string }>>;
}
