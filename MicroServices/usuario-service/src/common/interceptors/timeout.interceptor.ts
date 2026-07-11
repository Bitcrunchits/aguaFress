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
 * Interceptor global que corta requests que excedan los 10 segundos.
 *
 * Lanza RequestTimeoutException (408) que el RpcExceptionFilter
 * captura y devuelve como JSON estandarizado.
 *
 * Registrado como APP_INTERCEPTOR en CommonModule.
 */
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  private readonly TIMEOUT_MS = 10_000;

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      timeout(this.TIMEOUT_MS),
      catchError((err) => {
        if (err instanceof TimeoutError) {
          return throwError(() => new RequestTimeoutException('Request exceeded 10s timeout'));
        }
        return throwError(() => err);
      }),
    );
  }
}
