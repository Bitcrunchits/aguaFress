import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Interceptor global que loguea cada request HTTP:
 * método, path, userId (si autenticado) y duración.
 *
 * Uso:
 *   - 2xx → Logger.log (verde implícito)
 *   - 4xx → Logger.warn
 *   - 5xx → Logger.error
 *
 * Registrado como APP_INTERCEPTOR en CommonModule.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const path = request.url;
    const userId = request.user?.id ?? 'anonymous';
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const statusCode = response.statusCode;
          const duration = Date.now() - now;

          if (statusCode >= 500) {
            this.logger.error(`${method} ${path} ${statusCode} ${duration}ms — user:${userId}`);
          } else if (statusCode >= 400) {
            this.logger.warn(`${method} ${path} ${statusCode} ${duration}ms — user:${userId}`);
          } else {
            this.logger.log(`${method} ${path} ${statusCode} ${duration}ms — user:${userId}`);
          }
        },
        error: (error) => {
          const duration = Date.now() - now;
          this.logger.error(
            `${method} ${path} ${error.status ?? 500} ${duration}ms — user:${userId}: ${error.message}`,
            error.stack,
          );
        },
      }),
    );
  }
}
