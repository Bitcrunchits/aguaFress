import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { randomUUID } from 'node:crypto';
import { catchError, firstValueFrom, throwError, timeout } from 'rxjs';
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
  private readonly timeoutMs = 5000;

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
      .send<{ providers: readonly { vendedorId: string }[]; defaultVendedorId?: string } | null>(
        'clientes.providers',
        payload,
      )
      .pipe(
        timeout(this.timeoutMs),
        catchError((err) => throwError(() => err)),
      );

    const result = await firstValueFrom(result$);

    if (!result?.providers?.length) {
      return [];
    }

    const vendedores = result.providers.map((p) => p.vendedorId);

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
