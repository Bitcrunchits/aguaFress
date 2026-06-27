import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Interceptor global que envuelve TODAS las respuestas exitosas
 * en un objeto estandarizado: { data, timestamp, path }.
 *
 * NO transforma respuestas que ya sean:
 *   - Streams (archivos, PDFs)
 *   - null / undefined (vacíos)
 *   - Objetos con propiedad `data` (evita doble wrap)
 *
 * Registrado como APP_INTERCEPTOR en CommonModule.
 */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    return next.handle().pipe(
      map((data) => {
        // Si ya está transformado o es respuesta especial, pasar limpio
        if (data === null || data === undefined) return data;
        if (typeof data === 'object' && 'data' in data) return data;

        return {
          data,
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }),
    );
  }
}
