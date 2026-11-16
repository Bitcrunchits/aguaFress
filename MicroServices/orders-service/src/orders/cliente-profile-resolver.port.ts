import type { UserRole } from '@agua/contracts';

/** Scoped variant: resolution keyed by the caller vendor's auth identity. */
export const SCOPED_CLIENTE_PROFILE_RESOLVER_PORT = 'SCOPED_CLIENTE_PROFILE_RESOLVER_PORT';

export interface ClienteProfileResolverPort {
  resolveNamesByAuthUserIds(
    authUserIds: readonly string[],
    callerRole: UserRole,
  ): Promise<ReadonlyMap<string, { nombre: string; apellido?: string }>>;
}

/**
 * OCP: extends the base contract with a caller-identity-aware resolution that
 * lets usuario-service scope results to the caller vendor's active cartera.
 */
export interface ScopedClienteProfileResolverPort extends ClienteProfileResolverPort {
  resolveScopedNamesByAuthUserIds(
    authUserIds: readonly string[],
    callerRole: UserRole,
    callerUserId: string,
  ): Promise<ReadonlyMap<string, { nombre: string; apellido?: string }>>;
}
