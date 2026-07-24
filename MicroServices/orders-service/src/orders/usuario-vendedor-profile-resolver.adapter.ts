import { Injectable, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { UserRole } from '@agua/contracts';
import type { VendedorProfileResolverPort } from './vendedor-profile-resolver.port';

const DEFAULT_USUARIO_SERVICE_HOST = 'usuario-service';
const DEFAULT_USUARIO_SERVICE_TCP_PORT = 3011;
const DEFAULT_TCP_TIMEOUT_MS = 5000;

interface ResolveVendedorProfileResponse {
  readonly vendedorId: string;
}

@Injectable()
export class UsuarioVendedorProfileResolverAdapter implements VendedorProfileResolverPort, OnModuleDestroy {
  private readonly client: ClientProxy;
  private readonly tcpTimeoutMs: number;

  constructor() {
    this.client = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: {
        host: readStringEnv('USUARIO_SERVICE_HOST', DEFAULT_USUARIO_SERVICE_HOST),
        port: readPositiveIntegerEnv('USUARIO_SERVICE_TCP_PORT', DEFAULT_USUARIO_SERVICE_TCP_PORT),
      },
    });
    this.tcpTimeoutMs = readPositiveIntegerEnv('TCP_TIMEOUT_MS', DEFAULT_TCP_TIMEOUT_MS);
  }

  async resolveVendedorIdByAuthUserId(authUserId: string): Promise<string> {
    const response = await firstValueFrom(
      this.client.send<ResolveVendedorProfileResponse>('vendedores.resolve_profile_id', {
        user: { sub: authUserId, email: '', role: UserRole.VENDEDOR },
        requestId: `orders-service:vendedor-profile:${authUserId}`,
      }).pipe(timeout(this.tcpTimeoutMs)),
    );

    if (!isResolveVendedorProfileResponse(response)) {
      throw new ServiceUnavailableException('Vendedor profile resolver returned an invalid response');
    }

    return response.vendedorId;
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.close();
  }
}

function isResolveVendedorProfileResponse(value: unknown): value is ResolveVendedorProfileResponse {
  return typeof value === 'object'
    && value !== null
    && 'vendedorId' in value
    && typeof value.vendedorId === 'string'
    && value.vendedorId.trim() !== '';
}

function readStringEnv(name: string, defaultValue: string): string {
  const value = process.env[name];
  return value === undefined || value.trim() === '' ? defaultValue : value;
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
