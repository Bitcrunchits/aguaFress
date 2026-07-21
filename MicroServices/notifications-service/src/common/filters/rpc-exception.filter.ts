import { Catch, ExceptionFilter, HttpException, HttpStatus, Logger, type ArgumentsHost } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Observable, throwError } from 'rxjs';

interface RpcErrorPayload {
  readonly statusCode: number;
  readonly message: unknown;
  readonly error?: unknown;
  readonly timestamp: string;
  readonly path: string;
}

interface RpcContextWithPattern {
  getPattern(): unknown;
}

@Catch()
export class RpcExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(RpcExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): Observable<never> {
    if (exception instanceof HttpException) {
      const errorPayload = this.extractHttpErrorPayload(exception, host);
      if (exception.getStatus() >= HttpStatus.INTERNAL_SERVER_ERROR) {
        this.logger.error(`RPC — ${String(errorPayload.message)}`, exception.stack);
      } else {
        this.logger.warn(`RPC — ${String(errorPayload.message)}`);
      }

      return throwError(() => new RpcException(errorPayload));
    }

    if (exception instanceof RpcException) {
      return throwError(() => exception);
    }

    this.logger.error(
      `RPC — Unhandled: ${exception instanceof Error ? exception.message : 'Unknown error'}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    return throwError(() => new RpcException({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      timestamp: new Date().toISOString(),
      path: this.extractRpcPath(host),
    }));
  }

  private extractHttpErrorPayload(exception: HttpException, host: ArgumentsHost): RpcErrorPayload {
    const response = exception.getResponse();
    const basePayload = this.extractBasePayload(exception, response);

    return { ...basePayload, timestamp: new Date().toISOString(), path: this.extractRpcPath(host) };
  }

  private extractBasePayload(exception: HttpException, response: string | object): Omit<RpcErrorPayload, 'timestamp' | 'path'> {
    if (typeof response === 'string') return { statusCode: exception.getStatus(), message: response };
    if (this.isRecord(response)) return { statusCode: exception.getStatus(), message: response.message ?? exception.message, error: response.error };
    return { statusCode: exception.getStatus(), message: exception.message };
  }

  private extractRpcPath(host: ArgumentsHost): string {
    const context = host.switchToRpc().getContext<unknown>();
    if (this.hasPatternReader(context)) {
      const pattern = context.getPattern();
      if (typeof pattern === 'string' && pattern.trim() !== '') return pattern;
    }

    return 'rpc';
  }

  private hasPatternReader(value: unknown): value is RpcContextWithPattern {
    return typeof value === 'object' && value !== null && 'getPattern' in value && typeof value.getPattern === 'function';
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
