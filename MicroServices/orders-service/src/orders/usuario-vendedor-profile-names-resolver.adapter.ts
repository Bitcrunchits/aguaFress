import { Injectable, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { UserRole } from '@agua/contracts';
import type { VendedorProfileNamesResolverPort } from './vendedor-profile-names-resolver.port';

const DEFAULT_USUARIO_SERVICE_HOST = 'usuario-service';
const DEFAULT_USUARIO_SERVICE_TCP_PORT = 3011;
const DEFAULT_TCP_TIMEOUT_MS = 5000;

interface VendedorProfileNamesResponse {
  readonly [vendedorId: string]: { nombre: string; empresa?: string };
}

@Injectable()
export class UsuarioVendedorProfileNamesResolverAdapter implements VendedorProfileNamesResolverPort, OnModuleDestroy {
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

  async resolveNamesByIds(
    vendedorIds: readonly string[],
    callerRole: UserRole,
  ): Promise<ReadonlyMap<string, { nombre: string; empresa?: string }>> {
    const response = await firstValueFrom(
      this.client.send<VendedorProfileNamesResponse>('vendedores.resolve_profile_names', {
        body: { vendedorIds },
        user: { sub: 'orders-service', email: '', role: callerRole },
        requestId: `orders-service:vendedor-profile-names:${vendedorIds.length}`,
      }).pipe(timeout(this.tcpTimeoutMs)),
    );

    if (!isVendedorProfileNamesResponse(response)) {
      throw new ServiceUnavailableException('Vendedor profile names resolver returned an invalid response');
    }

    return new Map(Object.entries(response));
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.close();
  }
}

function isVendedorProfileNamesResponse(value: unknown): value is VendedorProfileNamesResponse {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  // An empty object is a valid empty result (no matching vendedor ids).
  if (keys.length === 0) {
    return true;
  }

  return keys.every((key) => {
    const entry = record[key];
    return typeof entry === 'object'
      && entry !== null
      && 'nombre' in entry
      && typeof entry.nombre === 'string'
      && entry.nombre.trim() !== '';
  });
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
