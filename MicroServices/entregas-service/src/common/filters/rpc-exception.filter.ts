import {
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Observable, throwError } from 'rxjs';

@Catch()
export class RpcExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(RpcExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): Observable<never> | void {
    const type = host.getType();

    if (type === 'rpc') {
      return this.handleRpcError(exception);
    }
  }

  private handleRpcError(exception: unknown): Observable<never> {
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
      `RPC — Error no manejado: ${exception instanceof Error ? exception.message : 'Error desconocido'}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    return throwError(
      () => new RpcException({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error interno del servidor',
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

    if (Array.isArray(msg)) return msg.join('; ');
    if (typeof msg === 'string') return msg;

    return JSON.stringify(body);
  }
}