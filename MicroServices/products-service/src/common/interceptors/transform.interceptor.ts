import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface TransformResult {
  readonly data?: unknown;
  readonly timestamp?: string;
  readonly path?: string;
  readonly [key: string]: unknown;
}

/**
 * Interceptor global que envuelve TODAS las respuestas HTTP exitosas
 * en un objeto estandarizado: { data, timestamp, path }.
 *
 * NO transforma respuestas que ya sean:
 *   - Streams (archivos, PDFs)
 *   - null / undefined (vacíos)
 *   - Objetos paginados (contienen `data` + `pagination` → evita doble wrap)
 *
 * Registrado como APP_INTERCEPTOR en CommonModule.
 */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<TransformResult> {
    const contextType = typeof context.getType === 'function' ? context.getType() : 'http';

    if (contextType !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();

    return next.handle().pipe(
      map((data: unknown): TransformResult => {
        if (data === null || data === undefined) return data as unknown as TransformResult;

        if (typeof data === 'object' && 'data' in data && 'timestamp' in data) {
          return data as TransformResult;
        }

        if (typeof data === 'object' && 'data' in data && 'pagination' in data) {
          return data as TransformResult;
        }

        return {
          data,
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }),
    );
  }
}
