import { SetMetadata } from '@nestjs/common';
import { AuditAction } from '@agua/contracts';

export const AUDIT_LOG_KEY = 'audit-log:action';

export function AuditLog(action: AuditAction): MethodDecorator {
  return (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    if (typeof descriptor.value !== 'function') {
      throw new Error(
        `@AuditLog decorator can only be applied to methods, not to ${typeof descriptor.value}`,
      );
    }
    SetMetadata(AUDIT_LOG_KEY, action)(target, propertyKey, descriptor);
  };
}
