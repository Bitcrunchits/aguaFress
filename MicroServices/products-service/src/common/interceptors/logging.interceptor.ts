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
 * NOTA: no se tuvo acceso al logging.interceptor.ts original de usuario-service.
 * Esta es una implementación estándar de bajo riesgo (loguea método + ruta o
 * patrón TCP + duración). Reemplazar por el original del equipo si difiere.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const contextType = typeof context.getType === 'function' ? context.getType() : 'http';
    const start = Date.now();

    if (contextType === 'rpc') {
      const pattern = context.getHandler().name;
      return next.handle().pipe(
        tap({
          next: () => this.logger.log(`TCP ${pattern} — ${Date.now() - start}ms`),
          error: () => this.logger.warn(`TCP ${pattern} — error — ${Date.now() - start}ms`),
        }),
      );
    }

    const request = context.switchToHttp().getRequest();
    const { method, url } = request;

    return next.handle().pipe(
      tap({
        next: () => this.logger.log(`${method} ${url} — ${Date.now() - start}ms`),
        error: () => this.logger.warn(`${method} ${url} — error — ${Date.now() - start}ms`),
      }),
    );
  }
}
