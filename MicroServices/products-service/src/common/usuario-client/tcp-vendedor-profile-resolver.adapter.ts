import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { randomUUID } from 'node:crypto';
import { catchError, firstValueFrom, throwError, timeout } from 'rxjs';
import { UserRole } from '@agua/contracts';
import { USUARIO_CLIENT } from './usuario-client.module';
import type { VendedorProfileResolverPort } from './vendedor-profile-resolver.port';

/**
 * Adaptador TCP del VendedorProfileResolverPort.
 *
 * Confirmado contra usuario-service/src/tcp/usuario-domain-tcp.controller.ts:
 *
 *   @MessagePattern('vendedores.resolve_profile_id')
 *   async resolveVendedorProfileId(@Payload() payload: TcpPayload) {
 *     this.payloadAdapter.requireRole(payload, UserRole.VENDEDOR);
 *     const vendedorId = await this.vendedorResolver.resolve(this.payloadAdapter.userId(payload));
 *     return { vendedorId };
 *   }
 *
 * El handler exige `payload.user.role === 'vendedor'` (via requireRole) y usa
 * `payload.user.sub`/`userId` para la búsqueda — por eso acá se reenvía un
 * `user` completo, no solo el id. `role: VENDEDOR` se fija en duro porque
 * este método SOLO se llama desde puntos donde el caller ya validó el rol
 * (ProductsTcpController hace `requireRole(payload, UserRole.VENDEDOR)`
 * antes de invocar esto).
 */
@Injectable()
export class TcpVendedorProfileResolverAdapter implements VendedorProfileResolverPort {
  private readonly timeoutMs = 5000;

  constructor(@Inject(USUARIO_CLIENT) private readonly usuarioClient: ClientProxy) {}

  async resolveVendedorIdByAuthUserId(authUserId: string): Promise<string> {
    const payload = {
      user: { sub: authUserId, userId: authUserId, role: UserRole.VENDEDOR },
      body: {},
      query: {},
      params: {},
      requestId: randomUUID(),
    };

    const result$ = this.usuarioClient
      .send<{ vendedorId: string } | null>('vendedores.resolve_profile_id', payload)
      .pipe(
        timeout(this.timeoutMs),
        catchError((err) => throwError(() => err)),
      );

    const result = await firstValueFrom(result$);

    if (!result?.vendedorId) {
      throw new NotFoundException('Vendedor profile not found');
    }

    return result.vendedorId;
  }
}
