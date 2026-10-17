import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { randomUUID } from 'node:crypto';
import { firstValueFrom, timeout } from 'rxjs';
import { UserRole } from '@agua/contracts';
import { USUARIO_CLIENT } from './usuario-client.module';
import type { ClienteVendedorResolverPort } from './cliente-vendedor-resolver.port';

/**
 * Adaptador TCP del ClienteVendedorResolverPort.
 *
 * Llama a 'clientes.providers' en usuario-service, que exige
 * payload.user.role === 'cliente' y devuelve los providers activos.
 */
@Injectable()
export class TcpClienteVendedorResolverAdapter implements ClienteVendedorResolverPort {
  private readonly timeoutMs = 2500;

  constructor(@Inject(USUARIO_CLIENT) private readonly usuarioClient: ClientProxy) {}

  async resolveVendedoresByClienteUserId(authUserId: string): Promise<string[]> {
    const payload = {
      user: { sub: authUserId, userId: authUserId, role: UserRole.CLIENTE },
      body: {},
      query: {},
      params: {},
      requestId: randomUUID(),
    };

    const result$ = this.usuarioClient
      .send<unknown>(
        'clientes.providers',
        payload,
      )
      .pipe(
        timeout(this.timeoutMs),
      );

    const result = await firstValueFrom(result$);

    if (!isProvidersResponse(result)) {
      throw new ServiceUnavailableException('Cliente providers returned an invalid response');
    }
    const vendedores = result.providers.map((provider) => provider.id);

    // Si hay defaultVendedorId, ponerlo primero
    if (result.defaultVendedorId && vendedores.includes(result.defaultVendedorId)) {
      return [
        result.defaultVendedorId,
        ...vendedores.filter((id) => id !== result.defaultVendedorId),
      ];
    }

    return vendedores;
  }
}

interface ProviderResponse {
  readonly id: string;
}

interface ProvidersResponse {
  readonly providers: readonly ProviderResponse[];
  readonly defaultVendedorId?: string;
}

function isProvidersResponse(value: unknown): value is ProvidersResponse {
  if (typeof value !== 'object' || value === null || !('providers' in value) || !Array.isArray(value.providers)) return false;
  if (!value.providers.every((provider: unknown) => typeof provider === 'object' && provider !== null
    && 'id' in provider && typeof provider.id === 'string' && provider.id.trim() !== '')) return false;
  return !('defaultVendedorId' in value) || value.defaultVendedorId === undefined
    || (typeof value.defaultVendedorId === 'string' && value.defaultVendedorId.trim() !== '');
}
