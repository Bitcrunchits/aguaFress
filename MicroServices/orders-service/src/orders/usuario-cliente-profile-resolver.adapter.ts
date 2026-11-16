import { Injectable, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { UserRole } from '@agua/contracts';
import type { ClienteProfileResolverPort } from './cliente-profile-resolver.port';

const DEFAULT_USUARIO_SERVICE_HOST = 'usuario-service';
const DEFAULT_USUARIO_SERVICE_TCP_PORT = 3011;
const DEFAULT_TCP_TIMEOUT_MS = 5000;

interface ClienteProfileNamesResponse {
  readonly [authUserId: string]: { nombre: string; apellido?: string };
}

@Injectable()
export class UsuarioClienteProfileResolverAdapter implements ClienteProfileResolverPort, OnModuleDestroy {
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

  async resolveNamesByAuthUserIds(
    authUserIds: readonly string[],
    callerRole: UserRole,
  ): Promise<ReadonlyMap<string, { nombre: string; apellido?: string }>> {
    const response = await firstValueFrom(
      this.client.send<ClienteProfileNamesResponse>('clientes.resolve_profile_names', {
        body: { authUserIds },
        user: { sub: 'orders-service', email: '', role: callerRole },
        requestId: `orders-service:cliente-profile-names:${authUserIds.length}`,
      }).pipe(timeout(this.tcpTimeoutMs)),
    );

    if (!isClienteProfileNamesResponse(response)) {
      throw new ServiceUnavailableException('Cliente profile resolver returned an invalid response');
    }

    return new Map(Object.entries(response));
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.close();
  }
}

function isClienteProfileNamesResponse(value: unknown): value is ClienteProfileNamesResponse {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length === 0) {
    return false;
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
