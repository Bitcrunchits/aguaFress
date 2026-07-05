import {
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { RpcException } from '@nestjs/microservices';
import { Observable, throwError } from 'rxjs';

/**
 * Filtro global que captura TODAS las excepciones y maneja
 * correctamente tanto contexto HTTP como RPC (TCP).
 *
 * HTTP: usa HttpAdapterHost para ser platform-agnostic.
 *       Devuelve JSON con statusCode, message, path y timestamp.
 *
 * RPC: devuelve Observable con RpcException que preserva
 *      el mensaje original (el handler nativo lo aplasta
 *      a "Internal server error").
 *
 * Logging:
 *   - 4xx (client error) → Logger.warn
 *   - 5xx (server error) → Logger.error con stack trace
 *   - RPC                → Logger.error (NestJS traga el error del otro lado)
 *
 * Uso en main.ts:
 *   app.useGlobalFilters(new RpcExceptionFilter(app.get(HttpAdapterHost)));
 */
@Catch()
export class RpcExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(RpcExceptionFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): Observable<any> | void {
    const type = host.getType();

    if (type === 'rpc') {
      return this.handleRpcError(exception);
    }

    this.handleHttpError(exception, host);
  }

  // ── RPC ───────────────────────────────────────────────────
  // Planned for Kafka microservice integration
  private handleRpcError(exception: unknown): Observable<never> {
    // RPC: NestJS traga el error del lado del consumidor.
    // Logueamos antes de responder para no perder el rastro.
    if (exception instanceof HttpException) {
      const errorPayload = this.extractErrorPayload(exception);
      const logMsg = this.serializeForLog(errorPayload);

      if (exception.getStatus() >= 500) {
        this.logger.error(`RPC — ${logMsg}`, exception.stack);
      } else {
        this.logger.warn(`RPC — ${logMsg}`);
      }

      return throwError(() => new RpcException(errorPayload));
    }

    if (exception instanceof RpcException) {
      this.logger.warn(
        `RPC — RpcException: ${JSON.stringify(exception.getError())}`,
      );
      return throwError(() => exception);
    }

    this.logger.error(
      `RPC — Unhandled: ${exception instanceof Error ? exception.message : 'Unknown error'}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    return throwError(
      () =>
        new RpcException({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
        }),
    );
  }

  // ── HTTP ──────────────────────────────────────────────────
  private handleHttpError(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const path = httpAdapter.getRequestUrl(ctx.getRequest());

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const responseBody =
      exception instanceof HttpException
        ? {
            ...this.extractErrorPayload(exception),
            path,
            timestamp: new Date().toISOString(),
          }
        : {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Internal server error',
            path,
            timestamp: new Date().toISOString(),
          };

    // ── Logging ─────────────────────────────────────────────
    const logMsg = this.serializeForLog(responseBody);

    if (status >= 500) {
      this.logger.error(
        `HTTP ${status} — ${path}: ${logMsg}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(`HTTP ${status} — ${path}: ${logMsg}`);
    }

    // ── Response ────────────────────────────────────────────
    httpAdapter.reply(ctx.getResponse(), responseBody, status);
  }

  // ── Helpers ───────────────────────────────────────────────

  /** Extrae el body de la excepción preservando la estructura original. */
  private extractErrorPayload(exception: HttpException): Record<string, unknown> {
    const response = exception.getResponse();

    if (typeof response === 'string') {
      return { message: response, statusCode: exception.getStatus() };
    }

    if (typeof response === 'object' && response !== null) {
      return { statusCode: exception.getStatus(), ...response };
    }

    return { message: exception.message, statusCode: exception.getStatus() };
  }

  /** Convierte el body a un string plano para logging (maneja arrays de validación). */
  private serializeForLog(body: Record<string, unknown>): string {
    const msg = body.message;

    if (Array.isArray(msg)) {
      return msg.join('; ');
    }

    if (typeof msg === 'string') {
      return msg;
    }

    return JSON.stringify(body);
  }
}
