import { Injectable, Inject, GatewayTimeoutException, Logger } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { catchError, firstValueFrom, throwError, timeout, type Observable } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { USUARIO_CLIENT } from './tcp-clients.module';
import type { ActionMapping, TcpTransport } from '../actions/action-registry';

export interface TcpCommandPayload {
  readonly body?: unknown;
  readonly query?: Record<string, string>;
  readonly params?: Record<string, string>;
  readonly user?: {
    readonly sub: string;
    readonly email: string;
    readonly role: string;
  };
  readonly requestId: string;
}

const SERVICE_CLIENT_MAP: Record<string, string> = {
  auth: USUARIO_CLIENT,
  users: USUARIO_CLIENT,
  vendedores: USUARIO_CLIENT,
  clientes: USUARIO_CLIENT,
  'super-admin': USUARIO_CLIENT,
  qr: USUARIO_CLIENT,
  'link-invitacion': USUARIO_CLIENT,
};

@Injectable()
export class TcpDispatcherService {
  private readonly logger = new Logger(TcpDispatcherService.name);
  private readonly tcpTimeoutMs: number;

  constructor(
    @Inject(USUARIO_CLIENT) private readonly usuarioClient: ClientProxy,
    configService: ConfigService,
  ) {
    this.tcpTimeoutMs = configService.get<number>('TCP_TIMEOUT_MS', 5000);
  }

  /**
   * Get the ClientProxy for a given service family.
   */
  private getClient(service: string): ClientProxy {
    const clientName = SERVICE_CLIENT_MAP[service];
    if (!clientName) {
      throw new Error(`No TCP client configured for service family "${service}"`);
    }

    // Only usuario-service is available; others throw
    if (clientName !== USUARIO_CLIENT) {
      throw new Error(`TCP client "${clientName}" is not yet available`);
    }

    return this.usuarioClient;
  }

  /**
   * Dispatch a TCP command and return the response.
   *
   * - Uses request/response via `send()` for `'send'` transport
   * - Uses fire-and-forget via `emit()` for `'publish'` transport
   * - Applies timeout and bounded retry (1 retry on failure)
   */
  async dispatch(
    service: string,
    payload: TcpCommandPayload,
    mapping: ActionMapping,
  ): Promise<unknown> {
    const client = this.getClient(service);

    if (mapping.transport === 'publish') {
      client.emit<unknown>(mapping.tcpPattern, payload);
      return { queued: true, pattern: mapping.tcpPattern };
    }

    return this.sendWithRetry(client, mapping.tcpPattern, payload, mapping.transport);
  }

  private async sendWithRetry(
    client: ClientProxy,
    pattern: string,
    payload: TcpCommandPayload,
    transport: TcpTransport,
  ): Promise<unknown> {
    const maxAttempts = 2;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result$ = client.send<unknown>(pattern, payload).pipe(
          timeout(this.tcpTimeoutMs),
          catchError((err: unknown) => {
            const rpcError = err instanceof RpcException ? err.getError() : err;
            return throwError(() => rpcError);
          }),
        );

        return await firstValueFrom(result$);
      } catch (error: unknown) {
        const isLastAttempt = attempt === maxAttempts;

        if (isLastAttempt) {
          this.logger.warn(
            `TCP dispatch failed after ${maxAttempts} attempts for pattern "${pattern}": ${String(error)}`,
          );

          if (error instanceof GatewayTimeoutException) {
            throw error;
          }

          throw new GatewayTimeoutException(
            `Service did not respond in time for action "${pattern}". Please try again.`,
          );
        }

        this.logger.warn(
          `TCP dispatch attempt ${attempt} failed for pattern "${pattern}", retrying...`,
        );
      }
    }

    // Should never reach here
    throw new Error(`Unexpected: dispatch exited loop for pattern "${pattern}"`);
  }
}
