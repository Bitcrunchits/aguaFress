import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
} from '@nestjs/common';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

/**
 * NOTA: no se tuvo acceso al timeout.interceptor.ts original de usuario-service.
 * Implementación estándar de bajo riesgo: 10s de timeout para HTTP y TCP.
 * Ajustar el valor o reemplazar por el original del equipo si difiere.
 */
const DEFAULT_TIMEOUT_MS = 10_000;

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      timeout(DEFAULT_TIMEOUT_MS),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          return throwError(() => new RequestTimeoutException());
        }
        return throwError(() => err);
      }),
    );
  }
}
