import { Injectable, Inject, GatewayTimeoutException, HttpException, Logger } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { catchError, firstValueFrom, throwError, timeout, TimeoutError, type Observable } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { ENTREGAS_CLIENT, NOTIFICATIONS_CLIENT, ORDERS_CLIENT, PRODUCTS_CLIENT, USUARIO_CLIENT } from './tcp-clients.module';
import type { ActionMapping } from '../actions/action-registry';

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
  orders: ORDERS_CLIENT,
  cart: ORDERS_CLIENT,
  deliveries: ENTREGAS_CLIENT,
  'activity-logs': NOTIFICATIONS_CLIENT,
  products: PRODUCTS_CLIENT,
  categories: PRODUCTS_CLIENT,
  brands: PRODUCTS_CLIENT,
};

@Injectable()
export class TcpDispatcherService {
  private readonly logger = new Logger(TcpDispatcherService.name);
  private readonly tcpTimeoutMs: number;

  constructor(
    @Inject(USUARIO_CLIENT) private readonly usuarioClient: ClientProxy,
    @Inject(ORDERS_CLIENT) private readonly ordersClient: ClientProxy,
    @Inject(NOTIFICATIONS_CLIENT) private readonly notificationsClient: ClientProxy,
    @Inject(ENTREGAS_CLIENT) private readonly entregasClient: ClientProxy,
    @Inject(PRODUCTS_CLIENT) private readonly productsClient: ClientProxy,
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

    if (clientName === USUARIO_CLIENT) {
      return this.usuarioClient;
    }

    if (clientName === ORDERS_CLIENT) {
      return this.ordersClient;
    }

    if (clientName === NOTIFICATIONS_CLIENT) {
      return this.notificationsClient;
    }

    if (clientName === ENTREGAS_CLIENT) {
      return this.entregasClient;
    }

    if (clientName === PRODUCTS_CLIENT) {
      return this.productsClient;
    }

    throw new Error(`TCP client "${clientName}" is not configured`);
  }

  /**
   * Dispatch a TCP command and return the response.
   *
   * - Uses request/response via `send()` for `'send'` transport
   * - Uses fire-and-forget via `emit()` for `'publish'` transport
   * - Applies timeout and bounded retry when the action allows it
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

    return this.sendWithRetry(client, mapping.tcpPattern, payload, mapping.retryOnTimeout !== false);
  }

  private async sendWithRetry(
    client: ClientProxy,
    pattern: string,
    payload: TcpCommandPayload,
    retryOnTimeout: boolean,
  ): Promise<unknown> {
    const maxAttempts = retryOnTimeout ? 2 : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result$ = client.send<unknown>(pattern, payload).pipe(
          timeout(this.tcpTimeoutMs),
          catchError((err: unknown) => {
            // Normalize RpcException to its payload; pass everything else as-is
            const normalized = err instanceof RpcException ? err.getError() : err;
            return throwError(() => normalized);
          }),
        );

        return await firstValueFrom(result$);
      } catch (error: unknown) {
        const isTimeout = error instanceof TimeoutError;
        const isLastAttempt = attempt === maxAttempts;

        if (isLastAttempt) {
          if (isTimeout) {
            this.logger.warn(
              `TCP dispatch timed out after ${maxAttempts} attempts for pattern "${pattern}"`,
            );
            throw new GatewayTimeoutException(
              `Service did not respond in time for action "${pattern}". Please try again.`,
            );
          }

          // Business logic / validation errors from the microservice arrive over TCP
          // as plain payloads, so restore their HTTP status before Nest handles them.
          throw normalizeTcpError(error);
        }

        // Only retry on timeouts
        if (!isTimeout) {
          throw normalizeTcpError(error);
        }

        this.logger.warn(
          `TCP dispatch attempt ${attempt} timed out for pattern "${pattern}", retrying...`,
        );
      }
    }

    // Should never reach here
    throw new Error(`Unexpected: dispatch exited loop for pattern "${pattern}"`);
  }
}

interface TcpErrorPayload {
  readonly statusCode: number;
  readonly message?: unknown;
  readonly error?: unknown;
}

function normalizeTcpError(error: unknown): unknown {
  if (error instanceof HttpException) {
    return error;
  }

  const tcpErrorPayload = extractTcpErrorPayload(error);
  if (tcpErrorPayload) {
    return new HttpException(tcpErrorPayload, tcpErrorPayload.statusCode);
  }

  return error;
}

function extractTcpErrorPayload(error: unknown): TcpErrorPayload | undefined {
  if (isTcpErrorPayload(error)) {
    return error;
  }

  if (typeof error !== 'object' || error === null || !('error' in error)) {
    return undefined;
  }

  const nestedError = (error as { readonly error?: unknown }).error;
  return isTcpErrorPayload(nestedError) ? nestedError : undefined;
}

function isTcpErrorPayload(error: unknown): error is TcpErrorPayload {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const statusCode = (error as { readonly statusCode?: unknown }).statusCode;
  return typeof statusCode === 'number' && statusCode >= 400 && statusCode < 600;
}
