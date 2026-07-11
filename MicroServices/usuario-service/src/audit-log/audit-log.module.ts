import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CommonModule } from '../common/common.module';
import { AuditLogService } from './audit-log.service';
import { AuditLogInterceptor } from './interceptors/audit-log.interceptor';

@Global()
@Module({
  imports: [CommonModule],
  controllers: [],
  providers: [
    AuditLogService,
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
  ],
  exports: [AuditLogService],
})
export class AuditLogModule {}
