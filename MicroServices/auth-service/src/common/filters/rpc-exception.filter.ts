import {
  Catch,
  HttpException,
  HttpStatus,
  type ArgumentsHost,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Observable, throwError } from 'rxjs';

/**
 * Filtro global que captura TODAS las excepciones y maneja
 * correctamente tanto contexto HTTP como RPC (TCP).
 *
 * HTTP: devuelve JSON con statusCode, message, timestamp.
 * RPC:  devuelve Observable con RpcException que preserva
 *       el mensaje original (el handler nativo lo aplasta
 *       a "Internal server error").
 */
@Catch()
export class RpcExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): Observable<any> | void {
    const type = host.getType();

    if (type === 'rpc') {
      return this.handleRpcError(exception);
    }

    this.handleHttpError(exception, host);
  }

  // ── RPC ───────────────────────────────────────────────────
  private handleRpcError(exception: unknown): Observable<never> {
    if (exception instanceof HttpException) {
      return throwError(
        () =>
          new RpcException({
            statusCode: exception.getStatus(),
            message: exception.message,
          }),
      );
    }

    if (exception instanceof RpcException) {
      return throwError(() => exception);
    }

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
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<any>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
