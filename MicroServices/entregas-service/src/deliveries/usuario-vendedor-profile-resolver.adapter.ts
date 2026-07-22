import { Injectable, Inject, ServiceUnavailableException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { UserRole } from '@agua/contracts';
import { USUARIO_SERVICE_CLIENT } from '../common/tokens';
import type { VendedorProfileResolverPort } from './vendedor-profile-resolver.port';

const DEFAULT_TCP_TIMEOUT_MS = 5000;

interface ResolveVendedorProfileResponse {
  readonly vendedorId: string;
}

@Injectable()
export class UsuarioVendedorProfileResolverAdapter implements VendedorProfileResolverPort {
  private readonly tcpTimeoutMs: number;

  constructor(
    @Inject(USUARIO_SERVICE_CLIENT) private readonly client: ClientProxy,
  ) {
    this.tcpTimeoutMs = readPositiveIntegerEnv('TCP_TIMEOUT_MS', DEFAULT_TCP_TIMEOUT_MS);
  }

  async resolveVendedorIdByAuthUserId(authUserId: string): Promise<string> {
    const response = await firstValueFrom(
      this.client.send<ResolveVendedorProfileResponse>('vendedores.resolve_profile_id', {
        user: { sub: authUserId, email: '', role: UserRole.VENDEDOR },
        requestId: `entregas-service:vendedor-profile:${authUserId}`,
      }).pipe(timeout(this.tcpTimeoutMs)),
    );

    if (!isResolveVendedorProfileResponse(response)) {
      throw new ServiceUnavailableException('Vendedor profile resolver returned an invalid response');
    }

    return response.vendedorId;
  }
}

function isResolveVendedorProfileResponse(value: unknown): value is ResolveVendedorProfileResponse {
  return typeof value === 'object'
    && value !== null
    && 'vendedorId' in value
    && typeof value.vendedorId === 'string'
    && value.vendedorId.trim() !== '';
}

function readPositiveIntegerEnv(name: string, defaultValue: number): number {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    return defaultValue;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer`);
  }

  return parsed;
}
