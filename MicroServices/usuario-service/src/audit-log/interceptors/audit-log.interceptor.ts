import {
  Injectable,
  Logger,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { AuditAction } from '@agua/contracts';
import { AUDIT_LOG_KEY } from '../decorators/audit-log.decorator';
import { AuditLogService } from '../audit-log.service';
import { extractIp } from '../utils/ip-extractor';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const action = this.reflector.getAllAndOverride<AuditAction>(AUDIT_LOG_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @AuditLog decorator — skip
    if (!action) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;
    const targetId = request.params?.id;
    const ip = extractIp(request);

    return next.handle().pipe(
      tap({
        next: () => {
          if (!userId) return; // gracefully skip if no user context

          this.auditLogService
            .record(action, userId, {
              targetId,
              ip: ip ?? undefined,
            })
            .catch((err: Error) => {
              Logger.error(`Audit log failed for ${action}: ${err.message}`, undefined, 'AuditLogInterceptor');
            });
        },
        error: () => {
          // Do NOT log on exception — spec R2
        },
      }),
    );
  }
}
