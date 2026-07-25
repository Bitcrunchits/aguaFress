import {
  Catch,
  type ExceptionFilter,
  type ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Observable, throwError } from 'rxjs';

/**
 * Filtro global RPC (TCP).
 *
 * Captura TODAS las excepciones en contexto RPC y las convierte
 * a RpcException preservando el mensaje original.
 *
 * Logging:
 *   - 4xx (client error) → Logger.warn
 *   - 5xx (server error) → Logger.error con stack trace
 *
 * Uso en main.ts:
 *   app.useGlobalFilters(new RpcExceptionFilter());
 */
@Catch()
export class RpcExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(RpcExceptionFilter.name);

  catch(exception: unknown, _host: ArgumentsHost): Observable<never> {
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
      this.logger.warn(`RPC — RpcException: ${JSON.stringify(exception.getError())}`);
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
