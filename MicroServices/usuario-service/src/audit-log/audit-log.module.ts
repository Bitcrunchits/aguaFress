import { Global, Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { AuditLogService } from './audit-log.service';
import { AuditLogAdminController } from './audit-log-admin.controller';
import { AuditLogInterceptor } from './interceptors/audit-log.interceptor';

@Global()
@Module({
  imports: [CommonModule],
  controllers: [AuditLogAdminController],
  providers: [AuditLogService, AuditLogInterceptor],
  exports: [AuditLogService],
})
export class AuditLogModule {}
