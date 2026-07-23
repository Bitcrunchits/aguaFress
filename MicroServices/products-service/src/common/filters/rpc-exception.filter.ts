import { Catch, HttpException, HttpStatus, Logger, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Observable, throwError } from 'rxjs';

/**
 * ⚠️ INFERIDO, NO CONFIRMADO: no tuvimos acceso al rpc-exception.filter.ts
 * actualizado de usuario-service. Sabemos por el nuevo main.ts que ahora se
 * instancia como `new RpcExceptionFilter()` (sin HttpAdapterHost), lo que
 * indica que el equipo ya sacó el manejo de contexto HTTP ya que
 * usuario-service (y ahora products-service) son TCP-only.
 *
 * Esta versión solo maneja el contexto 'rpc'. Reemplazar por el archivo
 * real del equipo en cuanto lo compartan.
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
